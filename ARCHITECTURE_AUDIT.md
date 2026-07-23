# Architecture Audit — MiMo Desktop

> Audit Date: 2026-07-23  
> Scope: `frontend/src/` + `backend/src/` (all production code)  
> Method: Full file-by-file review of every source file

---

## Audit Summary

| Category | Score | Critical Issues |
|----------|-------|-----------------|
| Separation of Concerns | 4/10 | `useChat` is a 1060-line god hook; `SettingsSection` mixes business logic, API calls, and localStorage |
| Coupling | 3/10 | Frontend components import from other components; `ChatInput` and `HomeScreen` duplicate the entire input UI |
| Reusability | 3/10 | Input form is copy-pasted in 2 places; `AGENT_LABELS` duplicated; toggle switch duplicated 4x |
| Abstraction Quality | 5/10 | Backend has clean provider pattern; frontend has almost no abstraction layers |
| Maintainability | 4/10 | `useChat` untestable; SettingsSection at 637 lines; Orb.tsx at 495 lines of raw canvas math |
| Type Safety | 5/10 | Types defined in 3 places (types.ts, api.ts, backend types); `any` used liberally |
| Scalability | 5/10 | Backend good (SQLite WAL, stateless routes); frontend state would collapse at scale |
| Naming Conventions | 6/10 | Mostly consistent; some inconsistencies in backend file naming (camelCase vs PascalCase) |

---

## Issue #1: God Hook — `useChat`

**File:** `frontend/src/hooks/useChat.ts` (1059 lines)

### Current Situation
`useChat` is a single custom hook that manages ALL chat state: session creation, session switching, session loading, message sending, streaming event parsing, activity log management, model/agent selection, optimistic UI updates, error handling, abort controller management, and subject (conversation) CRUD. It returns 20+ values and setters.

### Why It Is Problematic
- **Untestable**: A 1060-line function with 15 `useState` calls, 4 `useEffect` blocks, 6 `useCallback` blocks, and interleaved async logic cannot be unit-tested
- **Single-responsibility violation**: This hook is simultaneously a session manager, message store, streaming client, UI state container, and API client orchestrator
- **Cascade of re-renders**: Every state setter triggers a re-render; the hook has no memoization strategy beyond `useCallback` on handlers
- **Modification danger**: Changing streaming behavior risks breaking session switching; changing session loading risks breaking message persistence
- **No separation between UI state and server state**: Server-derived data (sessions, messages) is mixed with UI-only state (orbState, isLoading, activityLog)

### Impact
Any change to chat behavior requires navigating and understanding 1060 lines of interleaved concerns. There is no way to test streaming independently, no way to mock sessions independently, and no way to add features (e.g., message editing, reactions) without further bloating this hook.

### Recommended Architecture
Split into 4 focused hooks:

```
useChatStore        — manages Subject[], activeSubjectId, derived messages
useSessionSync      — handles backend session CRUD (create, load, delete, list)
useChatStreaming     — handles SSE streaming, event parsing, abort control
useChatModels       — handles model/agent loading and persistence
```

### Migration Plan
1. Extract `useChatModels` (model list loading, model setter, agent state) — pure state, no side effects beyond one API call
2. Extract `useSessionSync` (listSessions, loadSessionMessages, createSession, deleteSession) — all backend calls for sessions
3. Extract `useChatStreaming` (handleExecuteCommand streaming logic, event parsing, activity log) — the largest chunk
4. Refactor `useChatStore` to be a thin coordinator that composes the above 3 hooks
5. Each hook should be independently testable with mock API clients

---

## Issue #2: Duplicated Input Form

**Files:**
- `frontend/src/components/HomeScreen.tsx:248-302` (input form)
- `frontend/src/components/ChatInput.tsx:135-200` (input form)

### Current Situation
The chat input form — including the input field, submit button, voice toggle, agent selector, and model selector — is implemented **twice** with near-identical markup. `HomeScreen` has its own inline input (lines 248-302) while `ChatInput` is a separate component with the same structure. Both have:
- Identical `handleSubmit` / `handleKeyDown` / `toggleVoice` functions
- Identical input styling (`bg-[#0F0F0F]/65 backdrop-blur-2xl border border-white/10 rounded-2xl`)
- Identical voice toggle button styling
- Identical submit button styling

