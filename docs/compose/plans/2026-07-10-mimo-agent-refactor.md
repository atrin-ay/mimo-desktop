# MiMo Agent Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom mode implementation (chat/plan/agent) with official MiMo agents (build/plan/compose), using `mimo run --agent <name>` as the CLI integration point.

**Architecture:** The frontend sends an agent name (`build`, `plan`, `compose`) instead of a custom mode. The backend passes this agent name to `mimo run --agent <name>`. MiMo's own permission system enforces tool access — we do not duplicate it. The transport layer is isolated behind an adapter interface so it can be replaced (CLI → SDK) without changing controllers, services, or frontend.

**Tech Stack:** TypeScript, Express, better-sqlite3, Zod (backend) — React 19, Vite, Tailwind, Motion (frontend) — MiMo CLI (`mimo run --agent <name> --format json`)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/types.ts` | Modify | Replace `InteractionMode` enum with `AgentName` type |
| `frontend/src/utils/translations.ts` | Modify | Update mode labels to agent names |
| `frontend/src/api.ts` | Modify | Send `agent` instead of `mode` in stream request |
| `frontend/src/hooks/useChat.ts` | Modify | Use agent names, remove mode-based event filtering |
| `frontend/src/components/ChatInput.tsx` | Modify | Update dropdown to use agent names |
| `frontend/src/components/HomeScreen.tsx` | Modify | Update dropdown to use agent names |
| `frontend/src/App.tsx` | Modify | Pass agent name through props |
| `backend/src/types/index.ts` | Modify | Update `ChatRequest` to use `agent` |
| `backend/src/schemas/index.ts` | Modify | Update Zod schema to validate agent names |
| `backend/src/controllers/chatController.ts` | Modify | Pass `agent` from request body |
| `backend/src/services/chatService.ts` | Modify | Pass `agent` to provider |
| `backend/src/providers/AIProvider.ts` | Modify | Update `sendMessage` signature |
| `backend/src/providers/MimoCliProvider.ts` | Rewrite | Use `--agent` flag, remove event filter, add debug logging |
| `backend/src/providers/MiMoProvider.ts` | Modify | Remove mode-based system prompts |
| `backend/src/config/env.ts` | Modify | Add `mimoDebug` config option |

---

## Global Constraints

- Backend runs on port 3001, frontend on Vite dev server
- `AI_PROVIDER=mimo-cli` in `.env`
- Valid agents: `build`, `plan`, `compose` (MiMo's official primary agents)
- Unknown agents must return an explicit error, not fallback
- No prompt prefixes — agent selection is via `--agent` CLI flag
- No custom permission enforcement — MiMo owns permissions
- Debug logging disabled by default, enabled via `MIMO_DEBUG=true` env var

---

### Task 1: Update types and schemas (backend)

**Files:**
- Modify: `backend/src/types/index.ts:63-68`
- Modify: `backend/src/schemas/index.ts:28-37`

**Interfaces:**
- Produces: `ChatRequest.agent` field, `chatSchema` validation for agent names

- [ ] **Step 1: Update ChatRequest type**

In `backend/src/types/index.ts`, replace:

```typescript
/** Request body for the chat endpoint. */
export interface ChatRequest {
  sessionId: string;
  message: string;
  mode?: 'direct' | 'plan' | 'agent';
}
```

With:

```typescript
/** Official MiMo agent names. */
export type MiMoAgent = 'build' | 'plan' | 'compose';

