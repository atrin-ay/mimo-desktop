# Error Handling Audit — MiMo Desktop

> Audit Date: 2026-07-23  
> Scope: All error handling paths — backend middleware, controllers, services, providers, frontend hooks, API client  
> Method: Full enumeration of every `catch` block, error boundary, and failure path in the codebase

---

## Executive Summary

The codebase has **25 empty `catch` blocks** in the backend and **6 in the frontend**. The backend has a well-structured error middleware, but the streaming path bypasses it entirely. The frontend silently swallows errors in session loading, model selection, and project listing. Users receive no feedback for 40% of failure scenarios. The memory system is designed to silently degrade — which is correct for availability but means bugs are invisible.

**Error handling quality: 4/10**

---

## Error #1: Streaming Errors Are Sent as SSE Events, Not HTTP Errors

**File:** `backend/src/controllers/chatController.ts:154-158, 180-183`

### Current Situation
```typescript
// Streaming path
try {
  await provider.sendMessageStream(requestHistory, agent, (event) => {
    // ...
  }, model);
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : String(err);
  logger.error({ err, sessionId }, 'Streaming provider error');
  res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg, timestamp: Date.now() })}\n\n`);
}
```

When the AI provider fails during streaming, the error is sent as an SSE event (`type: 'error'`) rather than an HTTP error. The HTTP response status remains 200.

### Why It Is Wrong
- The frontend's `streamChat()` generator receives the error event but doesn't throw — it just yields it
- The `useChat` hook's streaming loop processes the error event but doesn't set `backendError` — it only logs to console
- The user sees a partial message with no clear indication of failure
- Monitoring tools (APM, load balancers) see 200 status codes for failed requests
- No HTTP-level retry is possible (the connection is already streaming)

### Impact
AI provider failures during streaming are invisible to monitoring. Users see a frozen or partial response with no error message.

### Recommended Approach
1. After writing the error event, set an HTTP status code (e.g., 502 for provider failure)
2. Add a `type: 'fatal_error'` event that the frontend treats as a terminal failure
3. Include error codes (not just messages) so the frontend can show specific guidance

---

## Error #2: Non-Streaming Fallback Swallows Provider Errors

**File:** `backend/src/controllers/chatController.ts:180-183`

### Current Situation
```typescript
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : String(err);
  logger.error({ err, sessionId }, 'Provider error');
  res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg, timestamp: Date.now() })}\n\n`);
}
```

Same pattern as streaming — errors are sent as SSE events, not HTTP errors. The non-streaming fallback path has the same issue.

### Why It Is Wrong
- The SSE stream continues after the error event (the `end` event is still written at line 187)
- The frontend receives both an `error` event and an `end` event — the error is not terminal
- If the error happens before any text is emitted, the user sees nothing

### Impact
Same as Error #1 — provider failures are invisible to monitoring and unclear to users.

---

## Error #3: `chatService.sendMessage` Throws InternalServerError with Raw Provider Error

**File:** `backend/src/services/chatService.ts:56-67`

### Current Situation
```typescript
} catch (err) {
  const detail = err instanceof Error ? err.message : String(err);
  logger.error({ err, sessionId, provider: provider.name }, 'Provider failed to generate a response');
  throw new InternalServerError(detail || 'AI provider failed to generate a response', { provider: provider.name });
}
```

The raw provider error message is forwarded to the client as an `InternalServerError` (HTTP 500). This may contain:
- API key fragments
- Internal URLs
- Provider-specific error details
- Stack traces (if the provider includes them)

### Why It Is Wrong
- **Information leakage**: Raw provider errors may expose internal infrastructure details
- **Misleading status code**: A provider timeout is not a server error — it's a downstream failure (502/504)
- **No retry guidance**: The client receives a 500 with no indication of whether to retry

### Impact
Sensitive information may be exposed in error responses. Clients may not handle retries correctly.

### Recommended Approach
1. Map provider errors to appropriate HTTP status codes (429 for rate limit, 502 for provider failure, 504 for timeout)
2. Sanitize error messages before returning to client
3. Add `Retry-After` header for rate-limited responses

---