### Why It Is Problematic
- Any change to the input UI (styling, behavior, accessibility) must be duplicated
- The `HomeScreen` version is missing model/agent selection that `ChatInput` has
- `HomeScreen` duplicates `AGENT_LABELS` and placeholder arrays

### Impact
Maintenance burden: two code paths to keep in sync. Feature inconsistency: HomeScreen input lacks model selection.

### Recommended Architecture
Extract a single `MessageInput` component that both `HomeScreen` and `ChatView` consume. `MessageInput` should accept:
- `onSubmit: (text: string) => void`
- `isLoading: boolean`
- `language: "en" | "fa"`
- Optional: `agent`, `setAgent`, `model`, `setModel`, `models`, `modelsLoading` (hidden when not provided)

### Migration Plan
1. Create `MessageInput.tsx` extracting the common form from `ChatInput.tsx`
2. Make agent/model selectors conditional (render only when props provided)
3. Replace `HomeScreen`'s inline input (lines 248-302) with `<MessageInput>`
4. Replace `ChatInput`'s form with `<MessageInput>`
5. Delete `ChatInput.tsx` (now redundant)

---

## Issue #3: Toggle Switch Duplicated 4 Times

**Files:**
- `frontend/src/components/SettingsSection.tsx:362-372` (reasoning mode toggle)
- `frontend/src/components/SettingsSection.tsx:533-543` (desktop notifications toggle)
- `frontend/src/components/SettingsSection.tsx:553-563` (email digests toggle)

### Current Situation
The toggle switch is a 10-line component that is copy-pasted 3+ times within `SettingsSection.tsx`, each time with the exact same structure:
```tsx
<button onClick={...} className={`w-11 h-6 rounded-full p-0.5 ${active ? "bg-neural-cyan" : "bg-white/10"}`}>
  <div className={`w-5 h-5 bg-black rounded-full ${active ? "translate-x-5" : "translate-x-0"}`} />
</button>
```

### Why It Is Problematic
- Identical visual + behavioral code in 3+ places
- RTL handling (`isRtl ? "-translate-x-0" : "translate-x-5"`) is duplicated each time
- No shared component means toggling animation, size, or color requires editing every instance

### Impact
Low severity but high annoyance factor. Any toggle design change requires 3+ edits.

### Recommended Architecture
Create a `Toggle` component:
```tsx
<Toggle checked={boolean} onChange={(v) => void} disabled?: boolean />
```

### Migration Plan
1. Create `components/ui/Toggle.tsx`
2. Replace the 3 inline toggles in `SettingsSection.tsx` with `<Toggle>`
3. (Optional) Extract other repeated UI atoms: `TabButton`, `SettingRow`, `SectionHeader`

---

## Issue #4: SettingsSection is a 637-Line Monolith

**File:** `frontend/src/components/SettingsSection.tsx` (637 lines)

### Current Situation
`SettingsSection.tsx` contains:
- 143-line inline translation object (`settingsTranslations`)
- 6-tab navigation with 6 different tab content panels
- API key management with `localStorage` reads/writes
- 12+ `useState` calls for form state
- An API call to `setApiKey` (dynamic import of `../api`)
- 5 mock skills with inline translation
- Toggle switches, selects, and input fields all inline

### Why It Is Problematic
- The inline `settingsTranslations` duplicates the translation pattern used in `utils/translations.ts` but as a separate object, creating two translation systems
- The component mixes: UI layout, form state, API calls, localStorage persistence, and i18n
- Each tab (general, ai, skills, notifications, privacy, connected) is a self-contained mini-application, but all share one component

### Impact
Extremely hard to modify any single settings tab without risking regressions in others. The localStorage + API dual-persistence pattern for API keys is fragile.

### Recommended Architecture
1. Move `settingsTranslations` into `utils/translations.ts` (single translation system)
2. Split each tab into its own component: `GeneralTab`, `AiPreferencesTab`, `SkillsTab`, `NotificationsTab`, `PrivacyTab`, `ConnectedTab`
3. Extract `useSettings` hook for form state + localStorage + API sync
4. `SettingsSection` becomes a thin shell: tab navigation + active tab render