/** Request body for the chat endpoint. */
export interface ChatRequest {
  sessionId: string;
  message: string;
  agent?: MiMoAgent;
}
```

- [ ] **Step 2: Update Zod schema**

In `backend/src/schemas/index.ts`, replace:

```typescript
/** Schema for POST /api/chat request body. */
export const chatSchema = z.object({
  body: z.object({
    sessionId: uuidSchema,
    message: z
      .string()
      .min(1, 'Message must not be empty')
      .max(8000, 'Message must be at most 8000 characters'),
    mode: z.enum(['direct', 'plan', 'agent']).optional(),
  }),
});
```

With:

```typescript
/** Schema for POST /api/chat request body. */
export const chatSchema = z.object({
  body: z.object({
    sessionId: uuidSchema,
    message: z
      .string()
      .min(1, 'Message must not be empty')
      .max(8000, 'Message must be at most 8000 characters'),
    agent: z.enum(['build', 'plan', 'compose']).optional(),
  }),
});
```

- [ ] **Step 3: Verify backend compiles**

Run: `npx tsc --noEmit` in `backend/`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/types/index.ts backend/src/schemas/index.ts
git commit -m "refactor: replace custom mode with MiMo agent names in types and schemas"
```

---

### Task 2: Update AIProvider interface and providers

**Files:**
- Modify: `backend/src/providers/AIProvider.ts:17`
- Modify: `backend/src/providers/MiMoProvider.ts:60,15-26`
- Rewrite: `backend/src/providers/MimoCliProvider.ts`

**Interfaces:**
- Consumes: `MiMoAgent` type from Task 1
- Produces: Updated `sendMessage` signature, `sendMessageStream` with agent support

- [ ] **Step 1: Update AIProvider interface**

In `backend/src/providers/AIProvider.ts`, replace:

```typescript
import type { ProviderHealth, ProviderMessage, ProviderResult } from '../types';

/**
 * Abstraction over an AI backend.
 *
 * Implementations are responsible for turning a conversation history into an
 * assistant reply.
 */
export interface AIProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /**
   * Send the conversation history to the provider and return the assistant's
   * reply.
   */
  sendMessage(messages: ProviderMessage[], mode?: string): Promise<ProviderResult>;

  /** Check whether the provider is reachable / ready to serve requests. */
  healthCheck(): Promise<ProviderHealth>;
}
```

With:

```typescript
import type { ProviderHealth, ProviderMessage, ProviderResult, MiMoAgent } from '../types';

/**
 * Abstraction over an AI backend.
 *
 * Implementations are responsible for turning a conversation history into an
 * assistant reply.
 */
export interface AIProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /**
   * Send the conversation history to the provider and return the assistant's
   * reply.
   * @param agent - Official MiMo agent name (build, plan, compose). Provider decides how to use it.
   */
  sendMessage(messages: ProviderMessage[], agent?: MiMoAgent): Promise<ProviderResult>;

  /** Check whether the provider is reachable / ready to serve requests. */
  healthCheck(): Promise<ProviderHealth>;
}
```

- [ ] **Step 2: Update MiMoProvider**

In `backend/src/providers/MiMoProvider.ts`:

1. Remove the `getSystemPrompt` function and `SYSTEM_PROMPT` constant (lines 13-26)
2. Update `sendMessage` signature to accept `agent` instead of `mode`
3. Remove mode-based system prompt logic — use a fixed system prompt

Replace the top of the file (lines 13-26) with:

```typescript
const SYSTEM_PROMPT = `You are MiMo, a helpful and accurate AI assistant. Keep answers concise and relevant. Always return valid JSON-safe text.`;
```

Update `sendMessage` signature (line 60):

```typescript
async sendMessage(messages: ProviderMessage[], agent?: string): Promise<ProviderResult> {
```

Update the logger call (line 88):

```typescript
logger.debug({ messageCount: messages.length, agent, model: env.mimoModel }, 'MiMoProvider sending request');
```

Replace the payload construction (lines 89-106) to use fixed system prompt:

```typescript
    const payload = {
      model: env.mimoModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    } as const;
```

- [ ] **Step 3: Rewrite MimoCliProvider**

Replace the entire `backend/src/providers/MimoCliProvider.ts` with:

