# MiMo Desktop — Technical Architecture Overview

> Generated: 2026-07-23  
> Version: 1.0.0 (Phase 1 — Core Chat + Sessions)

---

## 1. Overall Architecture

MiMo Desktop is a **full-stack AI assistant application** with a clear client-server separation:

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)               │
│  Port 3000 · React 19 · TypeScript · TailwindCSS 4       │
│  SSE streaming · Orb UI · Bilingual (EN/FA)              │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP / SSE (localhost:3001)
┌────────────────────────▼─────────────────────────────────┐
│                     Backend (Express + TypeScript)         │
│  Port 3001 · Express 4 · SQLite (better-sqlite3)         │
│  REST API + SSE streaming · Provider abstraction          │
└────────────────────────┬─────────────────────────────────┘
                         │
            ┌────────────┼──────────────┐
            │            │              │
     ┌──────▼──┐  ┌──────▼──┐  ┌───────▼──────┐
     │ MiMo    │  │ MiMo    │  │ MiMo API     │
     │ serve   │  │ CLI     │  │ (HTTP)       │
     │ (SSE)   │  │ (spawn) │  │              │
     └─────────┘  └─────────┘  └──────────────┘
```

**What it does:** Provides an AI-powered chat interface with persistent sessions, project context ("Brain"), and a memory system that learns from conversations.

**Why it exists:** To deliver a desktop AI assistant that integrates with MiMo's agent framework (build/plan/compose modes) while maintaining project-specific knowledge across sessions.

**Current design decisions:**
- Backend is the single source of truth for all session/message data (SQLite)
- Frontend is a thin client that streams events from the backend
- AI providers are abstracted behind a strategy pattern with auto-detection

**Potential risks:**
- Single-process Express server with no clustering or load balancing
- SQLite (WAL mode) works well for single-user but limits horizontal scaling
- Subprocess management (`mimo serve` / `mimo-cli`) adds operational complexity

---

## 2. Project Structure

```
mimoo/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── config/           # Environment & logger setup
│   │   ├── context/          # Memory/Brain system (the "Project Brain")
│   │   │   ├── agent/        # Memory Agent (LLM-driven memory updates)
│   │   │   ├── brain/        # Brain model, repository, patch applier
│   │   │   ├── observer/     # Heuristic signal detection
│   │   │   ├── providers/    # Memory provider abstraction
│   │   │   ├── queue/        # Debounced memory processing queue
│   │   │   └── suggestions/  # Knowledge suggestion approval system
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/        # Error handling, logging, CORS
│   │   ├── providers/        # AI provider abstraction (MiMo serve/CLI/API)
│   │   ├── routes/           # Express route definitions
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # Business logic layer
│   │   ├── storage/          # SQLite database + repositories
│   │   ├── types/            # Shared TypeScript types
│   │   └── index.ts          # Server entry point
│   └── data/                 # SQLite database files
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # 20 React components
│   │   ├── hooks/            # useChat (central state hook)
│   │   ├── utils/            # Translations, helpers
│   │   ├── api.ts            # HTTP client (all backend calls)
│   │   ├── types.ts          # Frontend type definitions
│   │   └── App.tsx           # Root component with routing
│   └── vite.config.ts        # Vite + TailwindCSS + React plugins
└── docs/                     # Documentation
```

---

## 3. Main Modules

### 3.1 Backend Modules

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **Server** | Express app setup, middleware chain, route mounting | `index.ts` |
| **Config** | Environment variables, logger setup | `config/env.ts`, `config/logger.ts` |
| **Routes** | HTTP endpoint definitions (8 route groups) | `routes/*.ts` |
| **Services** | Business logic (chat, session, project, model) | `services/*.ts` |
| **Providers** | AI backend abstraction (4 providers) | `providers/*.ts` |
| **Storage** | SQLite database, repositories, schema init | `storage/*.ts` |
| **Context** | Memory/Brain system — the most complex module | `context/**/*.ts` |
| **Middleware** | Error handling, request logging, CORS | `middleware/*.ts` |

### 3.2 Frontend Modules

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **App** | Root layout, sidebar, routing, theme | `App.tsx` |
| **useChat** | Central state hook — sessions, messages, streaming | `hooks/useChat.ts` |
| **API Client** | All HTTP/SSE calls to backend | `api.ts` |
| **ChatView** | Message display, streaming, scroll management | `components/ChatView.tsx` |
| **ChatInput** | Message input, model/agent selection | `components/ChatInput.tsx` |
| **Orb** | Animated status indicator (10 states) | `components/Orb.tsx` |
| **ExecutionCard** | Message rendering with events, artifacts, questions | `components/ExecutionCard.tsx` |

---

## 4. Data Flow

### 4.1 Chat Message Flow

```
User types message
    │
    ▼
useChat.handleExecuteCommand()
    │
    ├─► createSession() if new ──► POST /api/session
    │
    ├─► Optimistic UI update (add user + empty agent message)
    │
    └─► streamChat() ──► POST /api/chat/stream (SSE)
                            │
                            ▼
                     Backend: chatController
                            │
                            ├─► validate session exists
                            ├─► ensure project assignment
                            ├─► buildContextInjection() (Brain → AI)
                            ├─► persist user message
                            ├─► load conversation history
                            ├─► provider.sendMessageStream()
                            │       │
                            │       ├─► MimoServeProvider → HTTP to `mimo serve`
                            │       ├─► MimoCliProvider → spawn `mimo run`
                            │       └─► MiMoProvider → HTTP to API
                            │
                            ├─► SSE events forwarded to frontend
                            ├─► persist assistant message
                            └─► contextManager.afterExchange() (fire-and-forget)
                                    │
                                    ▼
                              MemoryObserver.evaluate()
                                    │ (heuristic check)
                                    ▼
                              MemoryQueue.enqueue()
                                    │ (debounced)
                                    ▼
                              MemoryAgent.run()
                                    │ (LLM call)
                                    ▼
                              PatchApplier.apply()
                                    ├─► State changes → immediate
                                    └─► Knowledge changes → Suggestion (pending approval)
```

### 4.2 Session Lifecycle

1. **Create**: Frontend calls `POST /api/session` → SQLite `sessions` row
2. **Load**: On mount, frontend calls `GET /api/session` → lists sessions with message counts
3. **Switch**: Frontend calls `GET /api/session/:id` → loads full message history
4. **Delete**: Frontend calls `DELETE /api/session/:id` → cascade-deletes messages (ON DELETE CASCADE)

### 4.3 Context Injection Flow

```
Build injection:
  ProjectBrainModel.load(projectId)
    → BrainRepository.findByProjectId() (SQLite)
    → brain.buildSummary() (compact text)
    → Prepend as system message to AI provider

Process after exchange:
  MemoryObserver.evaluate() (regex/keyword heuristic)
    → MemoryQueue.enqueue() (debounce 8s, coalesce)
    → MemoryAgent.run():
        1. Load brain
        2. Load recent messages (window of 12)
        3. Build prompt (brain + messages)
        4. Call MemoryProvider (LLM)
        5. Parse MemoryPatch (Zod-validated JSON)
        6. PatchApplier.apply():
           - State → immediate save
           - Knowledge → Suggestion (pending approval)
        7. Mirror to brain markdown file
```

---

## 5. Component Organization

### 5.1 Frontend Component Tree

```
App
├── Sidebar (desktop, expandable 84px → 240px)
├── RecentPanel (256px, session list)
├── MobileDrawer (full-screen overlay)
├── MainContent
│   ├── Header (theme toggle, breadcrumb)
│   └── ScreenSwitcher (AnimatePresence)
│       ├── HomeScreen
│       │   ├── Orb
│       │   ├── QuickActions
│       │   └── GoalsSystem
│       ├── ChatView
│       │   ├── Orb (in header)
│       │   ├── ExecutionCard[] (per message)
│       │   └── ChatInput
│       ├── DashboardSection
│       ├── SettingsSection
│       └── ProjectsSection
└── DeleteModal (confirmation dialog)
```

### 5.2 Design System

- **Color palette**: Custom CSS tokens — `neural-cyan`, `electric-blue`, `obsidian`, `titanium`
- **Typography**: Custom fonts — `font-heading` (display), `font-sans` (body), `font-mono` (code)
- **Animations**: Framer Motion (`motion/react`) for page transitions, panel animations
- **Layout**: TailwindCSS 4 with custom utilities, responsive (mobile-first)
- **Theming**: Dark/light mode via CSS class toggle (`.light` class on root)

---

## 6. State Management

### 6.1 Backend State

| State | Storage | Lifecycle |
|-------|---------|-----------|
| Sessions | SQLite `sessions` table | Persistent, cascade-deleted with project |
| Messages | SQLite `messages` table | Persistent, cascade-deleted with session |
| Projects | SQLite `projects` table | Persistent |
| Project Brain | SQLite `project_brain` table (JSON blobs) | Persistent, versioned |
| Suggestions | SQLite `brain_suggestions` table | Persistent, approval-gated |
| Provider instance | In-memory singleton (cached) | Application lifetime |
| Memory Queue | In-memory per-project queues | Application lifetime |

### 6.2 Frontend State

| State | Location | Notes |
|-------|----------|-------|
| `subjects` | `useChat` hook (useState) | Array of chat sessions with messages |
| `activeSubjectId` | `useChat` hook (useState) | Currently selected session |
| `sessionId` | `useChat` hook (useState) | Backend session UUID |
| `orbState` | `useChat` hook (useState) | Visual status indicator (10 states) |
| `isLoading` | `useChat` hook (useState) | Request in progress flag |
| `backendError` | `useChat` hook (useState) | Error message from backend |
| `activityLog` | `useChat` hook (useState) | Tool/step event history |
| `agent` | `useChat` hook (useState) | Current agent mode (build/plan/compose) |
| `model` | `useChat` hook (useState) | Current model ID |
| `models` | `useChat` hook (useState) | Available models list |
| `language` | `App` (useState) | "en" or "fa" |
| `theme` | `App` (useState) | "dark" or "light" |
| `activeView` | `App` (useState) | Current screen (Home/Chat/Projects/Settings) |

**Design decision:** All state lives in the `useChat` hook — no Redux/Zustand. This is a single-hook monolith that returns 15+ values.

**Potential risk:** The `useChat` hook is ~1060 lines with complex interleaved effects. It handles session management, streaming, optimistic updates, and error recovery in a single function. This makes it hard to test, debug, or extend.

---

## 7. AI Integration Architecture

### 7.1 Provider Abstraction

```typescript
interface AIProvider {
  readonly name: string;
  sendMessage(messages: ProviderMessage[], agent?: MiMoAgent, model?: string): Promise<ProviderResult>;
  healthCheck(): Promise<ProviderHealth>;
}
```

### 7.2 Provider Implementations

| Provider | Strategy | Best For |
|----------|----------|----------|
| `MimoServeProvider` | Spawns `mimo serve` subprocess, connects via SSE | Production (supports questions, streaming) |
| `MimoCliProvider` | Spawns `mimo run` per message | Fallback when serve unavailable |
| `MiMoProvider` | Direct HTTP to OpenAI-compatible API | When API key is configured |
| `MockProvider` | Returns canned responses | Development/testing |

**Auto-detection logic:**
1. If `AI_PROVIDER` env is set → use that
2. If `MIMO_API_KEY` is set → use `mimo` (direct API)
3. Otherwise → use `mimo-serve` (subprocess)

### 7.3 Agent Modes

The MiMo agent supports three modes, passed through to the AI provider:
- **`build`** (default) — Full tool access, file editing, shell commands
- **`plan`** — Read-only design mode, writes only to plan files
- **`compose`** — Multi-agent orchestration workflows

### 7.4 Streaming Architecture

```
Frontend                    Backend                     AI Provider
   │                           │                           │
   │── POST /api/chat/stream ──►                           │
   │                           │── sendMessageStream() ──► │
   │                           │                           │
   │◄── SSE: { type: "text" } ─│◄── onEvent(text) ────────│
   │◄── SSE: { type: "tool_use" } │◄── onEvent(tool) ──────│
   │◄── SSE: { type: "reasoning" } │◄── onEvent(reason) ───│
   │◄── SSE: { type: "question" } │◄── onEvent(question) ──│
   │◄── SSE: { type: "step_start" } │                      │
   │◄── SSE: { type: "step_finish" } │                     │
   │◄── SSE: { type: "error" } ─│                          │
   │                           │                           │
   │◄── (stream ends) ─────────│◄── session.idle ──────────│
```

### 7.5 Memory System (Context Manager)

The most architecturally complex subsystem:

```
┌─────────────────────────────────────────────────────────┐
│                   Context Manager                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Observer (heuristic)          Agent (LLM)               │
│  ├─ Regex signal detection     ├─ Brain + messages       │
│  ├─ No LLM calls               ├─ MemoryProvider call    │
│  └─ Confidence threshold       └─ MemoryPatch output     │
│                                                          │
│  Queue (debounce)              Brain (storage)           │
│  ├─ Per-project queues         ├─ State (auto-updated)   │
│  ├─ 8s debounce                ├─ Knowledge (gated)      │
│  └─ Mutex per project          └─ Suggestions (approval) │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Two-layer brain model:**
- **State** (auto-updated, ephemeral): current goal, task, file, next step, progress, tasks list, known issues
- **Knowledge** (confirmation-gated, permanent): overview, architecture decisions, tech choices, conventions, rules, user preferences

**Key design decisions:**
- State changes apply immediately
- Knowledge changes create pending `Suggestion` records (requires user approval)
- Memory updates are fire-and-forget (never block HTTP response)
- Debounced at 8 seconds with coalescing (burst = one update)
- Memory agent has 30-second timeout with graceful degradation

### 7.6 Memory Architecture: ProjectBrain vs. MiMoCode Native Memory

This app's ProjectBrain system and MiMoCode's native memory system (MEMORY.md, checkpoint.md, dream/distill) are **not duplicates** — they serve different scopes and are not interreachable under the current integration mode.

**Key facts (confirmed by direct investigation):**

1. **MiMoCode's native memory is NOT reachable via `mimo serve`'s HTTP API.** The serve API exposes session management, message passing, SSE events, and question handling — but zero memory-related endpoints (`/memory`, `/dream`, `/distill`, `/checkpoint` do not exist). Session creation does not accept a working directory parameter, so memory cannot be scoped to a project via HTTP.

2. **ProjectBrain is this app's sole project-memory mechanism** under the current serve-based integration approach. It stores structured state (current goal, tasks, progress) and knowledge (decisions, architecture, conventions, rules, user preferences) in SQLite, patch-applied via the MemoryAgent, and approval-gated via SuggestionService.

3. **The two systems operate in separate storage domains:** ProjectBrain writes to SQLite (`project_brain` table) and mirrors to `backend/data/project-brain/<projectId>/`. MiMoCode native memory writes to `~/.local/share/mimocode/memory/` (XDG data directory). They do not conflict.

4. **This conclusion should be revisited only if the app's integration mode changes** — for example, if it ever invokes MiMoCode via CLI (`mimo run`) instead of or alongside `mimo serve`, or if MiMoCode's serve API adds memory endpoints in the future.

> Full evidence and methodology documented in `docs/adr/003-sdk-memory-integration-findings.md`.

---

## 8. External Dependencies

### 8.1 Backend

| Package | Purpose | Version |
|---------|---------|---------|
| `express` | HTTP framework | ^4.21.0 |
| `better-sqlite3` | SQLite driver (synchronous) | ^11.3.0 |
| `zod` | Schema validation | ^3.23.8 |
| `pino` | Structured logging | ^9.4.0 |
| `uuid` | UUID generation | ^10.0.0 |
| `cors` | CORS middleware | ^2.8.5 |
| `dotenv` | Environment variable loading | ^16.4.5 |

### 8.2 Frontend

| Package | Purpose | Version |
|---------|---------|---------|
| `react` / `react-dom` | UI framework | ^19.0.1 |
| `vite` | Build tool + dev server | ^6.2.3 |
| `tailwindcss` | Utility-first CSS | ^4.1.14 |
| `motion` (Framer Motion) | Animations | ^12.23.24 |
| `lucide-react` | Icon library | ^0.546.0 |
| `@google/genai` | Google GenAI SDK (unused?) | ^2.4.0 |
| `express` | Listed in frontend deps (unusual) | ^4.21.2 |

**Potential risks:**
- `@google/genai` is in frontend dependencies but appears unused — dead dependency
- `express` in frontend `package.json` is unusual and may indicate a leftover from an earlier architecture
- No test framework in either package.json (no jest, vitest, mocha, etc.)

---

## 9. Configuration

### 9.1 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3001 | Backend server port |
| `NODE_ENV` | development | Environment mode |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:5173` | Allowed origins |
| `LOG_LEVEL` | info | Pino log level |
| `DATABASE_PATH` | `./data/mimo.db` | SQLite database path |
| `AI_PROVIDER` | auto-detect | Provider selection |
| `MIMO_API_KEY` | (empty) | API key for direct API |
| `MIMO_BASE_URL` | `https://api.siliconflow.cn/v1` | API base URL |
| `MIMO_MODEL` | `Qwen/Qwen3-8B` | Default model |
| `CONTEXT_MANAGER_ENABLED` | true | Enable memory/brain system |
| `MEMORY_PROVIDER` | `chat-adapter` | Memory provider |
| `MEMORY_MODEL` | (empty) | Model for memory operations |
| `MEMORY_DEBOUNCE_MS` | 8000 | Memory update debounce |
| `MEMORY_WINDOW_SIZE` | 12 | Recent messages for memory |
| `MIMO_DEBUG` | false | Debug logging |
| `MIMO_SERVE_PORT` | 0 (auto) | Port for mimo serve |
| `MIMO_SERVER_PASSWORD` | (empty) | Auth for mimo serve |

### 9.2 Database Schema

```sql
projects          sessions          messages          project_brain       brain_suggestions
─────────         ─────────         ─────────         ───────────         ─────────────────
id (PK)           id (PK)           id (PK)           projectId (PK)      id (PK)
name              projectId (FK)    sessionId (FK)    version             projectId (FK)
status            createdAt         role              state (JSON)        target
createdAt                           content           knowledge (JSON)    section
updatedAt                          createdAt                             operation
                                                                        value (JSON)
                                                                        reason
                                                                        status
                                                                        createdAt
                                                                        resolvedAt
```

### 9.3 Frontend Configuration

- Vite config: React + TailwindCSS plugins, optional HMR disable via `DISABLE_HMR` env
- API base URL hardcoded to `http://localhost:3001/api` in `api.ts`
- Supported languages: English (`en`) and Farsi/Persian (`fa`)
- RTL layout support when Farsi is selected

---

## 10. Build and Deployment Structure

### 10.1 Build Commands

**Backend:**
```bash
npm run dev      # ts-node-dev with hot reload
npm run build    # tsc → dist/
npm start        # node dist/index.js
npm run lint     # eslint
```

**Frontend:**
```bash
npm run dev      # vite dev server on port 3000
npm run build    # vite build → dist/
npm run preview  # vite preview
npm run lint     # tsc --noEmit
```

### 10.2 Deployment Model

- **Current:** Development/desktop only — no containerization, no CI/CD config
- **Database:** Local SQLite file at `./data/mimo.db`
- **AI Backend:** Depends on locally installed `mimo` CLI binary or external API
- **Process management:** Single Node.js process with graceful shutdown handlers

### 10.3 Binary Detection

The `MimoCliProvider` and `MimoServeProvider` both contain elaborate binary detection logic:

1. Check `%APPDATA%\npm\node_modules\@mimo-ai` (global npm)
2. Check NVM symlink paths for each Node version
3. Run `npm root -g` and look for the binary
4. Fall back to bare `mimo` on PATH

**Risk:** This is Windows-specific path logic. Cross-platform support would require significant refactoring.

---

## Summary of Key Architectural Observations

### Strengths

1. **Clean provider abstraction** — The `AIProvider` interface enables swapping backends without touching business logic
2. **Sensible memory architecture** — The observer/agent/brain/patch-applier pipeline is well-layered
3. **Real-time streaming** — SSE-based streaming with granular event types (tool use, reasoning, questions)
4. **Graceful degradation** — Memory provider falls back to no-update patches on failure
5. **SQLite with WAL** — Good choice for a desktop app (no external DB server needed)

### Risks

1. **No tests** — Neither backend nor frontend has any test infrastructure
2. **Monolithic useChat hook** — 1060 lines handling all chat state in one function
3. **Hardcoded API URL** — Frontend hardcodes `localhost:3001` with no environment-based override
4. **No authentication** — Admin routes only disabled in production via env check, no real auth
5. **Windows-only binary detection** — Provider code has hardcoded Windows paths
6. **Dead dependencies** — `@google/genai` and `express` in frontend appear unused
7. **No CI/CD** — No GitHub Actions, Dockerfile, or deployment pipeline
8. **No error boundaries** — React error boundaries missing at component level
9. **No rate limiting** — API endpoints have no rate limiting or request throttling
10. **Subprocess management** — `mimo serve` lifecycle management is fragile (timeout-based, signal-based)