### Migration Plan
1. Merge `settingsTranslations` keys into the main `TranslationSet` interface
2. Extract `GeneralTab`, `AiPreferencesTab`, etc. as separate components
3. Create `useSettings` hook managing all form state
4. Reduce `SettingsSection.tsx` to ~50 lines

---

## Issue #5: Backend Types Defined in Three Places

**Files:**
- `backend/src/types/index.ts` — core types (Message, Session, ProviderMessage, etc.)
- `backend/src/context/types.ts` — brain/memory types (BrainState, BrainKnowledge, MemoryPatch, etc.)
- `frontend/src/types.ts` — frontend-specific types (OrbState, Message, Subject, etc.)
- `frontend/src/api.ts` — duplicate API types (ApiSession, ApiMessage, ChatResponse, etc.)

### Current Situation
`Message` is defined in `backend/src/types/index.ts` as:
```typescript
interface Message { id, sessionId, role, content, createdAt }
```
And in `frontend/src/types.ts` as:
```typescript
interface Message { id, sender, text, timestamp, events, artifacts, ... }
```
And in `frontend/src/api.ts` as:
```typescript
interface ApiMessage { id, sessionId, role, content, createdAt }
```

The backend `Message` and the frontend `ApiMessage` are the same thing but defined separately. The frontend `Message` is a different type entirely (UI representation).

Similarly, `ChatResponse` is defined in both `backend/src/types/index.ts` and `frontend/src/api.ts`.

### Why It Is Problematic
- If the backend adds a field, both backend types AND frontend api.ts types must be updated manually
- No shared contract — frontend and backend can silently diverge
- The frontend `Message` type conflates database shape with UI shape

### Impact
Type drift between frontend and backend. New fields can be missed. No compile-time guarantee of API contract correctness.

### Recommended Architecture
1. Create a shared `types/` directory at the project root with API contract types
2. Backend: import from shared types; frontend: import from shared types
3. Frontend `Message` (UI type) remains separate from API types
4. Consider `openapi-typescript` or similar for auto-generated API types

### Migration Plan
1. Create `shared/types/api.ts` with `ApiMessage`, `ApiSession`, `ChatResponse`, `ApiError`
2. Backend: re-export from shared types or import directly
3. Frontend `api.ts`: import shared types instead of re-declaring
4. Frontend `types.ts`: keep `Message` (UI type) but alias the API type separately

---

## Issue #6: DashboardSection Makes API Calls Directly

**File:** `frontend/src/components/DashboardSection.tsx:46-49`

### Current Situation
```tsx
useEffect(() => {
  listProjects()
    .then(setApiProjects)
    .catch(() => {});
}, []);
```

`DashboardSection` directly calls `listProjects()` from `api.ts` inside a `useEffect`, managing its own `apiProjects` state. It also accepts `projects` as a prop (which appears to always be `[]`), creating two sources of truth for projects.

### Why It Is Problematic
- Components should not contain business logic or direct API calls
- The `projects` prop is always `[]` (see `App.tsx:373`), making it dead code
- The `onNavigate` prop is typed as `(view: any) => void` — using `any` for a navigation enum
- `subjects` is typed as `any[]` — no type safety

### Impact
Untestable component (requires mocking the entire API). Confusion about where project data comes from (prop vs API call).

### Recommended Architecture
Move the API call into a custom hook `useProjects()` or into the parent component. Components should receive fully resolved data via props.

### Migration Plan
1. Create `useProjects` hook (or add to a new `useProjects` service hook)
2. Pass resolved projects as a typed prop to `DashboardSection`
3. Remove `listProjects()` call from component
4. Type `subjects` as `Subject[]` instead of `any[]`

---

## Issue #7: Orb.tsx Contains 495 Lines of Raw Canvas Rendering

**File:** `frontend/src/components/Orb.tsx` (495 lines)

### Current Situation
`Orb.tsx` is a single component that:
- Initializes a 3D particle system (280 particles in spherical coordinates)
- Implements per-state color/speed/jitter/gravity parameter configs
- Runs a `requestAnimationFrame` render loop with perspective projection
- Handles mouse interaction with magnetic distortion
- Renders web connections, HUD rings, listening waveforms
- Has duplicated background gradient configs in JSX (lines 434-444, duplicating the canvas params)
- Has a floating status chip with another duplicated color map (lines 478-488)

