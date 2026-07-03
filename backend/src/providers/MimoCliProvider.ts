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

export class MimoCliProvider implements AIProvider {
  readonly name = 'mimo-cli';
  private binary: string;

  constructor() {
    this.binary = findMimoBinary();
    logger.info({ binary: this.binary }, 'MimoCliProvider initialized');
  }

  async sendMessage(messages: ProviderMessage[], mode?: string): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MimoCliProvider requires at least one message');
    }

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

    logger.info({ messageCount: messages.length, mode }, 'MimoCliProvider sending request');

    return new Promise((resolve, reject) => {
      const args = ['run', '--format', 'json', prompt];
      const cwd = process.env.USERPROFILE || process.env.HOME || '.';

      const proc = spawn(this.binary, args, {
        cwd,
        shell: false,
        env: {
          ...process.env,
          CHCP: '65001',
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdoutBuffer = '';
      let stderrOutput = '';
      const events: any[] = [];

      proc.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString('utf-8');
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderrOutput += data.toString('utf-8');
      });

      proc.on('close', (code) => {
        const lines = stdoutBuffer.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            events.push(JSON.parse(line.trim()));
          } catch {
            // non-JSON output, ignore
          }
        }

        const lastTextEvent = events.filter((e: any) => e.type === 'text').pop();
        const content = lastTextEvent?.part?.text || '';

        if (content) {
          logger.info({ eventsCount: events.length, contentLength: content.length }, 'MimoCliProvider response received');
          resolve({
            content,
            metadata: {
              provider: this.name,
              eventsCount: events.length,
            },
          });
        } else {
          const detail = stderrOutput || stdoutBuffer || `Process exited with code ${code}`;
          logger.error({ code, detail }, 'MimoCliProvider: no text response');
          reject(new Error(`MiMo CLI failed: ${detail.slice(0, 500)}`));
        }
      });

      proc.on('error', (err) => {
        logger.error({ error: err.message }, 'MimoCliProvider process error');
        reject(new Error(`MiMo CLI error: ${err.message}`));
      });
    });
  }

  /** Stream events from MiMo CLI in real-time via callback. */
  async sendMessageStream(
    messages: ProviderMessage[],
    mode: string | undefined,
    onEvent: (event: any) => void,
  ): Promise<void> {
    if (messages.length === 0) {
      throw new Error('MimoCliProvider requires at least one message');
    }

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

    logger.info({ messageCount: messages.length, mode }, 'MimoCliProvider streaming request');

    return new Promise((resolve, reject) => {
      const args = ['run', '--format', 'json', prompt];
      const cwd = process.env.USERPROFILE || process.env.HOME || '.';

      const proc = spawn(this.binary, args, {
        cwd,
        shell: false,
        env: {
          ...process.env,
          CHCP: '65001',
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
        },
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

  async listSessions(): Promise<Array<{ id: string; title: string; updatedAt: number }>> {
    return new Promise((resolve, reject) => {
      const args = ['session', 'list', '--format', 'json'];
      const proc = spawn(this.binary, args, {
        cwd: process.env.USERPROFILE || process.env.HOME || '.',
        shell: false,
        env: {
          ...process.env,
          CHCP: '65001',
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString('utf-8'); });
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString('utf-8'); });

      proc.on('close', () => {
        try {
          const parsed = JSON.parse(stdout.trim());
          const sessions = Array.isArray(parsed) ? parsed : [];
          resolve(sessions.map((s: any) => ({
            id: s.id,
            title: s.title || 'New Session',
            updatedAt: s.updated || s.updatedAt || Date.now(),
          })));
        } catch {
          resolve([]);
        }
      });

      proc.on('error', (err) => reject(err.message));
    });
  }

  async exportSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = ['export', sessionId];
      const proc = spawn(this.binary, args, {
        cwd: process.env.USERPROFILE || process.env.HOME || '.',
        shell: false,
        env: {
          ...process.env,
          CHCP: '65001',
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString('utf-8'); });
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString('utf-8'); });

      proc.on('close', () => {
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (err) {
          reject(new Error(`Failed to parse export: ${stderr || stdout.slice(0, 200)}`));
        }
      });

      proc.on('error', (err) => reject(err.message));
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['session', 'delete', sessionId];
      const proc = spawn(this.binary, args, {
        cwd: process.env.USERPROFILE || process.env.HOME || '.',
        shell: false,
        env: {
          ...process.env,
          CHCP: '65001',
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString('utf-8'); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to delete session: ${stderr || 'exit code ' + code}`));
        }
      });

      proc.on('error', (err) => reject(err.message));
    });
  }
}