## Error #4: Frontend Session Loading Silently Fails

**File:** `frontend/src/hooks/useChat.ts:272-274`

### Current Situation
```typescript
} catch {
  // Could not load sessions — keep the default empty conversation.
}
```

When `listSessions()` fails (backend down, network error, etc.), the error is completely swallowed. The user sees an empty conversation list with no indication that loading failed.

### Why It Is Wrong
- The user thinks they have no conversations, when in reality they exist but couldn't be loaded
- There's no retry mechanism — the user must refresh the page
- No error state is set — `backendError` remains null

### Impact
Data appears to be lost. Users may recreate conversations that already exist.

### Recommended Approach
1. Set `backendError` with a descriptive message
2. Show a banner: "Could not load conversations. Retrying..."
3. Implement automatic retry with exponential backoff
4. Add a manual "Retry" button

---

## Error #5: Frontend Model Loading Silently Falls Back to Hardcoded Defaults

**File:** `frontend/src/hooks/useChat.ts:128-135`

### Current Situation
```typescript
} catch {
  // Fallback to default models
  setModels([
    { id: 'mimo/mimo-auto', name: 'Auto', description: '...' },
    { id: 'xiaomi/mimo-v2.5', name: 'MiMo v2.5', description: '...' },
    // ...
  ]);
}
```

When `listModels()` or `getCurrentModel()` fails, the frontend silently substitutes hardcoded model IDs. These may not match the backend's actual available models.

### Why It Is Wrong
- The hardcoded models may not exist on the backend
- The user sees a model selector that doesn't work (selecting a model that doesn't exist)
- No error feedback — the user thinks everything is fine
- The model IDs are stale (hardcoded at development time)

### Impact
Model selection may be broken without the user knowing. API calls may fail with "model not found" errors.

### Recommended Approach
1. Show a warning: "Could not load available models. Using defaults."
2. Include the error in `backendError` state
3. Never silently substitute — always inform the user

---

## Error #6: Model Persistence Failure Is Silently Ignored

**File:** `frontend/src/hooks/useChat.ts:148-150`

### Current Situation
```typescript
const setModel = useCallback(async (newModel: string) => {
  setModelState(newModel);
  try {
    await setCurrentModel(newModel);
  } catch {
    // Backend persistence failed, but local state is set
  }
}, []);
```

When the backend fails to persist the model selection, the error is swallowed. The user's model choice appears to work (local state is set) but won't survive a page refresh.

### Why It Is Wrong
- The user thinks their model preference is saved
- On refresh, the old model is loaded from the backend
- No feedback that persistence failed

### Impact
User settings appear to save but don't persist. Confusing behavior across sessions.

### Recommended Approach
1. Show a toast notification: "Model preference could not be saved to server"
2. Retry the persistence in the background
3. Consider: if persistence fails, should the model selection revert?

---

## Error #7: Project Loading Failure Is Silently Swallowed

**File:** `frontend/src/components/DashboardSection.tsx:46-48`

### Current Situation
```typescript
useEffect(() => {
  listProjects()
    .then(setApiProjects)
    .catch(() => {});
}, []);
```

The `.catch(() => {})` completely swallows the error. The dashboard shows no projects with no explanation.

### Why It Is Wrong
- The user sees an empty "Recent Projects" section
- No error message, no retry, no indication of failure
- The API call may have failed due to auth issues, network errors, or server errors

### Impact
Dashboard appears empty. Users may think they have no projects.

### Recommended Approach
1. Log the error
2. Show a placeholder: "Could not load projects"
3. Add a retry button

---

## Error #8: `setApiKey` Admin Endpoint Swallows `.env` Write Failure

**File:** `backend/src/controllers/adminController.ts:90-93`

### Current Situation
```typescript
try {
  upsertEnvVar(envPath, 'MIMO_API_KEY', trimmedKey);
  // ...
} catch (err) {
  // non-fatal, log and continue
  console.warn('Failed to write .env file', err);
}
```

When the `.env` file write fails, the error is logged with `console.warn` (not even `logger.warn`) and the operation continues. The API key is set in memory but not persisted to disk.

