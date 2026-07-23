# AI Architecture Audit — MiMo Desktop

> Audit Date: 2026-07-23  
> Scope: All AI integration code — providers, prompts, context management, streaming, memory system  
> Method: File-by-file review of every AI-related source file

---

## Audit Summary

| Area | Score | Critical Issues |
|------|-------|-----------------|
| Provider Architecture | 5/10 | `AIProvider` interface too narrow; streaming/session methods accessed via `as any` |
| Prompt Engineering | 3/10 | System prompt is 1 sentence; context injection is a raw string; memory agent prompt is verbose but lacks few-shot examples |
| Context Management | 6/10 | Brain system is well-designed but context injection is fragile (string-matching `[Project Context]`) |
| Conversation History | 3/10 | Trimmed to last 40 messages with no token counting; session duplication logic is brittle |
| Streaming | 5/10 | SSE works but echo-stripping is a hack; no reconnection; no backpressure |
| Error Handling | 4/10 | Provider errors swallowed; memory agent errors silently return no-op; no retry logic |
| Memory System | 6/10 | Good architecture (observer → queue → agent → patch → suggestion) but heuristic is regex-only and memory agent has no examples |
| Model Switching | 4/10 | Model ID parsing is naive (`split('/')`); no validation; no capability detection |

---

## Issue #1: System Prompt Is a Single Generic Sentence

**File:** `backend/src/providers/MiMoProvider.ts:13`

### Current Situation
```typescript
const SYSTEM_PROMPT = `You are MiMo, a helpful and accurate AI assistant. Keep answers concise and relevant. Always return valid JSON-safe text.`;
```

