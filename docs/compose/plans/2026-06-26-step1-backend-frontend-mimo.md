# MIMO Desktop — Step 1: Backend + Frontend Connection + MiMo Provider

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the backend running, connect the frontend chat to the backend API, add a real MiMo AI provider, and comment out all post-step-1 frontend features (Workspace, Automations, Memory, Integrations, Settings, Projects sections).

**Architecture:** The backend already has a clean provider abstraction (`AIProvider` interface). We add a `MiMoProvider` that calls Xiaomi's MiMo API (OpenAI-compatible endpoint). The frontend's `App.tsx` currently uses local mock state — we replace the chat flow to call `POST /api/session` + `POST /api/chat` and display real responses. All non-chat views are commented out.

**Tech Stack:** Express, better-sqlite3, Zod (backend) — React 19, Vite, Tailwind, Motion (frontend)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `backend/.env` | Create | Real env config with MiMo provider |
| `backend/src/providers/MiMoProvider.ts` | Create | MiMo API provider implementation |
| `backend/src/providers/index.ts` | Modify | Register MiMo provider |
| `backend/src/config/env.ts` | Modify | Add MiMo config env vars |
| `backend/.env.example` | Modify | Add MiMo env vars to example |
| `frontend/src/App.tsx` | Modify | Connect chat to backend API, comment out post-step-1 views |
| `frontend/src/api.ts` | Create | API client for backend |
| `frontend/src/components/HomeScreen.tsx` | Modify | Use API client instead of mock |

---

### Task 1: Backend — Add MiMo Provider

**Files:**
- Create: `backend/src/providers/MiMoProvider.ts`
- Modify: `backend/src/providers/index.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Produces: `MiMoProvider` class implementing `AIProvider` interface

- [ ] **Step 1: Add MiMo env vars to config**

In `backend/src/config/env.ts`, add to the `EnvConfig` interface and `loadEnv()`:

```typescript
export interface EnvConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  logLevel: string;
  databasePath: string;
  aiProvider: string;
  mockProviderDelayMs: number;
  mimoApiKey: string;
  mimoBaseUrl: string;
  mimoModel: string;
}

function loadEnv(): EnvConfig {
  // ... existing vars ...
  const mimoApiKey = process.env.MIMO_API_KEY ?? '';
  const mimoBaseUrl = process.env.MIMO_BASE_URL ?? 'https://api.xiaomi.com/v1';
  const mimoModel = process.env.MIMO_MODEL ?? 'MiMo-7B-RL';

  return {
    // ... existing vars ...
    mimoApiKey,
    mimoBaseUrl,
    mimoModel,
  };
}
```

- [ ] **Step 2: Update .env.example**

Add to `backend/.env.example`:

```
# MiMo Provider settings
AI_PROVIDER=mimo
MIMO_API_KEY=your-api-key-here
MIMO_BASE_URL=https://api.xiaomi.com/v1
MIMO_MODEL=MiMo-7B-RL
```

- [ ] **Step 3: Create MiMoProvider**

Create `backend/src/providers/MiMoProvider.ts`:

```typescript
import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * MiMo AI provider — calls Xiaomi's MiMo model via OpenAI-compatible API.
 */
export class MiMoProvider implements AIProvider {
  readonly name = 'mimo';