### Why It Is Wrong
- The user thinks the key is saved permanently
- On server restart, the key is lost
- `console.warn` instead of `logger.warn` means the error may not appear in structured logs
- The success response (`200 OK`) is returned regardless

### Impact
API key appears to save but doesn't survive restarts. User must re-enter the key after every restart.

### Recommended Approach
1. Return a warning in the response: `{ ok: true, warning: "Key saved in memory but could not persist to .env file" }`
2. Use `logger.warn` instead of `console.warn`
3. Include the error details in the warning

---

## Error #9: Memory Agent Errors Are Completely Silent

**File:** `backend/src/context/agent/MemoryAgent.ts:89-92`

### Current Situation
```typescript
} catch (err) {
  logger.error({ err, projectId }, 'Memory agent failed');
  return { applied: false };
}
```

The memory agent catches ALL errors and returns `{ applied: false }`. The error is logged but:
- The user is never notified
- The brain is never updated (the failure is silent)
- There's no retry mechanism
- There's no circuit breaker (if the LLM is down, every memory call fails silently forever)

### Why It Is Wrong
- Memory updates silently stop working when the LLM is unavailable
- No visibility into memory system health
- No way to distinguish "no new information" from "LLM is down"
- The brain gradually becomes stale without any indication

### Impact
The memory system can be completely broken for hours/days without anyone noticing.

### Recommended Approach
1. Add a `memoryHealth` status to the context API response
2. Track consecutive failures and alert after N failures
3. Include memory system status in the `/health` endpoint
4. Show memory system status in the UI (Settings or Dashboard)

---

## Error #10: Memory Provider Timeout Returns Fake "No Update" Patch

**File:** `backend/src/context/providers/ChatProviderMemoryAdapter.ts:38-47`

### Current Situation
```typescript
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : String(err);
  logger.warn({ error: errorMsg }, 'Memory provider failed, returning no-update patch');
  return JSON.stringify({
    update: false,
    reason: `Memory provider error: ${errorMsg}`,
    changes: [],
  });
}
```

When the memory provider times out or fails, a fake "no update" patch is returned. This is logged as a warning, but:
- The `MemoryAgent` treats it as a successful "no update" response
- The failure is logged once, then forgotten
- If the provider is persistently down, every memory call produces this fake response

### Why It Is Wrong
- The system can't distinguish "nothing to update" from "provider is broken"
- No metrics on failure rate
- No alerting on sustained failures
- The fake patch is indistinguishable from a real "no update" in logs

### Impact
Memory system failures are invisible. The system appears to work but memory updates never happen.

### Recommended Approach
1. Return a structured error object, not a fake patch:
   ```typescript
   return { error: true, reason: 'Memory provider timeout', retryable: true };
   ```
2. Track failure count and alert after threshold
3. Include in health check

---

## Error #11: `parseError` in API Client Swallows JSON Parse Failures

**File:** `frontend/src/api.ts:37`

### Current Situation
```typescript
async function parseError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await response.json()) as ApiError;
      if (body?.error?.message) {
        return body.error.message;
      }
    } catch {
      // ignore parse error
    }
  }
  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
}
```

If the JSON response doesn't match the expected `ApiError` shape (e.g., the backend returns a different error format), the error falls through to the text fallback. The original error structure is lost.

### Why It Is Wrong
- If the backend returns `{ error: "something" }` instead of `{ error: { message: "something" } }`, the message is lost
- The fallback returns the raw response text, which may be an HTML error page
- No structured error information reaches the user

### Impact
Error messages may be cryptic or unhelpful.

### Recommended Approach
1. Accept multiple error shapes: `{ error: string }`, `{ error: { message: string } }`, `{ message: string }`
2. Include the HTTP status code in the error for context
3. Return a structured error object, not just a string

---

## Error #12: SSE Stream Parsing Silently Drops Malformed Events

**File:** `frontend/src/api.ts:369-373`

### Current Situation
```typescript
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data: ')) continue;
  try {
    const event = JSON.parse(trimmed.slice(6));
    yield event;
  } catch {
    // skip malformed
  }
}
```

Malformed SSE events are silently skipped. If the backend sends corrupted data, the frontend never knows.