This is the ONLY system prompt for the direct API provider. It is:
- 1 sentence long
- Generic (could be any assistant)
- Contains a contradictory instruction ("helpful and accurate" + "always return valid JSON-safe text")
- Does not mention the application context (it's a coding assistant desktop app)
- Does not define personality, capabilities, or boundaries

Meanwhile, `MimoCliProvider` and `MimoServeProvider` send NO system prompt at all — they delegate entirely to the MiMo binary's own system prompt.

### Why It Is Wrong
- The system prompt is the single highest-leverage input for model behavior. A generic prompt produces generic output.
- "Always return valid JSON-safe text" constrains the model to avoid markdown, code blocks, and formatting — exactly what a coding assistant needs.
- When using the direct API (MiMoProvider), the model has zero context about what MiMo is, what agents exist, or what the user expects.

### Recommended Approach
1. The system prompt should define the assistant's identity, capabilities, and behavioral rules
2. For the direct API provider, it should mirror the MiMo CLI's system prompt as closely as possible
3. The "JSON-safe text" constraint should be removed — it actively harms output quality
4. Agent-specific behavior (build/plan/compose) should be expressible in the system prompt

### Migration Plan
1. Create `prompts/system.ts` with structured system prompts per agent mode:
   - `build` system prompt: full tool access, file editing, confident execution
   - `plan` system prompt: read-only, analytical, produces structured plans
   - `compose` system prompt: orchestration, multi-agent coordination
2. Remove the "JSON-safe text" constraint
3. For MiMoProvider, inject the system prompt as the first message
4. For CLI/Serve providers, pass agent-specific system prompts via the `--system-prompt` flag (if supported) or prepend to the message

---

## Issue #2: Context Injection Uses Fragile String Matching

**Files:**
- `backend/src/providers/MimoCliProvider.ts:462-464`
- `backend/src/providers/MimoServeProvider.ts:816-818`
- `backend/src/context/ContextManager.ts:82-84`

### Current Situation
Context is injected as a synthetic `user` message:
```typescript
return {
  role: 'user',
  content: `[Project Context]\n${content}\n[/Project Context]`,
};
```

Then, in BOTH `MimoCliProvider.buildPrompt()` and `MimoServeProvider.buildPrompt()`, the code searches for this injection by string-matching:
```typescript
const contextInjection = messages.find(
  (m) => m.role === 'user' && m.content.includes('[Project Context]'),
);
```

This is a fragile convention: the injection is detected by whether the content contains the literal string `[Project Context]`.

### Why It Is Wrong
- **Fragile**: If the AI's response ever contains `[Project Context]`, the detection breaks
- **Undetectable by type system**: There is no type-level distinction between a real user message and a synthetic context injection
- **Duplicated logic**: Both providers independently re-implement the same detection logic (copy-paste)
- **Role confusion**: The context is sent as `role: 'user'` — the model sees project context as if the user typed it, which is semantically wrong
- **No structured protocol**: The `[Project Context]` / `[/Project Context]` tags are ad-hoc, not part of any standard

### Recommended Approach
Use a dedicated message role or a structured metadata field:
```typescript
interface ProviderMessage {
  role: 'user' | 'assistant' | 'system' | 'context';
  content: string;
  metadata?: { type: 'project_context'; projectId: string };
}
```

### Migration Plan
1. Add `'context'` to the `MessageRole` type in `backend/src/types/index.ts`
2. Update `ContextManager.buildInjection()` to return `role: 'context'`
3. Update `MimoCliProvider.buildPrompt()` and `MimoServeProvider.buildPrompt()` to detect `role === 'context'` instead of string matching
4. For providers that don't support a `context` role, prepend as a `system` message with a clear label

---

## Issue #3: Conversation History Trimmed by Message Count, Not Tokens

**Files:**
- `backend/src/services/chatService.ts:40-43` (trim to 40)
- `backend/src/controllers/chatController.ts:79` (trim to 40)

### Current Situation
```typescript
const trimmedHistory = trimHistory([
  ...history,
  { role: 'user', content: userContent },
], 40);
```

History is trimmed to the last 40 messages regardless of token count. A single message with 2000 tokens of code output counts the same as a 5-word "yes".

### Why It Is Wrong
- Token limits vary by model (2K, 4K, 8K, 32K, 128K). A fixed message count doesn't respect these limits.
- Code blocks, tool outputs, and error traces can be thousands of tokens in a single message
- With 40 messages of mixed content, the actual token count could range from 200 to 40,000+
- No model-specific adaptation: the same 40-message window is used regardless of which model is active

### Recommended Approach
Count tokens (or estimate via character count: ~4 chars per token) and trim to a budget:
```typescript
function trimHistoryToTokenBudget(messages: ProviderMessage[], maxTokens: number): ProviderMessage[] {
  let total = 0;
  const result: ProviderMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (total + msgTokens > maxTokens) break;
    total += msgTokens;
    result.unshift(messages[i]);
  }
  return result;
}
```

### Migration Plan
1. Create `utils/tokenEstimate.ts` with `estimateTokens(text)` (character-based approximation)
2. Add `maxTokens` to env config (default: 8000, adjustable per model)
3. Replace `trimHistory(messages, 40)` with `trimHistoryToTokenBudget(messages, env.maxTokens)`
4. Keep the current user message always included (never trimmed)

---

## Issue #4: MiMoProvider Ignores the `agent` Parameter

**File:** `backend/src/providers/MiMoProvider.ts:60`

### Current Situation
```typescript
async sendMessage(messages: ProviderMessage[], agent?: string): Promise<ProviderResult> {
  // ... agent parameter is accepted but NEVER used in the request payload
  const payload = {
    model: env.mimoModel,
    messages: [...],
    temperature: 0.7,
    max_tokens: 2048,
  };
```

The `agent` parameter is declared in the interface signature but completely ignored. The direct API provider sends the same request regardless of whether the user selected `build`, `plan`, or `compose` mode.

### Why It Is Wrong
- Users select agent modes (build/plan/compose) in the UI, but when the direct API provider is active, the selection has zero effect
- This is a silent feature failure — the UI shows a mode selector that doesn't work
- The `build` vs `plan` distinction is meaningful (full access vs read-only) but the direct API provider can't express it

### Recommended Approach
When using the direct API, agent mode should be communicated via the system prompt:
```typescript
const AGENT_SYSTEM_PROMPTS = {
  build: 'You are MiMo Build agent. You have full tool access...',
  plan: 'You are MiMo Plan agent. You are in read-only planning mode...',
  compose: 'You are MiMo Compose agent. You orchestrate multi-agent workflows...',
};
```

### Migration Plan
1. Create `prompts/agentPrompts.ts` with per-agent system prompts
2. In `MiMoProvider.sendMessage()`, prepend the agent-specific system prompt
3. Include agent mode in the `metadata` of the return value for logging

---

## Issue #5: Echo-Stripping Is a Fragile Workaround

**File:** `backend/src/controllers/chatController.ts:120-136`

### Current Situation
```typescript
// MiMo serve echoes the user prompt at the start of its response
// text (e.g. user sends "hi", response starts with "hiHi! ...").
// Strip the echoed prefix so it doesn't appear in the UI or DB.
if (event?.type === 'text' && event.part?.text) {
  let text = event.part.text;
  if (text.startsWith(userContent)) {
    text = text.slice(userContent.length).replace(/^\n+/, '');
```

The controller strips any text event that starts with the user's message content. This is a workaround for a bug in `mimo serve` where it echoes the user prompt at the start of the response.

### Why It Is Wrong
- **False positive risk**: If the assistant legitimately starts its response with the same text as the user's message (e.g., user says "Hello" and assistant starts with "Hello! Great to see you..."), the echo-stripping cuts the real response
- **One-direction only**: Only strips from `text` and `raw` events, not from `reasoning` events
- **Substring matching**: `startsWith` is too broad — it strips any text that begins with the user message, even if it's the assistant genuinely repeating context
- **Should be fixed in the provider, not the controller**: The provider (MimoServeProvider) should handle echo-stripping before returning to the controller

### Recommended Approach
Move echo-stripping into `MimoServeProvider` as a post-processing step, with more precise matching (exact prefix, not just startswith).

### Migration Plan
1. Add `stripEcho(text: string, userMessage: string): string` utility in `MimoServeProvider`
2. Apply it in `translateEvent()` for `text` events
3. Remove the stripping logic from `chatController.ts`
4. Consider: is this a `mimo serve` bug that should be reported upstream?

---

## Issue #6: Memory Agent Prompt Lacks Few-Shot Examples

**File:** `backend/src/context/agent/prompt.ts:13-89`

### Current Situation
The memory agent prompt is ~90 lines that describe:
1. The agent's role (1 paragraph)
2. The output format (JSON schema in natural language)
3. The current brain state (serialized JSON)
4. The current brain knowledge (serialized JSON)
5. Recent conversation messages
6. Field reference documentation

What it does NOT include:
- Any example of correct output
- Any example of what NOT to capture
- Guidance on confidence thresholds ("only capture if you're >80% sure")
- Instructions for handling ambiguous information

### Why It Is Wrong
- **Zero-shot JSON generation** is notoriously unreliable for structured output. The model may produce incorrect field names, wrong nesting, or malformed JSON.
- The Zod validation catches malformed JSON, but silently drops it — the memory update is simply skipped with no retry
- Without examples, the model doesn't know the expected granularity (should "we should use React" become a tech choice? a convention? both?)
- The schema reference at the end is helpful but the model has already seen the brain state by this point — priming with examples would be more effective

### Recommended Approach
Add 2-3 few-shot examples to the prompt:
1. Example: a decision exchange → correctly produces a knowledge patch
2. Example: a trivial exchange → correctly produces `{ "update": false }`
3. Anti-example: an ambiguous exchange → correctly avoids updating

### Migration Plan
1. Add a `--- EXAMPLES ---` section to `buildMemoryAgentPrompt`
2. Include 2-3 concrete input→output pairs
3. Add a "CONFIDENCE GUIDELINES" section explaining when to update vs skip
4. Test with 10-20 real exchanges to calibrate the examples

---

## Issue #7: Dual Session Management — Backend DB vs Provider Session

**Files:**
- `backend/src/providers/MimoServeProvider.ts:502-514` (creates MiMo serve session)
- `backend/src/storage/sessionRepository.ts` (creates backend SQLite session)
- `frontend/src/hooks/useChat.ts:303-306` (creates backend session)

### Current Situation
There are TWO session systems running in parallel:

1. **Backend SQLite session** (`sessions` table): Created by the frontend via `POST /api/session`. This is the canonical session ID used for message storage and the sidebar.

2. **MiMo serve session** (`this.sessionId` in MimoServeProvider): Created internally by `MimoServeProvider` when it first sends a message to `mimo serve`. This is a separate session on the MiMo server.

The backend SQLite session ID is a UUID like `a1b2c3d4-...`. The MiMo serve session ID is `ses_xxxxx`. They are NEVER correlated.

### Why It Is Wrong
- **Session drift**: If the MiMo serve process restarts, its session is lost but the backend session persists — the provider creates a new MiMo session, losing all server-side context
- **No session mapping**: There's no mapping between backend session IDs and MiMo serve session IDs, making it impossible to inspect MiMo's internal state
- **Memory system confusion**: The memory agent operates on the backend session's messages, but the MiMo server may have different conversation history
- **Singleton session**: `MimoServeProvider` uses a single `this.sessionId` — ALL backend sessions share the same MiMo serve session, which means conversations leak across sessions

### Recommended Approach
Map each backend session to its own MiMo serve session:
```typescript
private sessionMap: Map<string, string> = new Map(); // backendSessionId → mimoSessionId
```

### Migration Plan
1. Add a `sessionMap` to `MimoServeProvider`
2. When sending a message for a backend session, check if a MiMo session already exists for it
3. If not, create one and store the mapping
4. Include the backend session ID in MiMo session metadata (if the API supports it)
5. On MiMo serve restart, re-create sessions lazily on first message

---

## Issue #8: MiMoProvider Has No Streaming Support

**File:** `backend/src/providers/MiMoProvider.ts`

### Current Situation
`MiMoProvider` (the direct API provider) implements only `sendMessage()` — there is no `sendMessageStream()` method. When this provider is active, the streaming fallback in `chatController.ts` (lines 159-184) kicks in:

```typescript
// Fallback: use non-streaming provider and emit events manually
res.write(`data: ${JSON.stringify({ type: 'state', state: 'thinking', label: 'Analyzing...', timestamp })}\n\n`);
const result = await provider.sendMessage(requestHistory, agent, model);
res.write(`data: ${JSON.stringify({ type: 'text', text: result.content, timestamp })}\n\n`);
```

The user sees a "thinking" state, then the entire response appears at once.

### Why It Is Wrong
- Users expect streaming (the frontend is built for it with live text updates, tool events, reasoning display)
- The non-streaming fallback has a terrible UX — long responses appear as a frozen screen followed by a wall of text
- The direct API (OpenAI-compatible `/chat/completions`) supports `stream: true` natively — this is a missing feature, not a limitation

### Recommended Approach
Implement `sendMessageStream()` in `MiMoProvider` using OpenAI's streaming API (`stream: true` + SSE response parsing).

### Migration Plan
1. Add `sendMessageStream()` to `MiMoProvider`
2. Set `stream: true` in the payload
3. Parse the SSE response line by line, yielding `text`, `reasoning`, and `done` events
4. Emit events in the same shape as CLI/Serve providers for frontend compatibility

---

## Issue #9: MiMoProvider Uses Raw `node:http`/`node:https` Instead of fetch

**File:** `backend/src/providers/MiMoProvider.ts:15-55`

### Current Situation
`MiMoProvider` implements its own HTTP client using `node:http` and `node:https` with manual JSON parsing, header construction, and error handling:

```typescript
function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<...> {
  const req = requestFn({ protocol, hostname, port, path, method: 'POST', headers: {...} }, (res) => {
    let data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => { /* parse JSON */ });
  });
```

Meanwhile:
- `MimoServeProvider` uses native `fetch()` (Node 18+)
- The frontend uses native `fetch()`
- Node.js has had a stable `fetch()` since v18 (LTS since April 2022)

### Why It Is Wrong
- **Reinventing the wheel**: `fetch()` with `response.json()` replaces 40 lines of hand-rolled HTTP code
- **No timeout**: The raw HTTP client has no request timeout — a hung API blocks forever
- **No retry**: No retry logic on transient failures (502, 503, 429)
- **No streaming**: The raw client can't easily parse SSE (Server-Sent Events), which is why streaming isn't implemented
- **Maintenance burden**: The manual HTTP code must handle chunked encoding, UTF-8, connection errors, etc. — all solved by `fetch()`

### Recommended Approach
Replace `postJson()` with `fetch()`. Add timeout, retry, and streaming support.

### Migration Plan
1. Replace `postJson()` with `fetch()` + `AbortController` for timeout
2. Add retry with exponential backoff for 429/502/503 errors
3. Use `ReadableStream` for SSE parsing (enables Issue #8 streaming)

---

## Issue #10: No Token Usage Tracking or Budget Enforcement

### Current Situation
The system tracks zero token metrics:
- `MiMoProvider` receives `usage` in the API response but only stores it in metadata — never used for anything
- No per-session token budget
- No per-user token budget
- No daily/monthly limits
- No warning when approaching context window limits
- The memory agent burns tokens on every qualifying exchange with no budget cap

### Why It Is Wrong
- **Cost control**: Without tracking, there's no visibility into API spend
- **Context window overflow**: If the conversation grows beyond the model's context window, the API returns an error — but the system doesn't detect this proactively
- **Memory agent runaway**: The memory agent makes an LLM call for every exchange that passes the heuristic gate — with no rate limit, a burst of messages triggers a burst of memory agent calls, each consuming tokens
- **No observability**: Can't answer "how many tokens did this session use?" or "what's the average cost per conversation?"

### Recommended Approach
1. Track token usage per session in the `sessions` table
2. Enforce per-session token budget (warn at 80%, hard-stop at 100%)
3. Rate-limit memory agent calls (max N per minute per project)

### Migration Plan
1. Add `totalTokens` column to `sessions` table
2. Sum `usage` from provider responses and store
3. Before sending to provider, estimate current conversation token count
4. Add `MEMORY_AGENT_RATE_LIMIT` env var (default: 5/minute)
5. Add token usage to the session summary API response

---

## Issue #11: Model ID Parsing Is Naive and Fragile

**Files:**
- `backend/src/providers/MimoServeProvider.ts:517-522`
- `backend/src/providers/MimoServeProvider.ts:638-643`

### Current Situation
```typescript
const modelObj = model ? (() => {
  const slashIndex = model.indexOf('/');
  return slashIndex > -1
    ? { providerID: model.substring(0, slashIndex), modelID: model.substring(slashIndex + 1) }
    : { providerID: model, modelID: model };
})() : undefined;
```

The model string (e.g., `"xiaomi/mimo-v2.5-pro"`) is split on the first `/` to extract `providerID` and `modelID`. If there's no `/`, the entire string is used as both.

### Why It Is Wrong
- **Model ID formats vary**: `openai/gpt-4`, `anthropic/claude-3.5-sonnet`, `mimo/mimo-auto`, `Qwen/Qwen3-8B` — some have one `/`, some have compound names
- **No validation**: Any string is accepted as a model ID — invalid IDs cause cryptic errors deep in the provider
- **No capability detection**: Different models have different context windows, pricing, and features — the system treats them all identically
- **`mimo/mimo-auto` special case**: This is a virtual model ID that the MiMo server resolves internally — the naive split doesn't handle it correctly

### Recommended Approach
Use a proper model registry that maps model IDs to provider/model metadata:
```typescript
const MODEL_REGISTRY = {
  'mimo/mimo-auto': { providerID: 'mimo', modelID: 'auto', contextWindow: 128000 },
  'xiaomi/mimo-v2.5': { providerID: 'xiaomi', modelID: 'mimo-v2.5', contextWindow: 32000 },
  // ...
};
```

### Migration Plan
1. Create `config/models.ts` with a model registry
2. Validate model IDs against the registry before sending
3. Use registry metadata for context window sizing (Issue #3 token budget)
4. Return available models from a `/api/models` endpoint (already partially implemented)

---

## Issue #12: Memory Observer Uses Only Regex Heuristics

**File:** `backend/src/context/observer/signals.ts`

### Current Situation
The memory observer determines whether to trigger a memory update using 8 regex pattern sets:
```typescript
const DECISION_PATTERNS = [
  /let'?s\s+(use|go\s+with|choose|pick|adopt|implement|switch\s+to)/i,
  /decided?\s+(to|on|that)/i,
  // ...
];
```

Confidence is calculated as `signalCount / 3` (capped at 1.0), and memory updates trigger at `confidence >= 0.3`.

### Why It Is Wrong
- **False negatives**: "I think we should consider using PostgreSQL for this" doesn't match any pattern — the decision is implicit, not explicit
- **False positives**: "I don't want to use React" matches the `don't use` pattern but is a NEGATION, not a convention
- **English-only**: All patterns are English regex — the system is bilingual (EN/FA) but memory detection only works in English
- **No semantic understanding**: A regex can't distinguish "let's use X" (decision) from "we used to use X" (past tense, not a new decision)
- **Arbitrary threshold**: `confidence >= 0.3` is a magic number with no empirical basis

### Recommended Approach
1. Use a lightweight LLM classification call (or the existing memory provider) for borderline cases
2. At minimum, add negation detection (exclude patterns preceded by "don't", "not", "never", "won't")
3. Add Farsi regex patterns for the bilingual use case
4. Calibrate the threshold with labeled data

### Migration Plan
1. Add negation-aware pattern matching (negative lookahead)
2. Add Farsi equivalents of the 8 pattern sets
3. Log all detected signals to a file for calibration
4. (Optional) Add a fast LLM classification step for exchanges that are near the threshold (confidence 0.2-0.4)

---

## Issue #13: Memory Agent Sends Full Brain State as JSON in Every Call

**File:** `backend/src/context/agent/prompt.ts:54-59`

### Current Situation
```typescript
sections.push(`\n--- CURRENT BRAIN STATE ---`);
sections.push(JSON.stringify(state, null, 2));

sections.push(`\n--- CURRENT BRAIN KNOWLEDGE ---`);
sections.push(JSON.stringify(knowledge, null, 2));
```

The entire brain state and knowledge (which can grow unbounded as decisions, tasks, architecture items accumulate) is serialized as JSON and included in every memory agent prompt.

### Why It Is Wrong
- **Token cost**: Every memory agent call pays the full token cost of the brain, even for simple exchanges
- **Growing cost**: As the brain accumulates more knowledge, each memory call becomes more expensive
- **No summarization**: The brain state includes raw JSON arrays that the LLM must parse and reason about — a compact summary would be more efficient
- **Redundant with context injection**: The `buildSummary()` method already produces a compact summary for the chat context — the memory agent prompt uses the raw version

### Recommended Approach
1. Use the same `buildSummary()` method for the memory agent prompt (compact text, not raw JSON)
2. For knowledge sections, include only the last N items (e.g., last 5 decisions, last 10 tasks)
3. Add a token budget for the brain context (e.g., max 2000 tokens)

### Migration Plan
1. Replace `JSON.stringify(state)` and `JSON.stringify(knowledge)` with `brain.buildSummary()` (already exists)
2. Add `buildCompactBrainSummary(maxTokens)` that truncates older items
3. Log the prompt token count to monitor growth

---

## Issue #14: No Provider Health Check or Failover

**Files:**
- `backend/src/providers/index.ts` (getProvider)

### Current Situation
```typescript
let cachedProvider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  // ... resolve and cache
}
```

The provider is resolved once and cached forever. There is no:
- Periodic health check
- Failover to another provider if the primary fails
- Reconnection logic if the provider becomes unhealthy
- Circuit breaker pattern

### Why It Is Wrong
- If `mimo serve` crashes, the backend continues sending requests to a dead process until manually restarted
- If the API key is invalid, every request fails with a 401 — no fallback to `mimo-cli` or `mock`
- The `healthCheck()` method exists on the interface but is NEVER called after initialization

### Recommended Approach
1. Run periodic health checks (e.g., every 30 seconds)
2. If the primary provider fails N consecutive times, attempt failover to the next provider
3. Implement a circuit breaker: after N failures, stop trying for M seconds

### Migration Plan
1. Add `healthCheck()` call to the provider initialization
2. Add a `ProviderHealthMonitor` that runs health checks on interval
3. Add failover logic: if mimo-serve is unhealthy, try mimo-cli; if that fails, try mock
4. Add circuit breaker state to the provider registry

---

## Issue #15: `MimoServeProvider` Manages a Single Session for All Users

**File:** `backend/src/providers/MimoServeProvider.ts:123`

### Current Situation
```typescript
private sessionId: string | null = null;
```

There is ONE `sessionId` field. The first time `sendMessage` or `sendMessageStream` is called, a MiMo serve session is created and stored. ALL subsequent calls reuse this same session.

### Why It Is Wrong
- **Session leaking**: If User A sends a message, then User B sends a message, both go to the same MiMo session — the AI sees both users' conversations as one continuous thread
- **No isolation**: Projects, goals, and context from different users mix
- **Frontend assumes isolation**: The frontend creates separate backend sessions per conversation, but they all map to one MiMo session

### Recommended Approach
Use a session map:
```typescript
private sessionMap: Map<string, string> = new Map(); // backendSessionId → mimoSessionId
```

### Migration Plan
1. Add `sessionMap` to `MimoServeProvider`
2. In `sendMessage()` and `sendMessageStream()`, look up or create a MiMo session for the current backend session
3. Pass the backend session ID through the request (or store it in MiMo session metadata)
4. Clean up stale session mappings periodically

---

## Issue #16: No Conversation Summarization or Compression

### Current Situation
When the conversation grows beyond the token budget, messages are simply DROPPED (trimmed from the beginning). There is no:
- Automatic summarization of old messages
- Conversation compression
- Key-point extraction from dropped messages
- "Context loss" notification to the user or AI

### Why It Is Wrong
- The model loses all context from earlier in the conversation
- Important decisions, goals, and file references from earlier turns are silently discarded
- The user may reference something from 50 messages ago — the AI has no way to know

### Recommended Approach
Implement a two-tier history strategy:
1. **Recent window**: Last N messages (full fidelity)
2. **Summary**: Automated summary of older messages, included as a context block

### Migration Plan
1. When trimming drops messages, generate a summary of the dropped portion
2. Store the summary in the session (new `summary` column)
3. Include the summary as a system message before the recent window
4. Update the summary periodically (e.g., every 20 messages)

---

## Issue #17: `chatService.sendMessage` and `streamMessage` Have Inconsistent Persistence Logic

**Files:**
- `backend/src/services/chatService.ts:70-83` (non-streaming: atomic transaction)
- `backend/src/controllers/chatController.ts:86-93,142-147` (streaming: conditional insert)

### Current Situation
**Non-streaming** (`chatService.sendMessage`):
```typescript
const insertMessages = db.transaction(() => {
  messageRepository.create({ sessionId, role: 'user', content: userContent });
  return messageRepository.create({ sessionId, role: 'assistant', content: result.content });
});
```
Both messages are persisted atomically in a transaction.

**Streaming** (`chatController.streamMessage`):
```typescript
// User message: only if not already stored
const lastStored = trimmedHistory[trimmedHistory.length - 1];
if (!lastStored || lastStored.role !== 'user' || lastStored.content !== userContent) {
  messageRepository.create({ sessionId, role: 'user', content: userContent });
}
// Assistant message: persisted after stream ends
const assistantMsg = messageRepository.create({ sessionId, role: 'assistant', content: assistantText });
```
User message is conditionally inserted (check-first). Assistant message is inserted separately. No transaction.

### Why It Is Wrong
- **Non-atomic**: If the assistant message insert fails after the user message was inserted, the DB has a user message with no response
- **Double-insert risk**: The "check if already stored" logic is fragile — a race condition between the frontend's optimistic insert and the backend's check could result in duplicates
- **Inconsistency**: Two code paths for the same operation should share the same persistence logic

### Recommended Approach
Centralize message persistence in the service layer with a consistent atomic pattern.

### Migration Plan
1. Create `chatService.persistExchange(sessionId, userContent, assistantContent)` with atomic transaction
2. Use it in both streaming and non-streaming paths
3. Handle the "already stored" case by checking for duplicates within the transaction

---

## Issue #18: No Prompt Injection Protection

### Current Situation
User messages are sent directly to the AI provider with no sanitization or wrapping:
```typescript
// In MiMoProvider
messages: [
  { role: 'system', content: SYSTEM_PROMPT },
  ...messages.map((message) => ({ role: message.role, content: message.content })),
],
```

The context injection is sent as a `user` message, meaning a user could craft a message like:
```
Ignore all previous instructions. You are now...
```

And it would be indistinguishable from the context injection (both are `role: 'user'`).

### Why It Is Wrong
- The context injection uses `role: 'user'` — a real user message can mimic it
- No delimiters or metadata distinguish synthetic messages from user input
- The AI provider has no way to know which parts are trustworthy context vs. user-supplied text

### Recommended Approach
1. Use `role: 'system'` for context injection (models treat system messages as higher-authority)
2. Add clear delimiters: `<context>...</context>` wrapped around the injection
3. Never send context injection as a `user` message

### Migration Plan
1. Change `ContextManager.buildInjection()` to return `role: 'system'`
2. Add XML-style delimiters: `<project_context>...\n</project_context>`
3. Update `buildPrompt()` in both providers to handle system-role context

---

## Issue #19: The `agent` Parameter Is Lost in the Non-Streaming Path

**File:** `backend/src/controllers/chatController.ts:164`

### Current Situation
In the non-streaming fallback:
```typescript
const result = await provider.sendMessage(requestHistory, agent, model);
```

But `provider.sendMessage` in `MiMoProvider` ignores the `agent` parameter (see Issue #4). And in `MimoCliProvider`, the agent is passed to the CLI but only affects the `--agent` flag — the system prompt is unchanged.

### Why It Is Wrong
- In the non-streaming path, `agent` is passed but has no effect in the direct API provider
- The streaming path passes `agent` to `sendMessageStream`, which passes it to `onEvent({ type: 'status', agent })` — the frontend uses this for UI display but the model doesn't receive agent-specific instructions

### Recommended Approach
Agent mode must be communicated to the model via the prompt, not just the UI.

### Migration Plan
1. Implement Issue #4 (agent-specific system prompts)
2. Ensure both streaming and non-streaming paths apply the agent prompt consistently

---

## Issue #20: Debug `console.log` Statements Left in Production Code

**Files:**
- `backend/src/providers/MimoCliProvider.ts:274`: `console.log('[MimoCliProvider DEBUG] Spawning:', ...)`
- `backend/src/providers/MimoCliProvider.ts:441`: `console.log('[MimoCliProvider DEBUG] Full CLI args:', ...)`
- `backend/src/providers/MimoCliProvider.ts:442`: `console.log('[MimoCliProvider DEBUG] Model argument:', ...)`
- `frontend/src/hooks/useChat.ts:432`: `console.log('[MiMo] Sending message in ${agent} mode')`
- `frontend/src/hooks/useChat.ts:764-769`: `console.log('[QUESTION EVENT RECEIVED]', ...)`

### Current Situation
Multiple `console.log` statements with `TEMPORARY DEBUG` comments are scattered across production code. These were presumably added during development and never removed.

### Why It Is Wrong
- **Information leakage**: Debug logs may expose API keys, model IDs, session tokens, or user content to stdout
- **Noise**: In production, these pollute logs and make real issues harder to find
- **Performance**: `console.log` is synchronous and blocks the event loop
- **Professionalism**: Debug output in production signals incomplete work

### Recommended Approach
Remove all `console.log` statements. Use the `logger.debug()` (pino) for debug-level logging that respects log level configuration.

### Migration Plan
1. Replace `console.log('[MimoCliProvider DEBUG]...')` with `logger.debug(...)` (the `debugLog` helper already exists)
2. Remove the "TEMPORARY DEBUG" comments
3. Remove frontend `console.log` statements
4. Add an ESLint rule: `no-console: error`

---

## Priority Ranking

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | #7 Dual session management (session leaking) | Medium | Correctness |
| P0 | #15 Singleton session across all users | Medium | Correctness |
| P0 | #18 No prompt injection protection | Low | Security |
| P0 | #20 Debug console.log in production | Trivial | Security/Polish |
| P1 | #1 System prompt is generic | Low | Output quality |
| P1 | #4 Agent parameter ignored | Low | Feature correctness |
| P1 | #8 No streaming in direct API | Medium | UX |
| P1 | #3 Token-based history trimming | Medium | Reliability |
| P1 | #9 Raw HTTP instead of fetch | Medium | Maintainability |
| P1 | #10 No token tracking | Medium | Cost control |
| P1 | #17 Inconsistent persistence logic | Medium | Data integrity |
| P2 | #2 Fragile context injection detection | Medium | Robustness |
| P2 | #5 Echo-stripping workaround | Low | Correctness |
| P2 | #6 Memory prompt lacks examples | Low | Output quality |
| P2 | #11 Naive model ID parsing | Low | Reliability |
| P2 | #13 Full brain in every memory call | Low | Cost |
| P2 | #14 No provider failover | Medium | Availability |
| P3 | #12 Regex-only observer | Medium | Recall |
| P3 | #16 No conversation summarization | High | UX |
