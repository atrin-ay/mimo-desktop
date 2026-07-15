const API_BASE = 'http://localhost:3001/api';

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
  mode?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, mode }),
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

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch('http://localhost:3001/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function setApiKey(mimoApiKey: string, mimoBaseUrl?: string, mimoModel?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimoApiKey, mimoBaseUrl, mimoModel }),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    throw new Error(msg);
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
}

export async function* streamChat(
  sessionId: string,
  message: string,
  mode?: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, mode }),
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

