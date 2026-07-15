import { spawn, execFileSync } from 'child_process';
import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';
import { logger } from '../config/logger';
import * as fs from 'fs';
import * as path from 'path';

// ─── MiMo CLI response types ────────────────────────────────────────────────

export interface CliSessionInfo {
  id: string;
  title: string;
  updatedAt: number;
}

export interface CliExportedSession {
  info: {
    id: string;
    title: string;
    projectID: string;
    directory: string;
    time: { created: number; updated: number };
  };
  messages: Array<{
    info: {
      id: string;
      sessionID: string;
      role: 'user' | 'assistant' | 'system';
      agent?: string;
      model?: { providerID: string; modelID: string };
      time?: { created: number; completed?: number };
      tokens?: { total: number; input: number; output: number; reasoning: number };
      cost?: number;
      mode?: string;
      parentID?: string;
      finish?: string;
    };
    parts: Array<{
      type: string;
      id?: string;
      text?: string;
      tool?: string;
      callID?: string;
      state?: { status: string; input?: Record<string, unknown>; output?: string };
      time?: { start: number; end: number };
      tokens?: { total: number; input: number; output: number; reasoning: number };
      cost?: number;
      reason?: string;
    }>;
  }>;
}

export interface CliConfig {
  model?: string;
  provider?: string;
  apiKey?: string;
  workdir?: string;
  [key: string]: unknown;
}

// ─── Binary detection ────────────────────────────────────────────────────────

function findMimoBinary(): string {
  const candidates: string[] = [];

  // Find actual mimo.exe from npm global
  try {
    const npmGlobalDir = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@mimo-ai');
    if (fs.existsSync(npmGlobalDir)) {
      const findExe = (dir: string): string | null => {
        try {
          for (const entry of fs.readdirSync(dir)) {
            const full = path.join(dir, entry);
            if (entry === 'mimo.exe') return full;
            if (fs.statSync(full).isDirectory()) {
              const found = findExe(full);
              if (found) return found;
            }
          }
        } catch {}
        return null;
      };
      const exe = findExe(npmGlobalDir);
      if (exe) candidates.push(exe);
    }
  } catch {}

  // Check NVM paths for mimo.exe
  try {
    const nvmDir = process.env.NVM_SYMLINK || path.join(process.env.APPDATA || '', 'nvm');
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir).filter(d => d.startsWith('v'));
      for (const v of versions) {
        candidates.push(path.join(nvmDir, v, 'node_modules', '@mimo-ai', 'cli', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'));
      }
    }
  } catch {}

  // Check npm global root
  try {
    const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf-8', timeout: 5000 }).trim();
    candidates.push(path.join(npmRoot, '@mimo-ai', 'cli', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'));
  } catch {}

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        logger.info({ path: c }, 'Found MiMo CLI binary');
        return c;
      }
    } catch {}
  }

  // Fall back to 'mimo' on PATH (will use shell)
  return 'mimo';
}

// ─── Common CLI environment ──────────────────────────────────────────────────

function cliEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CHCP: '65001',
    PYTHONIOENCODING: 'utf-8',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
  };
}

function cliCwd(): string {
  return process.env.USERPROFILE || process.env.HOME || '.';
}

// ─── CLI execution helpers ───────────────────────────────────────────────────

/** Spawn a MiMo CLI command and collect stdout/stderr. Resolves with { stdout, stderr, code }. */
function execCli(
  binary: string,
  args: string[],
  opts?: { timeout?: number },
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, {
      cwd: cliCwd(),
      shell: false,
      env: cliEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString('utf-8'); });
    proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString('utf-8'); });

    const timer = opts?.timeout
      ? setTimeout(() => { proc.kill('SIGTERM'); }, opts.timeout)
      : undefined;

    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    proc.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });
}

/** Parse JSON from CLI stdout, returning null on failure. */
function parseJsonOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to find JSON in the output (MiMo sometimes prints non-JSON before JSON)
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/) || trimmed.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch {}
    }
    return null;
  }
}

// ─── Provider implementation ─────────────────────────────────────────────────

export class MimoCliProvider implements AIProvider {
  readonly name = 'mimo-cli';
  private binary: string;

  constructor() {
    this.binary = findMimoBinary();
    logger.info({ binary: this.binary }, 'MimoCliProvider initialized');
  }

  // ── AIProvider interface ─────────────────────────────────────────────────