  async sendMessage(messages: ProviderMessage[]): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MiMoProvider requires at least one message');
    }

    const apiKey = env.mimoApiKey;
    if (!apiKey) {
      throw new Error('MIMO_API_KEY is not configured');
    }

    const url = `${env.mimoBaseUrl}/chat/completions`;

    const systemMessage: ProviderMessage = {
      role: 'user',
      content: 'You are MiMo, an intelligent AI assistant created by Xiaomi. You are helpful, concise, and provide accurate answers.',
    };

    const apiMessages = [systemMessage, ...messages].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    logger.debug(
      { messageCount: messages.length, model: env.mimoModel },
      'MiMoProvider sending request',
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.mimoModel,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, body: errorText },
        'MiMoProvider API error',
      );
      throw new Error(`MiMo API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!content) {
      throw new Error('MiMo API returned empty response');
    }

    logger.info(
      { model: env.mimoModel, tokens: data.usage?.total_tokens },
      'MiMoProvider response received',
    );

    return {
      content,
      metadata: {
        provider: this.name,
        model: env.mimoModel,
        messageCount: messages.length,
        usage: data.usage,
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const hasKey = !!env.mimoApiKey;
    return {
      healthy: hasKey,
      provider: this.name,
      details: {
        model: env.mimoModel,
        baseUrl: env.mimoBaseUrl,
        apiKeyConfigured: hasKey,
      },
    };
  }
}
```

- [ ] **Step 4: Register MiMo provider**

In `backend/src/providers/index.ts`, add:

```typescript
import { MiMoProvider } from './MiMoProvider';

const providers: Record<string, () => AIProvider> = {
  mock: () => new MockProvider(),
  mimo: () => new MiMoProvider(),
};
```

- [ ] **Step 5: Create .env with mock fallback**

Create `backend/.env`:

```
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
LOG_LEVEL=info
DATABASE_PATH=./data/mimo.db
AI_PROVIDER=mock
MOCK_PROVIDER_DELAY_MS=300
MIMO_API_KEY=
MIMO_BASE_URL=https://api.xiaomi.com/v1
MIMO_MODEL=MiMo-7B-RL
```

(Keep `AI_PROVIDER=mock` until user provides real API key)

---

### Task 2: Frontend — Create API Client

**Files:**
- Create: `frontend/src/api.ts`

**Interfaces:**
- Produces: `createSession()`, `sendMessage()`, `getSession()` functions

- [ ] **Step 1: Create API client module**

Create `frontend/src/api.ts`:

```typescript
const API_BASE = 'http://localhost:3000/api';

export interface ApiSession {
  id: string;
  createdAt: string;
}

export interface ApiMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  sessionId: string;
  message: ApiMessage;
}

export async function createSession(id?: string): Promise<ApiSession> {
  const res = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const { data } = await res.json();
  return data;
}

export async function sendMessage(
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  const { data } = await res.json();
  return data;
}

export async function getSession(
  sessionId: string
): Promise<{ session: ApiSession; messages: ApiMessage[] }> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to get session: ${res.status}`);
  const { data } = await res.json();
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete session: ${res.status}`);
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch('http://localhost:3000/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
```

---

### Task 3: Frontend — Connect Chat to Backend

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `createSession()`, `sendMessage()` from `api.ts`

- [ ] **Step 1: Add session state and API integration to App.tsx**

Add to the imports at the top of `App.tsx`:

```typescript
import { createSession, sendMessage, type ApiMessage } from "./api";
```

Add state variables inside the `App` component (after the existing state declarations):

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [backendError, setBackendError] = useState<string | null>(null);
```

- [ ] **Step 2: Replace handleExecuteCommand with API-backed version**

Replace the entire `handleExecuteCommand` function with:

```typescript
const handleExecuteCommand = async (cmd: string) => {
  const userMsg: Message = {
    id: String(Date.now()),
    sender: "user",
    text: cmd,
    timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" })
  };

  setMessages(prev => [...prev, userMsg]);
  setOrbState(OrbState.Thinking);
  setIsLoading(true);
  setBackendError(null);

  try {
    // Create session if needed
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = await createSession();
      currentSessionId = session.id;
      setSessionId(session.id);
    }

    // Send message to backend
    const response = await sendMessage(currentSessionId, cmd);

    const agentMsg: Message = {
      id: response.message.id,
      sender: "agent",
      agentName: "MiMo",
      text: response.message.content,
      timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" }),
      tokensPerSec: 0
    };

    setMessages(prev => [...prev, agentMsg]);
    setOrbState(OrbState.Completed);
    setTimeout(() => setOrbState(OrbState.Idle), 2000);
  } catch (err: any) {
    console.error('Chat error:', err);
    setBackendError(err.message || 'Failed to connect to backend');
    setOrbState(OrbState.Idle);

    const errorMsg: Message = {
      id: String(Date.now() + 1),
      sender: "system",
      text: `Error: ${err.message || 'Could not connect to backend. Make sure the backend is running on port 3000.'}`,
      timestamp: new Date().toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, errorMsg]);
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 3: Comment out post-step-1 views**

In the `{/* 3. Screen Switcher Component viewport */}` section, comment out all views except Home and AssistantPersonal. Replace the view rendering block with:

```tsx
{/* 3. Screen Switcher Component viewport */}
<div className="flex-1 relative">
  <AnimatePresence mode="wait">
    <motion.div
      key={activeView}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="absolute inset-0 w-full h-full"
    >
      {activeView === ActiveView.Home && (
        <DashboardSection 
          language={language}
          onNavigate={(view) => {
            if (view === "AssistantPersonal") {
              selectAssistantView(ActiveView.AssistantPersonal);
            } else {
              setActiveView(view);
            }
          }}
          onNavigateToProject={() => {}}
          onNavigateToChat={(chatId) => {
            setActiveSubjectId(chatId);
            selectAssistantView(ActiveView.AssistantPersonal);
          }}
          subjects={subjects}
          projects={[]}
          orbState={orbState}
        />
      )}

      {activeView === ActiveView.AssistantPersonal && (
        <HomeScreen 
          orbState={orbState}
          setOrbState={setOrbState}
          onNavigate={(view) => setActiveView(view)}
          onTriggerAction={handleExecuteCommand}
          activeGoals={activeGoals}
          language={language}
          setLanguage={setLanguage}
          interactionMode={interactionMode}
          setInteractionMode={setInteractionMode}
          messages={messages}
        />
      )}

      {/* STEP 2+ FEATURES — COMMENTED OUT
      {activeView === ActiveView.AssistantProjects && (
        <ProjectsSection ... />
      )}
      {activeView === ActiveView.Workspace && (
        <Workspace ... />
      )}
      {activeView === ActiveView.Automations && (
        <AutomationsSection ... />
      )}
      {activeView === ActiveView.Memory && (
        <MemorySystem />
      )}
      {activeView === ActiveView.Integrations && (
        <IntegrationsSection ... />
      )}
      {activeView === ActiveView.Settings && (
        <SettingsSection ... />
      )}
      */}
    </motion.div>
  </AnimatePresence>
</div>
```

- [ ] **Step 4: Comment out post-step-1 menu items**

In the `menuItems` array, keep only Home and Assistant (Personal):

```typescript
const menuItems = [
  { view: ActiveView.Home, label: "Home", icon: Home },
  { view: "AssistantParent", label: "Assistant", icon: MessageSquare, isParent: true },
  // STEP 2+ — COMMENTED OUT
  // { view: ActiveView.Workspace, label: "Workspace", icon: Terminal },
  // { view: ActiveView.Automations, label: "Automations", icon: Zap },
  // { view: ActiveView.Memory, label: "Memory", icon: Brain },
  // { view: ActiveView.Integrations, label: "Integrations", icon: Plug },
  // { view: ActiveView.Settings, label: "Settings", icon: Settings }
];
```

- [ ] **Step 5: Comment out post-step-1 imports**

Comment out imports that are no longer used:

```typescript
// import Workspace from "./components/Workspace";
// import MemorySystem from "./components/MemorySystem";
// import ProjectsSection from "./components/ProjectsSection";
// import AutomationsSection from "./components/AutomationsSection";
// import IntegrationsSection from "./components/IntegrationsSection";
// import SettingsSection from "./components/SettingsSection";
```

And the unused icon imports:

```typescript
// Terminal, Database, Cpu, Star, Layers, Sparkles, ChevronLeft, ChevronRight,
// Plus, Trash2, ChevronDown, Briefcase, Bot, Zap, Brain, Plug, Settings, Sun, Moon
```

- [ ] **Step 6: Clean up unused state variables**

Comment out state that's only used by post-step-1 features:

```typescript
// const [files, setFiles] = useState<FileItem[]>([...]);
// const [projects, setProjects] = useState<any[]>([...]);
// const [selectedProjectId, setSelectedProjectId] = useState<string>("");
```

And the mock subjects (keep one empty default):

```typescript
const [subjects, setSubjects] = useState<Subject[]>([
  {
    id: "1",
    name: "New Conversation",
    date: "Just now",
    dateFa: "اکنون",
    status: "Active",
    category: "personal",
    messages: []
  }
]);
```

---

### Task 4: Verify Everything Works

**Files:** None (verification only)

- [ ] **Step 1: Install backend dependencies and start**

```bash
cd backend && npm install && npm run dev
```

Expected: Server starts on port 3000, logs "MIMO backend started".

- [ ] **Step 2: Test health endpoint**

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: Test session creation**

```bash
curl -X POST http://localhost:3000/api/session -H "Content-Type: application/json" -d "{}"
```

Expected: `{"data":{"id":"<uuid>","createdAt":"..."}}`

- [ ] **Step 4: Test chat endpoint**

```bash
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"sessionId":"<uuid-from-step-3>","message":"Hello MiMo"}'
```

Expected: `{"data":{"sessionId":"...","message":{"role":"assistant","content":"..."}}}`

- [ ] **Step 5: Install frontend dependencies and start**

```bash
cd frontend && npm install && npm run dev
```

Expected: Vite dev server starts on port 5173.

- [ ] **Step 6: Open browser and verify chat works**

Navigate to `http://localhost:5173`. Type a message in the chat input and send. Verify:
- Message appears in chat
- Loading state shows
- Response appears from backend
- No errors in console

---

## Global Constraints

- Backend runs on port 3000, frontend on port 5173
- `AI_PROVIDER=mock` until real MiMo API key is provided
- All session IDs are UUID v4
- Frontend API base URL is `http://localhost:3000/api`
- Post-step-1 features are commented out, not deleted