### Why It Is Problematic
- The color map is defined 3 separate times: in canvas params (lines 77-191), in the background div (lines 434-444), and in the status chip dot (lines 478-488)
- Adding a new `OrbState` requires updating all 3 locations
- The entire particle system, render loop, and mouse handling are in one component — untestable and un-reusable
- The canvas ID `id="mimo-canvas-orb"` is hardcoded — only one Orb can exist on a page

### Impact
Maintenance nightmare: 3 separate color definitions that must stay in sync. Performance risk: the render loop runs even when the Orb is off-screen.

### Recommended Architecture
1. Extract `orbParams` config into a separate file: `config/orbParams.ts`
2. Extract particle system into `lib/particleSystem.ts`
3. Extract render loop into `lib/orbRenderer.ts`
4. Remove the 3 duplicated color maps and use the single config
5. Use `IntersectionObserver` to pause rendering when off-screen

### Migration Plan
1. Create `config/orbParams.ts` exporting the per-state parameter config
2. Create `lib/particleSystem.ts` with particle initialization and update logic
3. Create `lib/orbRenderer.ts` with the canvas rendering functions
4. `Orb.tsx` becomes a thin component (~100 lines) that initializes the system and manages lifecycle
5. Remove hardcoded `id` attribute

---

## Issue #8: No Validation on Stream Endpoint

**File:** `backend/src/controllers/chatController.ts:33-192`

### Current Situation
The `streamMessage` controller manually validates `sessionId` and `userContent` at line 46-48, but:
- Does NOT use the Zod `chatSchema` defined in `schemas/index.ts`
- Does NOT validate the `agent` parameter (any string accepted)
- Does NOT validate the `model` parameter
- Casts `req.body` properties with `as` instead of validation: `const sessionId = req.body.sessionId as string`

Meanwhile, the non-streaming `sendMessage` controller (line 13-30) delegates entirely to `chatService.sendMessage` which uses the chat schema through... actually, it doesn't either. `chatService.sendMessage` receives already-cast parameters.

The `chatSchema` in `schemas/index.ts` is defined but **never used by any route or controller**. It validates `sessionId` as UUID, `message` as string (max 8000), and `agent` as enum — but no route middleware applies it.

### Why It Is Problematic
- Zod schemas exist but are dead code — no request validation occurs
- Invalid input (wrong types, missing fields, oversized messages) reaches business logic
- The `model` field has no validation at all — could be any arbitrary string passed to the AI provider

### Impact
Security risk: unvalidated input reaching the AI provider. Reliability risk: malformed requests cause cryptic errors deep in the provider layer.

### Recommended Architecture
Apply Zod validation as Express middleware on all routes:
```typescript
app.post('/api/chat', validate(chatSchema), chatController.sendMessage);
app.post('/api/chat/stream', validate(chatStreamSchema), chatController.streamMessage);
```

### Migration Plan
1. Create a `validate` middleware (already exists at `middleware/validate.ts` — wire it up)
2. Add `chatStreamSchema` to `schemas/index.ts` (includes `model` field)
3. Apply validation middleware to route definitions in `routes/chatRoutes.ts`
4. Remove manual `as` casts from controllers
5. Remove redundant `if (!sessionId || !userContent)` checks

---

## Issue #9: Provider Casting with `as any`

**Files:**
- `backend/src/controllers/chatController.ts:96`: `const provider = getProvider() as any`
- `backend/src/controllers/sessionController.ts:74`: `const provider = getProvider() as any`
- `backend/src/index.ts:59`: `const provider = getProvider() as any`
- `backend/src/controllers/sessionController.ts:75,94,115`: `if (typeof provider.listSessions !== 'function')`

### Current Situation
Controllers cast the provider to `any` to access methods (`sendMessageStream`, `listSessions`, `exportSession`, `deleteSession`) that are NOT part of the `AIProvider` interface. They then use `typeof` runtime checks to determine capability.

### Why It Is Problematic
- The `AIProvider` interface only declares `sendMessage`, `name`, and `healthCheck`
- Additional capabilities (streaming, session management, export) are accessed via `any` casts
- TypeScript cannot catch errors in these calls
- Each provider implements a different subset of these undeclared methods