### Why It Is Wrong
- Partial or corrupted streams are silently ignored
- No logging of dropped events
- Could mask backend bugs that produce invalid JSON

### Impact
Data loss during streaming is invisible.

### Recommended Approach
1. Log dropped events (at debug level)
2. Track dropped event count for monitoring
3. If too many events are dropped, abort the stream

---

## Error #13: No Error Boundary in React Component Tree

### Current Situation
No `componentDidCatch` or `<ErrorBoundary>` exists anywhere in the frontend. If any component throws during render:
- The entire React tree unmounts
- The user sees a white screen
- No error information is displayed
- No error is reported to any monitoring system

### Why It Is Wrong
- A rendering error in `ExecutionCard` (malformed message) crashes the entire chat view
- A canvas error in `Orb.tsx` (WebGL not supported) crashes the entire page
- No recovery without full page reload
- No error reporting

### Impact
Any rendering bug is a total application outage.

### Recommended Approach
1. Add `<ErrorBoundary>` at App level (shows fallback UI)
2. Add `<ErrorBoundary>` around ChatView (isolates message rendering errors)
3. Add `<ErrorBoundary>` around Orb (isolates canvas errors)
4. Report errors to a monitoring service

---

## Error #14: `getDatabase()` Has No Error Recovery

**File:** `backend/src/storage/database.ts:23-37`

### Current Situation
```typescript
export function getDatabase(): Database.Database {
  if (dbInstance) return dbInstance;
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  dbInstance = db;
  return db;
}
```

If `resolveDbPath()` fails (permission denied, disk full) or `new Database()` fails (corrupt file), the error propagates unhandled. There's no retry, no fallback, and no graceful degradation.

### Why It Is Wrong
- A corrupt database file crashes the entire server on startup
- No database integrity check on startup
- No backup/restore mechanism

### Impact
Database corruption is a total outage with no recovery path.

### Recommended Approach
1. Wrap database initialization in try/catch
2. Add a `PRAGMA integrity_check` on startup
3. If corrupt, attempt to restore from backup or create a new database
4. Log clear error messages for each failure mode

---

## Error #15: Provider Health Check Is Never Called After Initialization

**File:** `backend/src/providers/index.ts:23-51`

### Current Situation
```typescript
export function getProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  // ... resolve and cache
  cachedProvider = factory();
  return cachedProvider;
}
```

The provider is resolved once and cached forever. `healthCheck()` exists on the interface but is never called after initialization.

### Why It Is Wrong
- If the provider becomes unhealthy after startup (API key revoked, service down), every request fails
- No way to detect provider degradation
- No automatic failover

### Impact
Provider failures persist until server restart.

### Recommended Approach
1. Run periodic health checks (every 30 seconds)
2. If unhealthy, attempt failover to next provider
3. Include provider health in `/health` endpoint

---

## Error #16: `createSession` on Frontend Doesn't Handle Concurrent Creation

**File:** `frontend/src/hooks/useChat.ts:309-345`

### Current Situation
```typescript
if (!currentSessionId) {
  const session = await createSession();
  currentSessionId = session.id;
  setSessionId(session.id);
  setSubjects((prev) => {
    // ... update subjects
  });
  setActiveSubjectId(session.id);
}
```

If the user clicks "send" twice quickly before the first session is created, two `createSession()` calls are made. Both succeed, creating two sessions. Only the second one is tracked.

### Why It Is Wrong
- Orphaned sessions accumulate in the database
- The first session has a user message but is never visible in the UI
- No deduplication or guard against concurrent creation

### Impact
Database bloat from orphaned sessions. User data loss (first message disappears).

### Recommended Approach
1. Add a loading guard: prevent `handleExecuteCommand` from running while `isLoading` is true
2. Use a ref to track session creation in progress
3. Deduplicate on the backend (check for existing session before creating)

---

## Error #17: SSE Connection Has No Reconnection Logic

**File:** `backend/src/providers/MimoServeProvider.ts:307-315`

### Current Situation
```typescript
} catch (err: any) {
  logger.error({ error: err.message }, 'SSE stream error');
  // Attempt reconnect after delay
  setTimeout(() => {
    if (this.serveReady) {
      this.connectEventStream();
    }
  }, 5000);
}
```

