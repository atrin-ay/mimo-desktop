import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useSessions from '../useSessions';

// ─── Mock API ──────────────────────────────────────────────────────────────

const mockCreateSession = vi.fn();
const mockGetSession = vi.fn();
const mockListSessions = vi.fn();
const mockDeleteSession = vi.fn();

vi.mock('../../api', () => ({
  createSession: (...args: any[]) => mockCreateSession(...args),
  getSession: (...args: any[]) => mockGetSession(...args),
  listSessions: (...args: any[]) => mockListSessions(...args),
  deleteSession: (...args: any[]) => mockDeleteSession(...args),
}));

// Valid UUID v4 format (matches isUuid regex in useSessions)
const UUID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UUID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const UUID_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const UUID_D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const UUID_E = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSessions.mockResolvedValue([]);
    mockGetSession.mockResolvedValue({ messages: [] });
  });

  it('starts with a default subject', () => {
    const { result } = renderHook(() => useSessions('en'));

    expect(result.current.subjects).toHaveLength(1);
    expect(result.current.subjects[0].id).toBe('1');
    expect(result.current.subjects[0].name).toBe('New Conversation');
    expect(result.current.activeSubjectId).toBe('1');
    expect(result.current.sessionId).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('createNewSession creates a session and adds it to subjects', async () => {
    mockCreateSession.mockResolvedValue({ id: UUID_A });

    const { result } = renderHook(() => useSessions('en'));

    await act(async () => {
      await result.current.createNewSession();
    });

    expect(mockCreateSession).toHaveBeenCalled();
    expect(result.current.subjects).toHaveLength(2);
    expect(result.current.subjects[0].id).toBe(UUID_A);
    expect(result.current.subjects[0].name).toBe('New Neural Pipeline');
    expect(result.current.activeSubjectId).toBe(UUID_A);
  });

  it('createNewSession surfaces errors', async () => {
    mockCreateSession.mockRejectedValue(new Error('Connection refused'));

    const { result } = renderHook(() => useSessions('en'));

    await act(async () => {
      await result.current.createNewSession();
    });

    expect(result.current.sessionsError).toBe('Connection refused');
  });

  it('deleteSubject removes a subject and persists deletion', async () => {
    mockDeleteSession.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSessions('en'));

    // Add a UUID subject and switch to it
    await act(async () => {
      result.current.setSubjects((prev) => [
        { id: UUID_A, name: 'Test', date: '', dateFa: '', status: 'Active', messages: [] },
        ...prev,
      ]);
    });

    await act(async () => {
      result.current.switchSubject(UUID_A);
    });

    expect(result.current.subjects).toHaveLength(2);
    expect(result.current.activeSubjectId).toBe(UUID_A);

    await act(async () => {
      await result.current.deleteSubject(result.current.subjects[0]);
    });

    expect(mockDeleteSession).toHaveBeenCalledWith(UUID_A);
    expect(result.current.subjects).toHaveLength(1);
  });

  it('switchSubject updates activeSubjectId and sessionId for UUIDs', () => {
    const { result } = renderHook(() => useSessions('en'));

    act(() => {
      result.current.setSubjects((prev) => [
        { id: UUID_B, name: 'Other', date: '', dateFa: '', status: 'Active', messages: [] },
        ...prev,
      ]);
    });

    act(() => {
      result.current.switchSubject(UUID_B);
    });

    expect(result.current.activeSubjectId).toBe(UUID_B);
    expect(result.current.sessionId).toBe(UUID_B);
  });

  it('setMessages auto-names a conversation from the first user message', () => {
    const { result } = renderHook(() => useSessions('en'));

    act(() => {
      result.current.setMessages([
        {
          id: '1',
          sender: 'user',
          text: 'Hello MiMo, help me with React hooks',
          timestamp: '10:00',
          events: [],
          artifacts: [],
        },
      ]);
    });

    const subject = result.current.subjects.find((s) => s.id === '1');
    expect(subject?.name).toBe('Hello MiMo, help me with React hooks');
  });

  it('setMessages truncates long names at 45 chars', () => {
    const { result } = renderHook(() => useSessions('en'));

    const longText = 'A'.repeat(60);

    act(() => {
      result.current.setMessages([
        {
          id: '1',
          sender: 'user',
          text: longText,
          timestamp: '10:00',
          events: [],
          artifacts: [],
        },
      ]);
    });

    const subject = result.current.subjects.find((s) => s.id === '1');
    expect(subject?.name).toBe('A'.repeat(45) + '...');
  });

  it('loads sessions from backend on mount', async () => {
    mockListSessions.mockResolvedValue([
      {
        id: UUID_C,
        title: 'Previous chat',
        messageCount: 3,
        lastActivityAt: '2026-07-23T10:00:00Z',
      },
      {
        id: UUID_D,
        title: '',
        messageCount: 0,
        lastActivityAt: '2026-07-23T09:00:00Z',
      },
    ]);

    const { result } = renderHook(() => useSessions('en'));

    await waitFor(() => {
      expect(result.current.subjects.length).toBeGreaterThanOrEqual(1);
    });

    // Empty session (messageCount=0) should be filtered out
    const loadedIds = result.current.subjects.map((s) => s.id);
    expect(loadedIds).not.toContain(UUID_D);
  });

  it('loads messages for active session', async () => {
    mockListSessions.mockResolvedValue([
      {
        id: UUID_E,
        title: 'Chat',
        messageCount: 1,
        lastActivityAt: '2026-07-23T10:00:00Z',
      },
    ]);
    mockGetSession.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: 'Hi', createdAt: '2026-07-23T10:00:00Z' },
        { id: 'm2', role: 'assistant', content: 'Hello!', createdAt: '2026-07-23T10:00:01Z' },
      ],
    });

    const { result } = renderHook(() => useSessions('en'));

    await waitFor(() => {
      expect(result.current.messages.length).toBe(2);
    });

    expect(result.current.messages[0].sender).toBe('user');
    expect(result.current.messages[0].text).toBe('Hi');
    expect(result.current.messages[1].sender).toBe('agent');
    expect(result.current.messages[1].text).toBe('Hello!');
  });
});