### Impact
Type safety is completely bypassed for provider interaction. Adding a new provider requires knowledge of undocumented methods scattered across controllers.

### Recommended Architecture
Expand the `AIProvider` interface (or create `ExtendedAIProvider`) to include optional methods:
```typescript
interface AIProvider {
  readonly name: string;
  sendMessage(...): Promise<ProviderResult>;
  healthCheck(): Promise<ProviderHealth>;
  
  // Optional capabilities
  sendMessageStream?(...): Promise<void>;
  listSessions?(): Promise<SessionInfo[]>;
  exportSession?(id: string): Promise<ExportedSession>;
  deleteSession?(id: string): Promise<void>;
}
```

### Migration Plan
1. Extend `AIProvider` interface with optional methods
2. Create typed capability-check helper: `function hasStreaming(p: AIProvider): p is AIProvider & { sendMessageStream: Function }`
3. Remove all `as any` casts from controllers
4. Replace `typeof provider.xxx !== 'function'` with typed capability checks

---

## Issue #10: Frontend has Dead/Unused Components

**Files:**
- `frontend/src/components/Workspace.tsx`
- `frontend/src/components/MemorySystem.tsx`
- `frontend/src/components/SkillsStore.tsx`
- `frontend/src/components/McpMarketplace.tsx`
- `frontend/src/components/IntegrationsSection.tsx`
- `frontend/src/components/GoalsSystem.tsx`
- `frontend/src/components/AutomationsSection.tsx`
- `frontend/src/components/AgentsSection.tsx`
- `frontend/src/components/ProjectsSection.tsx`
- `frontend/src/components/OrbIndicator.tsx`

### Current Situation
The `frontend/src/components/` directory has 20 components. Of these, approximately 10 are either:
- **Never imported** by `App.tsx` or any parent component (the component exists but is not in the render tree)
- **Imported but not rendered** (referenced in imports but not in JSX)

Components like `Workspace`, `MemorySystem`, `SkillsStore`, `McpMarketplace`, `AutomationsSection`, `AgentsSection` are present in the filesystem but the `App.tsx` only renders: `HomeScreen`, `ChatView`, `DashboardSection`, `SettingsSection`.

### Why It Is Problematic
- Dead code increases bundle size and cognitive load
- `ActiveView` enum has 8 values (Home, Chat, Projects, Workspace, Automations, Memory, Integrations, Settings) but only 4 are handled in the view switcher
- These components may have stale dependencies or broken imports

### Impact
~50% of the frontend component code is dead weight. New developers waste time reading components that are not used.

### Recommended Architecture
Either:
1. Delete the unused components entirely, OR
2. Complete the implementation by wiring them into the router

### Migration Plan
1. Grep all `*.tsx` files for each component name to confirm usage
2. If unused: delete files, remove from `ActiveView` enum, remove from sidebar menu items
3. If planned for future: move to a `components/_draft/` directory with a README explaining they are WIP

---

## Issue #11: No Component-Level Abstractions (No UI Primitives)