  async sendMessage(messages: ProviderMessage[], mode?: string): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MimoCliProvider requires at least one message');
    }

    const prompt = this.buildPrompt(messages, mode);
    logger.info({ messageCount: messages.length, mode }, 'MimoCliProvider sending request');

    const { stdout, stderr, code } = await execCli(this.binary, ['run', '--format', 'json', prompt]);

    const events = this.parseCliOutput(stdout);
    const lastTextEvent = events.filter((e: any) => e.type === 'text').pop();
    const content = lastTextEvent?.part?.text || '';

    if (content) {
      logger.info({ eventsCount: events.length, contentLength: content.length }, 'MimoCliProvider response received');
      return {
        content,
        metadata: {
          provider: this.name,
          eventsCount: events.length,
        },
      };
    }

    const detail = stderr || stdout || `Process exited with code ${code}`;
    throw new Error(`MiMo CLI failed: ${detail.slice(0, 500)}`);
  }

  async sendMessageStream(
    messages: ProviderMessage[],
    mode: string | undefined,
    onEvent: (event: any) => void,
  ): Promise<void> {
    if (messages.length === 0) {
      throw new Error('MimoCliProvider requires at least one message');
    }

    const prompt = this.buildPrompt(messages, mode);
    logger.info({ messageCount: messages.length, mode }, 'MimoCliProvider streaming request');

    return new Promise((resolve, reject) => {
      const proc = spawn(this.binary, ['run', '--format', 'json', prompt], {
        cwd: cliCwd(),
        shell: false,
        env: cliEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdoutBuffer = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString('utf-8');

        // Process complete JSON lines
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            onEvent(event);
          } catch {
            // Non-JSON line, emit as raw
            onEvent({ type: 'raw', text: trimmed, timestamp: Date.now() });
          }
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8').trim();
        if (text) {
          onEvent({ type: 'stderr', text, timestamp: Date.now() });
        }
      });

      proc.on('close', (code) => {
        // Flush remaining buffer
        if (stdoutBuffer.trim()) {
          try {
            onEvent(JSON.parse(stdoutBuffer.trim()));
          } catch {
            onEvent({ type: 'raw', text: stdoutBuffer.trim(), timestamp: Date.now() });
          }
        }

        if (code !== 0 && code !== null) {
          reject(new Error(`MiMo CLI exited with code ${code}`));
        } else {
          resolve();
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`MiMo CLI error: ${err.message}`));
      });
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const result = execFileSync(this.binary, ['--version'], {
        encoding: 'utf-8',
        timeout: 5000,
        shell: true,
      });
      return {
        healthy: true,
        provider: this.name,
        details: {
          binary: this.binary,
          version: result.trim(),
        },
      };
    } catch {
      return {
        healthy: false,
        provider: this.name,
        details: {
          binary: this.binary,
          error: 'MiMo CLI not found or not working',
        },
      };
    }
  }

  // ── Session management (delegates to MiMo CLI) ──────────────────────────

  async listSessions(): Promise<CliSessionInfo[]> {
    const { stdout } = await execCli(this.binary, ['session', 'list', '--format', 'json']);
    const parsed = parseJsonOutput(stdout);
    const sessions = Array.isArray(parsed) ? parsed : [];
    return sessions.map((s: any) => ({
      id: s.id,
      title: s.title || 'New Session',
      updatedAt: s.updated || s.updatedAt || Date.now(),
    }));
  }

  async exportSession(sessionId: string): Promise<CliExportedSession> {
    const { stdout, stderr } = await execCli(this.binary, ['export', sessionId]);
    const parsed = parseJsonOutput(stdout);
    if (!parsed) {
      throw new Error(`Failed to parse export: ${stderr || stdout.slice(0, 200)}`);
    }
    return parsed as CliExportedSession;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { code, stderr } = await execCli(this.binary, ['session', 'delete', sessionId]);
    if (code !== 0) {
      throw new Error(`Failed to delete session: ${stderr || 'exit code ' + code}`);
    }
  }

  // ── MiMo CLI native capabilities ────────────────────────────────────────

  /** Get MiMo CLI version. */
  async getVersion(): Promise<string> {
    const { stdout } = await execCli(this.binary, ['--version']);
    return stdout.trim();
  }

  /** Get MiMo CLI configuration/status. */
  async getConfig(): Promise<CliConfig> {
    const { stdout } = await execCli(this.binary, ['config', '--json']);
    const parsed = parseJsonOutput(stdout);
    return (parsed as CliConfig) || {};
  }

  /** Run an arbitrary MiMo CLI command and return raw output. */
  async runCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return execCli(this.binary, args);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private buildPrompt(messages: ProviderMessage[], mode?: string): string {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) {
      throw new Error('No user message found');
    }

    let prompt = lastUserMsg.content;
    if (messages.length > 1) {
      const historyParts = messages
        .filter(m => m !== lastUserMsg)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
      prompt = historyParts.join('\n') + '\n\nUser: ' + lastUserMsg.content;
    }

    return prompt;
  }

  private parseCliOutput(stdout: string): any[] {
    const events: any[] = [];
    const lines = stdout.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        events.push(JSON.parse(line.trim()));
      } catch {
        // non-JSON output, ignore
      }
    }
    return events;
  }
}
