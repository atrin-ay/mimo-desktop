# Plan 2 — Make every response and every failure visible

**Goal:** every turn ends in one of exactly two states — a rendered answer, or a specific error with a retry. Silence becomes structurally impossible. And there is one chat code path, not two.

## Current state — why it goes quiet

The silence isn't one bug. It's five that line up:

1. **`backendError` is dead state.** `useChat.ts:77` computes it, `:435` returns it. Grep across all of `frontend/src` finds four hits, every one inside `useChat` itself — **no component ever renders it.** Every error the hook catches is invisible by construction.
2. **The fallback swallows the error.** Streaming fails → `useChat.ts:304-314` retries non-streaming → `catch { agentText = ""; }`. No variable, no log, no state.
3. **Then the message is deleted.** With `finalText` empty, `useChat.ts:328-340` *removes* the assistant bubble. The user watches a thinking indicator disappear and gets nothing.
4. **`fatal_error` is never handled.** The backend emits it (`chatController.ts:147,177`), but the reducer's switch (`streamEventReducer.ts:102-465`) has no `fatal_error` case **and no `default`** — it falls straight through. `done` and `end` are unhandled too.
5. **`error` produces no visible text.** The `error` case (`:372-384`) marks activity entries and the orb, but never sets `messageUpdate` — and the activity log only renders inside the terminal panel.

Two more that make it worse:

- **The real reason is discarded.** `chatController.ts:144` computes `errorMsg`, then sends the constant `'Provider stream failed'` on `:147`. Same at `:174`/`:177`. `errorMsg` is never used.
- **An empty stream never terminates.** `chatController.ts:131` only sends `done` `if (assistantText.trim())`. A turn producing no text emits no completion event at all.

And the structural cause of future drift: **there are two chat implementations.** `chatService.sendMessage()` has proper error mapping and an atomic two-message transaction. `chatController.streamMessage()` re-implements context injection, history building and persistence, bypassing the service entirely. They have already diverged — trim-then-append vs. append-then-trim, transactional vs. not. `chatController.ts:79-82` also decides whether to persist by comparing the last stored message's text, so sending the same message twice drops the second. `api.ts:29-43` discards `error.code`.

## Steps

1. **One typed SSE contract.** A discriminated union in `backend/src/types/stream.ts`, imported by the frontend. `error` = recoverable, `fatal_error` = terminal; both carry `{ code, message, requestId, retryable }`.
2. **Reducer completeness.** Add `error` and `fatal_error` → `messageUpdate: { status: 'error', errorCode }`. Add a `default` branch that logs unknown types in dev. Handle `done`/`end` explicitly.
3. **Never delete the bubble.** Replace the removal branch (`useChat.ts:328-340`) with an explicit error state on the message — `EMPTY_RESPONSE` when the stream closed cleanly but produced nothing.
4. **Delete the silent catch.** The fallback's failure sets `chatError` with the real cause.
5. **Always terminate.** Drop the `assistantText.trim()` gate. The backend sends exactly one `done` or `fatal_error` per turn, always.
6. **Send the real cause.** Include `code`, `requestId` (the `requestContext` middleware already exists) and the underlying message. The UI shows the localized `errors.<CODE>` from Plan 1 plus the `requestId` for log correlation.
7. **`parseError` keeps the code.** Return a typed `ApiError { code, message, requestId }` instead of `Error(string)`.
8. **Render it.** An error banner with retry in `ChatView`, plus a per-message error row. This is the single change that makes the other four failures visible.
9. **Collapse to one path.** Move streaming into `chatService.streamMessage()`; the controller does HTTP/SSE plumbing only. Delete history building, context injection and persistence from `chatController`.
10. **Idempotency instead of text comparison.** The client sends a `clientMessageId`; unique index on it; drop the `:79-82` heuristic.
11. **Abort hygiene.** `reader.cancel()` in a `finally` inside `streamChat`; pass `signal` to the non-stream fetches; add an idle timeout so a stalled stream surfaces as `TIMEOUT` instead of hanging.
12. **`API_BASE` from `import.meta.env.VITE_API_BASE`** — replacing `api.ts:1` and the separately hardcoded health URL at `:214`.

## Acceptance

Every one of these must produce a specific, localized, visible error and must not delete the bubble:

- `mimo serve` killed mid-turn
- provider returns empty content
- provider emits `session.error`
- backend unreachable
- stream stalls past the idle timeout

Plus: `grep -rn "messageRepository" backend/src/controllers` → 0; sending identical text twice persists twice; new reducer fixtures for `fatal_error`, `error` and empty-stream land in `frontend/src/lib/__tests__/` (an `errorHandling.ts` fixture is already there); `npm run lint` and `npm test` pass in both packages.