### Current Situation
The codebase has zero shared UI primitives. Every component rebuilds common patterns from scratch:
- **Toggle switches**: built inline 4+ times (see Issue #3)
- **Tab navigation**: built inline in `SettingsSection`
- **Card containers**: `bg-white/[0.02] border border-white/5 rounded-2xl` repeated 20+ times
- **Section headers**: `text-xs font-mono text-neural-cyan uppercase tracking-wider` repeated 10+ times
- **Status badges**: `text-[9px] font-mono px-2 py-0.5 rounded-md border uppercase` repeated 5+ times
- **Animated backgrounds**: `bg-neural-cyan/4 rounded-full filter blur-[120px] pointer-events-none` repeated in every screen

### Why It Is Problematic
- No design system — every component invents its own styling
- Changing a design token (e.g., card border radius) requires editing every instance
- No consistency guarantee between screens

### Impact
Visual drift between screens. High effort for design changes. No single source of truth for design tokens.

### Recommended Architecture
Create a `components/ui/` directory with primitives:
```
components/ui/
├── Card.tsx          — reusable card container
├── Badge.tsx         — status badges
├── Toggle.tsx        — toggle switch
├── Tabs.tsx          — tab navigation
├── SectionHeader.tsx — section header with icon
├── AmbientGlow.tsx   — background glow effect
└── index.ts          — barrel exports
```

### Migration Plan
1. Create `components/ui/` directory
2. Extract `Card`, `Badge`, `Toggle`, `Tabs`, `SectionHeader`, `AmbientGlow`
3. Replace inline usages across components (one component at a time)
4. Centralize design tokens in `tailwind.config.ts` or CSS variables

---

## Issue #12: `SettingsSection` Has Dual Translation System

**Files:**
- `frontend/src/utils/translations.ts` — main translation system
- `frontend/src/components/SettingsSection.tsx:22-143` — inline `settingsTranslations`

### Current Situation
`SettingsSection` defines its own 120-line translation object (`settingsTranslations`) with `en` and `fa` keys, completely separate from the main `translations` object in `utils/translations.ts`. The main `translations` has ~80 keys; `settingsTranslations` has ~60 additional keys.

### Why It Is Problematic
- Two parallel translation systems must be maintained
- The `TranslationSet` interface in `translations.ts` does not include settings keys
- Adding a new settings translation requires editing the component file, not the translation file
- Inconsistent: some settings text uses `st.title` (from settingsTranslations) while navigation labels use `t.settings` (from main translations)

### Impact
Translation maintenance burden doubled. Risk of missing translations when adding new languages.

### Recommended Architecture
Merge all settings translations into `utils/translations.ts`. The `TranslationSet` interface should be the single source of truth for ALL UI text.

### Migration Plan
1. Move all `settingsTranslations.en` keys into `translations.en` (prefixed with `settings.`)
2. Move all `settingsTranslations.fa` keys into `translations.fa`
3. Update `TranslationSet` interface to include settings keys
4. Replace `const st = settingsTranslations[language]` with `const st = translations[language].settings`
5. Delete `settingsTranslations`

---

## Issue #13: `index.html` Title is Wrong

**File:** `frontend/index.html:7`

### Current Situation
```html
<title>My Google AI Studio App</title>
```

The application is called "MiMo Desktop" (per `README.md` and all UI text) but the HTML title says "My Google AI Studio App".

### Why It Is Problematic
This is a leftover from a template or scaffold. It shows up in browser tabs and bookmarks.

### Impact
Unprofessional appearance. Confuses users.

### Recommended Architecture
Change to `<title>MiMo Desktop</title>`.

### Migration Plan
1. Edit `frontend/index.html` line 7
2. Change `<title>My Google AI Studio App</title>` to `<title>MiMo Desktop</title>`

---

## Issue #14: Hardcoded API Base URL

**File:** `frontend/src/api.ts:1`

### Current Situation
```typescript
const API_BASE = 'http://localhost:3001/api';
```

The backend URL is hardcoded. There is no environment variable, no Vite `import.meta.env`, and no configuration mechanism to change it.

### Why It Is Problematic
- Cannot deploy frontend to a different host
- Cannot use different backend ports without code changes
- CORS must always allow `localhost:3001` — no flexibility

### Impact
Blocks deployment to any non-localhost environment.

### Recommended Architecture
Use Vite's environment variable system:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

### Migration Plan
1. Add `VITE_API_BASE_URL` to `frontend/.env.example`
2. Replace hardcoded URL with env var reference
3. Set default to `http://localhost:3001/api` for local dev

---

## Issue #15: `DashboardSection` Uses `any` Types Extensively

**File:** `frontend/src/components/DashboardSection.tsx:26-29`

### Current Situation
```typescript
interface DashboardSectionProps {
  onNavigate: (view: any) => void;
  subjects: any[];
  projects: any[];
  // ...
}
```

Both `subjects` and `projects` are typed as `any[]`. The `onNavigate` function accepts `any` instead of the `ActiveView` enum.

### Why It Is Problematic
- No compile-time checking for navigation targets
- No type checking for subject/project properties
- The `projects` prop is always `[]` (dead code)

### Impact
Refactoring navigation or data shapes produces no compile errors — bugs only found at runtime.

### Recommended Architecture
Type all props correctly:
```typescript
interface DashboardSectionProps {
  onNavigate: (view: ActiveView) => void;
  subjects: Subject[];
  orbState: OrbState;
}
```

### Migration Plan
1. Import `ActiveView`, `Subject` from `types.ts`
2. Type `onNavigate` as `(view: ActiveView) => void`
3. Type `subjects` as `Subject[]`
4. Remove `projects` prop (always `[]`)

---

## Issue #16: Backend File Naming Inconsistency

**Files:**
- `backend/src/middleware/errors.ts` — lowercase (correct for modules)
- `backend/src/middleware/errorHandler.ts` — camelCase
- `backend/src/middleware/requestLogger.ts` — camelCase
- `backend/src/middleware/validate.ts` — lowercase
- `backend/src/providers/MiMoProvider.ts` — PascalCase (class)
- `backend/src/providers/MimoCliProvider.ts` — PascalCase (class)
- `backend/src/providers/MimoServeProvider.ts` — PascalCase (class)
- `backend/src/providers/README.md` — uppercase

### Current Situation
File naming is mostly consistent (camelCase for modules, PascalCase for class files), but there are minor inconsistencies:
- `MiMoProvider` (capital M) vs `MimoCliProvider` (lowercase m) — different casing for the same brand name
- Some middleware files are camelCase, some are lowercase
- The `schemas/` directory has a single `index.ts` — could be organized better

### Why It Is Problematic
- `MiMo` vs `Mimo` inconsistency in file names causes confusion
- When importing, developers must remember which casing each file uses

### Impact
Low — mostly a cosmetic/convention issue. But it suggests the codebase lacks a style guide.

### Recommended Architecture
Adopt a consistent convention:
- Files exporting a class: PascalCase (`MimoServeProvider.ts`)
- Files exporting functions/objects: camelCase (`chatService.ts`, `sessionRepository.ts`)
- Always use `Mimo` (not `MiMo`) for the brand name in file names

### Migration Plan
1. Rename `MiMoProvider.ts` → `MimoProvider.ts`
2. Update all imports referencing the old name
3. Document the naming convention in a contributing guide

---

## Issue #17: `chatController.streamMessage` Duplicates Business Logic

**File:** `backend/src/controllers/chatController.ts:33-192`

### Current Situation
The streaming controller (`streamMessage`) re-implements business logic that already exists in `chatService.sendMessage`:
- Session validation (line 52-56)
- Project assignment (line 59)
- Context injection (line 62)
- History trimming (line 78-79)
- User message persistence (line 91-93)
- Provider call (line 102 or 164)
- Assistant message persistence (line 143 or 171)
- Memory update (line 150 or 176)

This is 160 lines of business logic in a controller, while `chatService.sendMessage` (110 lines) does the same thing for non-streaming.

### Why It Is Problematic
- Business logic lives in controllers (should be in services)
- Two code paths (streaming vs non-streaming) that must be kept in sync
- If session validation logic changes, both must be updated

### Impact
Bug risk: changes to one path may not be reflected in the other. The controller is 194 lines when it should be ~30 lines of thin delegation.

### Recommended Architecture
Create a `chatService.streamMessage` that mirrors the non-streaming version but accepts an `onEvent` callback. Controllers should only handle HTTP concerns (parsing request, setting headers, writing SSE).

### Migration Plan
1. Create `chatService.streamMessage(sessionId, content, agent, model, onEvent)` in `chatService.ts`
2. Move all business logic from controller into service
3. Controller becomes: parse request → call service → service handles everything
4. Non-streaming `sendMessage` can potentially delegate to `streamMessage` with a collecting callback

---

## Issue #18: Missing `strict` Mode in Frontend TypeScript

**File:** `frontend/tsconfig.json`

### Current Situation
The frontend `tsconfig.json` does not enable `strict: true`. It uses:
- `skipLibCheck: true` — skips type checking of `.d.ts` files
- `noEmit: true` — correct for Vite
- But no `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.

Meanwhile, the backend `tsconfig.json` has `strict: true`.

### Why It Is Problematic
- Frontend code can have implicit `any` types, null access without checks, and loose typing
- The `any` types in `DashboardSection` would be caught by stricter settings
- Inconsistency between backend (strict) and frontend (loose)

### Impact
TypeScript provides less value in the frontend. Bugs that could be caught at compile time slip through.

### Recommended Architecture
Enable `strict: true` in frontend `tsconfig.json`.

### Migration Plan
1. Add `"strict": true` to `frontend/tsconfig.json`
2. Fix all resulting type errors (预计 30-50 errors)
3. Add `noUncheckedIndexedAccess: true` for extra safety

---

## Issue #19: No Error Boundaries in React

### Current Situation
The React component tree has zero error boundaries. If any component throws during render:
- The entire app crashes to a white screen
- No error UI, no recovery, no logging
- The backend keeps running but the frontend is dead

### Why It Is Problematic
- A rendering error in `ExecutionCard` (processing a malformed message) crashes the entire chat view
- A canvas error in `Orb.tsx` (WebGL not supported) crashes the entire page
- No way to recover without a full page reload

### Impact
Fragile user experience. Any rendering bug is a total outage.

### Recommended Architecture
Add error boundaries at key levels:
1. `App` level — catch catastrophic errors, show "Something went wrong" screen
2. `ChatView` level — catch errors in message rendering, show fallback for failed messages
3. `Orb` level — catch canvas errors, show static fallback

### Migration Plan
1. Create `components/ErrorBoundary.tsx` (class component with `componentDidCatch`)
2. Wrap `App` in `<ErrorBoundary>`
3. Wrap `<ChatView>` in `<ErrorBoundary>`
4. Wrap `<Orb>` in `<ErrorBoundary fallback={<OrbFallback />}>`

---

## Issue #20: `env.ts` Missing Variables from `.env.example`

**Files:**
- `backend/src/config/env.ts`
- `backend/.env.example`

### Current Situation
The `.env.example` does not include `MIMO_DEBUG`, `MIMO_SERVE_PORT`, or `MIMO_SERVER_PASSWORD` — all of which are read by `env.ts`. Conversely, `env.ts` reads `MIMO_BASE_URL` with a default of `https://api.siliconflow.cn/v1`, while `.env.example` says `https://api.xiaomi.com/v1`. The default model also differs: `env.ts` defaults to `Qwen/Qwen3-8B` while `.env.example` says `MiMo-7B-RL`.

### Why It Is Problematic
- `.env.example` is supposed to be the documentation of available config — it's incomplete and inaccurate
- Developers copying `.env.example` get wrong defaults
- Undocumented env vars are discovered only by reading source code

### Impact
Developer confusion. Wrong defaults when setting up the project.

### Recommended Architecture
1. Make `.env.example` the single source of truth for all env vars with correct defaults
2. Consider using a schema validation library (e.g., `envalid`) to validate env vars at startup

### Migration Plan
1. Update `.env.example` to include ALL env vars from `env.ts`
2. Align default values between `.env.example` and `env.ts`
3. (Optional) Add `envalid` for runtime env validation with clear error messages

---

## Priority Ranking

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | #8 No validation on stream endpoint | Low | Security |
| P0 | #13 Wrong HTML title | Trivial | Professionalism |
| P0 | #14 Hardcoded API URL | Low | Deployment |
| P1 | #1 God Hook (useChat) | High | Maintainability |
| P1 | #5 Backend types in 3 places | Medium | Type safety |
| P1 | #9 Provider `as any` casting | Medium | Type safety |
| P1 | #17 Controller duplicates business logic | Medium | Correctness |
| P1 | #18 Missing strict TypeScript | Medium | Type safety |
| P2 | #2 Duplicated input form | Medium | Maintainability |
| P2 | #4 SettingsSection monolith | Medium | Maintainability |
| P2 | #6 DashboardSection API calls | Low | Testability |
| P2 | #7 Orb.tsx 495 lines | High | Maintainability |
| P2 | #11 No UI primitives | Medium | Design consistency |
| P2 | #12 Dual translation system | Medium | i18n maintenance |
| P2 | #15 DashboardSection `any` types | Low | Type safety |
| P3 | #3 Toggle duplicated 4x | Low | DRY |
| P3 | #10 Dead/unused components | Low | Bundle size |
| P3 | #16 File naming inconsistency | Low | Conventions |
| P3 | #19 No React error boundaries | Medium | Resilience |
| P3 | #20 Env config mismatch | Low | DX |