```typescript
import { spawn, execFileSync } from 'child_process';
import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
  MiMoAgent,
} from '../types';
import { logger } from '../config/logger';
import { env } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';

// ─── Valid agents ────────────────────────────────────────────────────────────

const VALID_AGENTS = new Set<string>(['build', 'plan', 'compose']);
const DEFAULT_AGENT: MiMoAgent = 'build';

// ─── Types ───────────────────────────────────────────────────────────────────

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

  try {
    const nvmDir = process.env.NVM_SYMLINK || path.join(process.env.APPDATA || '', 'nvm');
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir).filter(d => d.startsWith('v'));
      for (const v of versions) {
        candidates.push(path.join(nvmDir, v, 'node_modules', '@mimo-ai', 'cli', 'node_modules', '@mimo-ai', 'mimocode-windows-x64', 'bin', 'mimo.exe'));
      }
    }
  } catch {}

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

  return 'mimo';
}

// ─── CLI helpers ─────────────────────────────────────────────────────────────

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

function parseJsonOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/) || trimmed.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch {}
    }
    return null;
  }
}

function parseCliOutput(stdout: string): any[] {
  const events: any[] = [];
  const lines = stdout.split('\n').filter(l => l.trim());
  for (const line of lines) {
    try {
      events.push(JSON.parse(line.trim()));
    } catch {}
  }
  return events;
}

// ─── Debug logging ───────────────────────────────────────────────────────────

function debugLog(category: string, data: Record<string, unknown>) {
  if (!env.mimoDebug) return;
  logger.debug(data, `[MiMo Debug] ${category}`);
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

  async sendMessage(messages: ProviderMessage[], agent?: MiMoAgent): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MimoCliProvider requires at least one message');
    }

    const resolvedAgent = this.resolveAgent(agent);
    const prompt = this.buildPrompt(messages);
    const args = this.buildCliArgs(resolvedAgent, prompt);

    const startTime = Date.now();
    debugLog('sendMessage', { agent: resolvedAgent, messageCount: messages.length, args: [this.binary, ...args] });

    const { stdout, stderr, code } = await execCli(this.binary, args);

    const events = parseCliOutput(stdout);
    const lastTextEvent = events.filter((e: any) => e.type === 'text').pop();
    const content = lastTextEvent?.part?.text || '';
    const duration = Date.now() - startTime;

    debugLog('response', { agent: resolvedAgent, eventsCount: events.length, contentLength: content.length, duration, exitCode: code });

    if (content) {
      return {
        content,
        metadata: {
          provider: this.name,
          agent: resolvedAgent,
          eventsCount: events.length,
          duration,
        },
      };
    }

    const detail = stderr || stdout || `Process exited with code ${code}`;
    throw new Error(`MiMo CLI failed: ${detail.slice(0, 500)}`);
  }

  async sendMessageStream(
    messages: ProviderMessage[],
    agent: MiMoAgent | undefined,
    onEvent: (event: any) => void,
  ): Promise<void> {
    if (messages.length === 0) {
      throw new Error('MimoCliProvider requires at least one message');
    }

    const resolvedAgent = this.resolveAgent(agent);
    const prompt = this.buildPrompt(messages);
    const args = this.buildCliArgs(resolvedAgent, prompt);

    const startTime = Date.now();
    debugLog('sendMessageStream', { agent: resolvedAgent, messageCount: messages.length, fullCommand: [this.binary, ...args].join(' ') });

    // Emit agent status so frontend knows what's active
    onEvent({
      type: 'status',
      agent: resolvedAgent,
      timestamp: Date.now(),
    });

    return new Promise((resolve, reject) => {
      const proc = spawn(this.binary, args, {
        cwd: cliCwd(),
        shell: false,
        env: cliEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdoutBuffer = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString('utf-8');

        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            debugLog('raw_event', { type: event.type, tool: event.part?.tool });
            onEvent(event);
          } catch {
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
        if (stdoutBuffer.trim()) {
          try {
            onEvent(JSON.parse(stdoutBuffer.trim()));
          } catch {
            onEvent({ type: 'raw', text: stdoutBuffer.trim(), timestamp: Date.now() });
          }
        }

        const duration = Date.now() - startTime;
        debugLog('stream_complete', { agent: resolvedAgent, duration, exitCode: code });

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

  // ── Session management ───────────────────────────────────────────────────

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

  async getVersion(): Promise<string> {
    const { stdout } = await execCli(this.binary, ['--version']);
    return stdout.trim();
  }

  async getConfig(): Promise<CliConfig> {
    const { stdout } = await execCli(this.binary, ['config', '--json']);
    const parsed = parseJsonOutput(stdout);
    return (parsed as CliConfig) || {};
  }

  async runCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return execCli(this.binary, args);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private resolveAgent(agent?: string): MiMoAgent {
    if (agent && VALID_AGENTS.has(agent)) {
      return agent as MiMoAgent;
    }
    if (agent && !VALID_AGENTS.has(agent)) {
      throw new Error(`Unknown MiMo agent: "${agent}". Valid agents: ${[...VALID_AGENTS].join(', ')}`);
    }
    return DEFAULT_AGENT;
  }

  private buildCliArgs(agent: MiMoAgent, message: string): string[] {
    return ['run', '--format', 'json', '--agent', agent, message];
  }

  private buildPrompt(messages: ProviderMessage[]): string {
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
}
```

