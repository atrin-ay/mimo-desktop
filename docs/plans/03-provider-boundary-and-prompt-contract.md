# Plan 3 — Provider boundary, prompt contract, and config

**Goal:** the user's prompt is sent as the user's prompt. Anything MiMo needs to know travels in its own channel. The one case where the transport genuinely offers no alternative is explicit, isolated, documented and tested — not the default.

## Current state

**Context is concatenated into the user's text.** `MimoServeProvider.buildPrompt()` (`:916-935`) builds
`<project_context …>…</project_context>\n…\n\n${lastUserMsg.content}` and ships it as `parts:[{type:'text',text:prompt}]`. `MimoCliProvider.ts:470-471` does the same. Consequences:

- The polluted blob becomes the user turn inside mimo's own session history, and stays there for the life of the session.
- `chatController.ts:109-125` then strips the echoed prompt back out by testing `text.startsWith(userContent)` — but the provider sent `context + userContent`, so **the strip stops matching precisely when context exists.**
- `role: 'context'` is a fake message role in the shared type (`types/index.ts:6`) instead of a field.

**The history contract is a lie.** Both call sites build a 40-message `requestHistory`. `MimoServeProvider` discards all of it and keeps only the last user message, because mimo maintains server-side history. Work is done and thrown away, and nothing in the type says so.

**Two contradictory approaches coexist.** `MiMoProvider.ts:14` has a real `SYSTEM_PROMPT` for an OpenAI-compatible endpoint. The mimo providers concatenate.

**The memory agent impersonates the user.** `ChatProviderMemoryAdapter.ts:22-31` sends the ~2k-token Memory Agent instruction (`context/agent/prompt.ts`) through `getProvider().sendMessage()` as `role:'user'`. Under `mimo-serve` that opens a real agent session (`__memory_agent__:<projectId>`) with tools available and its instructions arriving as user input — the sharpest instance of exactly the problem being fixed here.

**Lifecycle and portability.** `MimoServeProvider` spawns the subprocess in its **constructor** (`:144`), and `findMimoBinary()` runs `execFileSync('npm root -g')` (`:79`) at construction — so merely importing the module starts a process. The serve URL is scraped from stdout with `/(?:listening on\s+)?(https?:\/\/[^\s\n]+)/` (`:244`), which matches any URL it happens to print, including inside an error. Discovery is Windows-only (`mimo.exe`, `APPDATA`, `NVM_SYMLINK`).

**Config and secrets.** No root `.gitignore`. `backend/admin.json` and `backend/session.json` are tracked in git. `env.ts:8-23` mutates `process.env` from `data/admin-overrides.json` at import time. `frontend/package.json` is still named `react-example` and ships `express`, `dotenv` and `@google/genai` as browser dependencies.

## Steps

1. **Typed request object.** `sendMessage(conversationId, { system?, context?, messages }, opts)`. Remove `'context'` from `MessageRole` — context becomes a field, not a message.
2. **Per-provider delivery, no concatenation.**
   - `MiMoProvider`: `role: 'system'`.
   - `MimoServeProvider`: context as its **own** entry in `parts[]`, or via mimo's system/instructions field if the API exposes one — confirm against the running server before choosing.
   - Prefixing the user's text survives only as a **last-resort fallback**, behind a single documented function, reachable only when the transport offers no other channel. When it is used, the provider returns the exact `sentPrompt` so echo handling compares against what was actually sent instead of guessing.
3. **Delete the `startsWith(userContent)` hack** once step 2 lands. If mimo still echoes, handle it against `sentPrompt`.
4. **Capability flags** on `AIProvider`: `supportsSystemChannel`, `supportsServerSideHistory`. Callers stop building history the provider will discard.
5. **Memory agent off the chat provider.** A dedicated `MemoryProvider` hitting a plain completion endpoint with a real system role, tools disabled, its own model and timeout. It must never call `getProvider()`.
6. **Explicit lifecycle.** Constructors do no I/O. `await provider.init()` from `src/index.ts`; a `stopped|starting|ready|failed` state reported on `/health`; graceful shutdown kills the subprocess.
7. **Portable discovery.** `MIMO_BINARY` env override first, then `where`/`which`, then platform fallbacks; `mimo` vs `mimo.exe` by platform. Require the URL on a `listening` line, or pass an explicit port and skip scraping entirely.
8. **Config as data.** Validate all env with zod (already a dependency) at boot, fail fast. Replace the `admin-overrides.json` env mutation with an explicit, typed, logged override layer.
9. **Secrets.** Add a root `.gitignore`; `git rm --cached backend/admin.json backend/session.json`; rotate any credential they contained.
10. **Frontend hygiene.** Rename the package; remove `express`, `dotenv` and `@google/genai` once confirmed unused — a browser-side Gemini SDK implies an API key in the bundle.
11. **Docs.** Fold the eight root-level audit files (~200 KB) into `docs/`, keeping real decisions as ADRs under the existing `docs/adr`.

## Acceptance

- A provider test asserts the user turn reaching the provider is **byte-identical** to `userContent` when project context is present.
- `grep -rn "role: 'context'" backend/src` → 0.
- The memory agent produces a patch with the chat provider stopped.
- Importing `MimoServeProvider` spawns no process; `/health` reports provider state.
- `npm run build` passes in both packages. No secrets tracked.