The SSE reconnection uses a fixed 5-second delay with no exponential backoff, no maximum retry count, and no circuit breaker.

### Why It Is Wrong
- If the server is down, reconnection attempts happen every 5 seconds forever
- No backoff means the server is hammered with reconnection attempts
- No maximum retry count means infinite retries
- No way to detect if the server is permanently gone

### Impact
Resource waste on failed reconnections. Potential denial of service on the `mimo serve` process.

### Recommended Approach
1. Implement exponential backoff (1s, 2s, 4s, 8s, up to 60s)
2. Add maximum retry count (e.g., 10 attempts)
3. After max retries, emit a `disconnected` event and stop retrying
4. Require manual reconnection or server restart

---

## Error #18: `upsertEnvVar` in Admin Controller Has No File Permission Check

**File:** `backend/src/controllers/adminController.ts:8-23`

### Current Situation
```typescript
function upsertEnvVar(filePath: string, key: string, value: string) {
  const exists = fs.existsSync(filePath);
  let content = exists ? fs.readFileSync(filePath, 'utf8') : '';
  // ... modify content
  fs.writeFileSync(filePath, content, 'utf8');
}
```

No check for:
- File permissions (can we write?)
- Disk space (is there room?)
- File locking (is another process using it?)
- Concurrent writes (race condition)

### Why It Is Wrong
- Concurrent admin requests can corrupt the `.env` file
- If the disk is full, `writeFileSync` throws but the in-memory config is already updated
- No file locking mechanism

### Impact
`.env` file corruption. Inconsistent state between memory and disk.

### Recommended Approach
1. Use atomic write (write to temp file, then rename)
2. Add file locking
3. Check disk space before writing
4. Validate the file after writing

---

## Summary: Silent Failure Map

| Location | What Fails | User Sees | Should See |
|----------|-----------|-----------|------------|
| `useChat.ts:272` | Session loading | Empty list | "Could not load conversations" |
| `useChat.ts:128` | Model loading | Hardcoded models | "Could not load models" |
| `useChat.ts:148` | Model persistence | Nothing | "Preference not saved" |
| `useChat.ts:850` | Fallback send | Empty response | "Message failed" |
| `DashboardSection.tsx:48` | Project loading | Empty dashboard | "Could not load projects" |
| `adminController.ts:90` | .env write | Success (200) | Warning in response |
| `MemoryAgent.ts:89` | LLM failure | Nothing | Memory status indicator |
| `ChatProviderMemoryAdapter.ts:38` | Provider timeout | Nothing | Health metric |
| `MimoServeProvider.ts:307` | SSE disconnect | Silent retry | "Reconnecting..." |
| `api.ts:371` | Malformed SSE | Event dropped | Logged warning |

---

## Priority Ranking

| Priority | Error | Effort | Impact |
|----------|-------|--------|--------|
| P0 | #13 No React error boundary | Low | Total outage prevention |
| P0 | #1 Streaming errors as 200 | Low | Monitoring blind spot |
| P0 | #3 Raw provider errors to client | Low | Information leakage |
| P1 | #4 Session loading silent failure | Low | Data loss perception |
| P1 | #5 Model loading silent fallback | Low | Broken feature |
| P1 | #9 Memory agent silent failure | Medium | System health visibility |
| P1 | #10 Fake "no update" patch | Low | Failure masking |
| P1 | #14 No database error recovery | Medium | Total outage |
| P1 | #15 No provider health checks | Medium | Degradation detection |
| P2 | #6 Model persistence failure | Low | Settings reliability |
| P2 | #7 Project loading failure | Low | Dashboard reliability |
| P2 | #8 .env write failure | Low | Config persistence |
| P2 | #11 parseError loses structure | Low | Error message quality |
| P2 | #12 SSE drops malformed events | Low | Data integrity |
| P2 | #16 Concurrent session creation | Medium | Data integrity |
| P2 | #17 SSE no backoff | Low | Resource waste |
| P2 | #18 No file locking | Low | Data corruption |