- [ ] **Step 4: Add mimoDebug to env config**

In `backend/src/config/env.ts`, add to `EnvConfig` interface:

```typescript
mimoDebug: boolean;
```

Add to `loadEnv()`:

```typescript
const mimoDebug = process.env.MIMO_DEBUG === 'true';
```

Add to return object:

```typescript
mimoDebug,
```

- [ ] **Step 5: Verify backend compiles**

Run: `npx tsc --noEmit` in `backend/`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/providers/AIProvider.ts backend/src/providers/MiMoProvider.ts backend/src/providers/MimoCliProvider.ts backend/src/config/env.ts
git commit -m "refactor: replace custom mode with MiMo agent CLI flags"
```

---

### Task 3: Update backend controllers and services

**Files:**
- Modify: `backend/src/controllers/chatController.ts:18-21,38-39`
- Modify: `backend/src/services/chatService.ts:25,55`

**Interfaces:**
- Consumes: `MiMoAgent` type, updated `ChatRequest`
- Produces: Updated function signatures passing agent to provider

- [ ] **Step 1: Update chatController**

In `backend/src/controllers/chatController.ts`, update `sendMessage` (lines 18-21):

```typescript
    const sessionId = req.body.sessionId as string;
    const message = req.body.message as string;
    const agent = req.body.agent as string | undefined;

    const result = await chatService.sendMessage(sessionId, message, agent);
```

Update `streamMessage` (lines 38-39):

```typescript
    const sessionId = req.body.sessionId as string;
    const userContent = req.body.message as string;
    const agent = req.body.agent as string | undefined;

    logger.info({ sessionId, agent, messageLength: userContent.length }, 'Chat stream request received');
