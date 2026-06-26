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
