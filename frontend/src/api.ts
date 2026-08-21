const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001/api';

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

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function getAdminHeaders(): Record<string, string> {
  const token = (import.meta as any).env?.VITE_ADMIN_TOKEN || localStorage.getItem('admin_token') || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

export async function createSession(id?: string): Promise<ApiSession> {
  const res = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data;
}

export async function sendMessage(
  sessionId: string,
  message: string,
  agent?: string,
  model?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, agent, model }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data;
}

export async function getSession(
  sessionId: string
): Promise<{ session: ApiSession; messages: ApiMessage[] }> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export interface ApiSessionSummary {
  id: string;
  createdAt: string;
  title: string | null;
  messageCount: number;
  lastActivityAt: string;
}

export async function listSessions(): Promise<ApiSessionSummary[]> {
  const res = await fetch(`${API_BASE}/session`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data || [];
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/project`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data || [];
}

export interface BrainState {
  currentGoal: string | null;
  currentTask: string | null;
  currentFile: string | null;
  nextStep: string | null;
  activeFeature: string | null;
  sessionProgress: string | null;
  tasks: Array<{ id: string; title: string; status: 'todo' | 'doing' | 'done' }>;
  knownIssues: Array<{ id: string; title: string; severity: string; status: string }>;
  updatedAt: string;
}

export interface BrainKnowledge {
  overview: string | null;
  architecture: Array<{ title: string; detail: string }>;
  decisions: Array<{ title: string; rationale: string; date: string }>;
  techChoices: Array<{ area: string; choice: string; reason: string }>;
  conventions: string[];
  rules: string[];
  userPreferences: string[];
  updatedAt: string;
}

export interface ProjectBrain {
  projectId: string;
  version: number;
  state: BrainState;
  knowledge: BrainKnowledge;
  updatedAt: string;
}

export interface Suggestion {
  id: string;
  projectId: string;
  target: 'state' | 'knowledge';
  section: string;
  operation: string;
  value: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'ignored';
  createdAt: string;
  resolvedAt: string | null;
}

export async function getBrain(projectId: string): Promise<ProjectBrain | null> {
  const res = await fetch(`${API_BASE}/context/brain?projectId=${projectId}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data;
}

export async function getSuggestions(projectId: string, status?: string): Promise<Suggestion[]> {
  const params = new URLSearchParams({ projectId });
  if (status) params.set('status', status);
  const res = await fetch(`${API_BASE}/context/suggestions?${params}`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data || [];
}

export async function approveSuggestion(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/context/suggestions/${id}/approve`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function ignoreSuggestion(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/context/suggestions/${id}/ignore`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function healthCheck(): Promise<{ status: string; provider?: any }> {
  const baseHealth = (import.meta as any).env?.VITE_API_BASE
    ? `${(import.meta as any).env.VITE_API_BASE.replace(/\/api$/, '')}/health`
    : 'http://localhost:3001/health';
  const res = await fetch(baseHealth);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// ─── Provider & Model API ─────────────────────────────────────────────────────

export interface ProviderSummary {
  id: string;
  name: string;
  hasCredential: boolean;
  source: string;
  modelCount: number;
}

export interface ModelInfo {
  id: string;
  providerID: string;
  modelID: string;
  name: string;
  family?: string;
  status?: string;
  contextLimit?: number;
  outputLimit?: number;
  capabilities?: {
    temperature?: boolean;
    reasoning?: boolean;
    attachment?: boolean;
    toolcall?: boolean;
  };
  cost?: {
    input?: number;
    output?: number;
    cache?: number;
  };
}

export interface ProviderWithModels {
  id: string;
  name: string;
  env: string[];
  options: Record<string, unknown>;
  source: string;
  hasCredential: boolean;
  models: ModelInfo[];
}

export interface ModelCatalog {
  providers: ProviderWithModels[];
  default: Record<string, string>;
  fetchedAt: number;
}

export async function listProviders(): Promise<ProviderSummary[]> {
  const res = await fetch(`${API_BASE}/providers`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data || [];
}

export async function setProviderCredential(id: string, key: string): Promise<void> {
  const res = await fetch(`${API_BASE}/providers/${encodeURIComponent(id)}/credential`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function removeProviderCredential(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/providers/${encodeURIComponent(id)}/credential`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function refreshModels(): Promise<void> {
  const res = await fetch(`${API_BASE}/models/refresh`, {
    method: 'POST',
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function getModelCatalog(): Promise<ModelCatalog> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data;
}

export async function getCurrentModel(): Promise<string> {
  const res = await fetch(`${API_BASE}/models/current`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data.model;
}

export async function setCurrentModel(model: string): Promise<void> {
  const res = await fetch(`${API_BASE}/models/current`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function listCliSessions(): Promise<Array<{ id: string; title: string; updatedAt: number }>> {
  const res = await fetch(`${API_BASE}/session/cli/sessions`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data || [];
}

export async function exportCliSession(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/session/cli/sessions/${sessionId}/export`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data;
}

export async function deleteCliSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/session/cli/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseError(res));
  }
}

export interface StreamEvent {
  type: string;
  timestamp: number;
  text?: string;
  tool?: string;
  callID?: string;
  state?: { status: string; input?: Record<string, unknown>; output?: string };
  label?: string;
  message?: string;
  messageId?: string;
  part?: any;
  sessionID?: string;
  mode?: string;
  agent?: string;
  detail?: string;
  status?: string;
  reason?: string;
  originalType?: string;
  policy?: { allowWrites: boolean; allowShell: boolean };
  id?: string;
  requestID?: string;
  properties?: {
    id?: string;
    sessionID?: string;
    questions?: Array<{
      question: string;
      header: string;
      options: Array<{ label: string; description: string }>;
      multiple?: boolean;
      custom?: boolean;
    }>;
    tool?: { messageID: string; callID: string };
  };
  options?: any[];
}

export async function* streamChat(
  sessionId: string,
  message: string,
  agent?: string,
  signal?: AbortSignal,
  model?: string,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, agent, model }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Stream failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

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
  }
}

// ─── Question API ────────────────────────────────────────────────────────────

export async function replyToQuestion(requestID: string, answers: string[][]): Promise<void> {
  const res = await fetch(`${API_BASE}/question/${requestID}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function rejectQuestion(requestID: string): Promise<void> {
  const res = await fetch(`${API_BASE}/question/${requestID}/reject`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function listQuestions(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/question`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const { data } = await res.json();
  return data || [];
}