```

Update the streaming provider call (line 88):

```typescript
        await provider.sendMessageStream(requestHistory, agent, (event: any) => {
```

Update the non-streaming fallback (line 124):

```typescript
        const result = await provider.sendMessage(requestHistory, agent);
```

- [ ] **Step 2: Update chatService**

In `backend/src/services/chatService.ts`, update `sendMessage` signature (line 25):

```typescript
  async sendMessage(sessionId: string, userContent: string, agent?: string): Promise<ChatResponse> {
```

Update the provider call (line 55):

```typescript
      result = await provider.sendMessage(requestHistory, agent);
```

- [ ] **Step 3: Verify backend compiles**

Run: `npx tsc --noEmit` in `backend/`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/chatController.ts backend/src/services/chatService.ts
git commit -m "refactor: pass agent name through controller and service layers"
```

---

### Task 4: Update frontend types and API

**Files:**
- Modify: `frontend/src/types.ts:14-18`
- Modify: `frontend/src/api.ts` (streamChat function)

**Interfaces:**
- Produces: `AgentName` type, updated API request body

- [ ] **Step 1: Replace InteractionMode with AgentName**

In `frontend/src/types.ts`, replace:

```typescript
export enum InteractionMode {
  Direct = "direct",
  Plan = "plan",
  Agent = "agent"
}
```

With:

```typescript
/** Official MiMo agent names — maps directly to `mimo run --agent <name>` */
export type AgentName = 'build' | 'plan' | 'compose';
```

- [ ] **Step 2: Update streamChat to send agent**

In `frontend/src/api.ts`, update the `streamChat` function signature and body:

```typescript
export async function* streamChat(
  sessionId: string,
  message: string,
  agent?: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, agent }),
    signal,
  });
```

Also update `sendMessage` (line 75):

```typescript
export async function sendMessage(
  sessionId: string,
  message: string,
  agent?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, agent }),
  });
```

- [ ] **Step 3: Verify frontend compiles**

Run: `npx tsc --noEmit` in `frontend/`
Expected: No errors (some errors expected until useChat is updated in Task 5)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts
git commit -m "refactor: replace InteractionMode with AgentName type and update API"
```

---

### Task 5: Update frontend useChat hook

**Files:**
- Modify: `frontend/src/hooks/useChat.ts`

**Interfaces:**
- Consumes: `AgentName` type, updated API
- Produces: Updated hook interface with `agent` instead of `interactionMode`

- [ ] **Step 1: Update imports and state**

In `frontend/src/hooks/useChat.ts`:

1. Replace `InteractionMode` import with `AgentName`:

```typescript
import {
  OrbState,
  AgentName,
  Subject,
  Message,
  ActivityEntry,
  Artifact,
} from "../types";
```

2. Replace the state declaration (around line 103):

```typescript
const [agent, setAgent] = useState<AgentName>('build');
```

3. Update the `UseChatReturn` interface to replace `interactionMode`/`setInteractionMode` with `agent`/`setAgent`.

- [ ] **Step 2: Update streamChat call**

Find the `streamChat` call (around line 380) and replace `interactionMode` with `agent`:

```typescript
          for await (const event of streamChat(currentSessionId, cmd, agent, abortRef.current?.signal)) {
```

- [ ] **Step 3: Update sendMessage fallback**

Find the `sendMessage` fallback (around line 643) and replace `interactionMode` with `agent`:

```typescript
              const response = await sendMessage(
                currentSessionId,
                cmd,
                agent
              );
```

- [ ] **Step 4: Remove mode-based event filtering**

The `status` event handler should now use `event.agent` instead of `event.mode`:

```typescript
              case "status": {
                const statusAgent = event.agent || "build";
                if (statusAgent === "build") {
                  setOrbState(OrbState.Executing);
                } else if (statusAgent === "plan") {
                  setOrbState(OrbState.Thinking);
                } else if (statusAgent === "compose") {
                  setOrbState(OrbState.Thinking);
                } else {
                  setOrbState(OrbState.Streaming);
                }
                break;
              }
```

Remove the `permission_denied` event handler (it's no longer needed — MiMo handles permissions).

- [ ] **Step 5: Update the return object**

Replace `interactionMode`/`setInteractionMode` with `agent`/`setAgent` in the return statement.

- [ ] **Step 6: Verify frontend compiles**

Run: `npx tsc --noEmit` in `frontend/`
Expected: No errors (some errors expected until components are updated in Task 6)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useChat.ts
git commit -m "refactor: use AgentName in useChat hook, remove mode-based filtering"
```

---

### Task 6: Update frontend components

**Files:**
- Modify: `frontend/src/components/ChatInput.tsx`
- Modify: `frontend/src/components/HomeScreen.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `AgentName` type, updated useChat return

- [ ] **Step 1: Update ChatInput**

In `frontend/src/components/ChatInput.tsx`:

1. Replace import:

```typescript
import { OrbState, AgentName } from "../types";
```

2. Update props interface:

```typescript
interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  agent: AgentName;
  setAgent: (agent: AgentName) => void;
  onStop: () => void;
  language: "en" | "fa";
}
```

3. Replace `MODE_LABELS`:

```typescript
const AGENT_LABELS: Record<string, { en: string; fa: string }> = {
  build: { en: "Build", fa: "ساخت" },
  plan: { en: "Plan", fa: "برنامه" },
  compose: { en: "Compose", fa: "ترکیب" },
};
```

4. Update the select element to use `agent`/`setAgent` and `AGENT_LABELS`.

- [ ] **Step 2: Update HomeScreen**

In `frontend/src/components/HomeScreen.tsx`:

1. Replace import:

```typescript
import { OrbState, ActiveView, Goal, AgentName } from "../types";
```

2. Update props interface to use `agent`/`setAgent` instead of `interactionMode`/`setInteractionMode`.

3. Replace the dropdown to use `AGENT_LABELS` with the same three agents.

- [ ] **Step 3: Update App.tsx**

In `frontend/src/App.tsx`:

1. Replace all `interactionMode`/`setInteractionMode` references with `agent`/`setAgent` from `chat`.

2. The ChatView and HomeScreen props should pass `agent={chat.agent}` and `setAgent={chat.setAgent}`.

- [ ] **Step 4: Verify frontend compiles**

Run: `npx tsc --noEmit` in `frontend/`
Expected: No errors

- [ ] **Step 5: Build frontend**

Run: `npx vite build` in `frontend/`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ChatInput.tsx frontend/src/components/HomeScreen.tsx frontend/src/App.tsx
git commit -m "refactor: update UI components to use MiMo agent names"
```

---

### Task 7: Verify end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Start backend**

Run: `npm run dev` in `backend/`
Expected: Server starts on port 3001

- [ ] **Step 2: Test health endpoint**

Run: `curl http://localhost:3001/health`
Expected: `{"status":"ok"}`

- [ ] **Step 3: Test chat with default agent (build)**

Run:
```bash
curl -X POST http://localhost:3001/api/chat/stream -H "Content-Type: application/json" -d '{"sessionId":"<uuid>","message":"what is 2+2?"}'
```

Expected: SSE stream with `{"type":"status","agent":"build"}` followed by text events

- [ ] **Step 4: Test chat with plan agent**

Run:
```bash
curl -X POST http://localhost:3001/api/chat/stream -H "Content-Type: application/json" -d '{"sessionId":"<uuid>","message":"analyze the project structure","agent":"plan"}'
```

Expected: SSE stream with `{"type":"status","agent":"plan"}` followed by text events

- [ ] **Step 5: Test unknown agent rejection**

Run:
```bash
curl -X POST http://localhost:3001/api/chat -H "Content-Type: application/json" -d '{"sessionId":"<uuid>","message":"hello","agent":"nonexistent"}'
```

Expected: 400 error with validation message about invalid enum value

- [ ] **Step 6: Start frontend and verify UI**

Run: `npm run dev` in `frontend/`
Open: http://localhost:5173

Verify:
- Agent dropdown shows Build / Plan / Compose
- Default is Build
- Selecting Plan sends `agent: "plan"` in the request
- Selecting Compose sends `agent: "compose"` in the request
- Chat works in all three modes
- No console errors

- [ ] **Step 7: Enable debug mode and verify logging**

Set `MIMO_DEBUG=true` in `backend/.env`

Restart backend.

Send a message and verify debug logs appear:
- `[MiMo Debug] sendMessageStream` with agent, args
- `[MiMo Debug] raw_event` for each MiMo event
- `[MiMo Debug] stream_complete` with duration

---

## Compatibility Notes

- **Breaking change**: The `mode` field in API requests is replaced by `agent`. Any external clients using `mode` will need to update.
- **Agent names**: `build` replaces the old `direct`/`agent` modes. `plan` stays the same. `compose` is new.
- **Default agent**: `build` (equivalent to the old default behavior).
- **MiMo permissions**: Now handled entirely by MiMo. No custom event filtering.

## Future Extension Points

- **New agents**: Add to `VALID_AGENTS` set in `MimoCliProvider.ts` and update the frontend dropdown.
- **SDK transport**: Create a `MimoSdkProvider` implementing `AIProvider`, swap in `providers/index.ts`.
- **Agent discovery**: Query `mimo agent list` to dynamically populate the dropdown.
- **Agent configuration**: Read agent permissions from MiMo config to display in the UI.
