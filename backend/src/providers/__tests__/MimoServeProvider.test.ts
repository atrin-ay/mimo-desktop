import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Test Setup ──────────────────────────────────────────────────────────────
// We test MimoServeProvider's session isolation logic by mocking its HTTP calls.
// The provider spawns `mimo serve` on construction, so we mock the spawn to
// prevent actual process creation during tests.

// Mock the env module before importing the provider
vi.mock('../../config/env', () => ({
  env: {
    mimoServerPassword: '',
    mimoServePort: 0,
    mimoDebug: false,
  },
}));

// Mock the logger
vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock child_process.spawn to prevent actual process creation
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
  execFileSync: vi.fn(() => ''),
}));

// Mock fs for binary detection
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ isDirectory: () => false })),
  };
});

// Mock the event emitter base class
vi.mock('events', () => {
  class MockEventEmitter {
    private listeners: Record<string, Function[]> = {};
    on(event: string, fn: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return this;
    }
    off(event: string, fn: Function) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
      }
      return this;
    }
    emit(event: string, ...args: any[]) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(fn => fn(...args));
      }
      return true;
    }
  }
  return { EventEmitter: MockEventEmitter };
});

// Now import the provider (after mocks are set up)
import { MimoServeProvider } from '../MimoServeProvider';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a provider instance with mimo serve startup mocked out. */
function createTestProvider(): MimoServeProvider {
  const provider = new MimoServeProvider();
  // Force "ready" state without actually starting mimo serve
  (provider as any).serveReady = true;
  (provider as any).serveUrl = 'http://localhost:9999';
  return provider;
}

/** Mock httpRequest to return configurable responses. */
function mockHttpRequest(provider: MimoServeProvider, responseMap: Map<string, { status: number; data: any }>) {
  const mock = vi.fn(async (method: string, path: string, body?: unknown) => {
    const key = `${method} ${path}`;
    const response = responseMap.get(key);
    if (response) return response;
    return { status: 404, data: { error: 'Not found' } };
  });
  (provider as any).httpRequest = mock;
  return mock;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MimoServeProvider — Session Isolation', () => {
  let provider: MimoServeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = createTestProvider();
  });

  afterEach(() => {
    provider.stop();
  });

  it('a single conversationId reuses its mapped session across multiple calls', async () => {
    // Arrange: mock HTTP to return a session on creation, then a response on message
    const sessionResponse = { status: 200, data: { id: 'ses_abc123' } };
    const messageResponse = { status: 200, data: { content: 'Hello!' } };

    const responseMap = new Map<string, { status: number; data: any }>();
    responseMap.set('POST /session', sessionResponse);
    responseMap.set('POST /session/ses_abc123/message', messageResponse);

    const httpMock = mockHttpRequest(provider, responseMap);

    // Act: send two messages with the same conversationId
    const messages = [{ role: 'user' as const, content: 'Hi' }];
    await provider.sendMessage('conv-1', messages, 'build');
    await provider.sendMessage('conv-1', messages, 'build');

    // Assert: session was created only once, second call reused it
    const sessionCreates = httpMock.mock.calls.filter(
      ([method, path]) => method === 'POST' && path === '/session'
    );
    expect(sessionCreates).toHaveLength(1);

    const messageCalls = httpMock.mock.calls.filter(
      ([method, path]) => method === 'POST' && path === '/session/ses_abc123/message'
    );
    expect(messageCalls).toHaveLength(2);
  });

  it('two concurrent conversationIds get two distinct sessions', async () => {
    // Arrange: mock HTTP to return different sessions for each creation
    let sessionCounter = 0;
    const httpMock = vi.fn(async (method: string, path: string, body?: unknown) => {
      if (method === 'POST' && path === '/session') {
        sessionCounter++;
        return { status: 200, data: { id: `ses_${sessionCounter}` } };
      }
      if (method === 'POST' && path.startsWith('/session/') && path.endsWith('/message')) {
        const sessionId = path.split('/')[2];
        return { status: 200, data: { content: `Response from ${sessionId}` } };
      }
      return { status: 404, data: { error: 'Not found' } };
    });
    (provider as any).httpRequest = httpMock;

    // Act: send messages with two different conversationIds
    const messages1 = [{ role: 'user' as const, content: 'Remember 42' }];
    const messages2 = [{ role: 'user' as const, content: 'What number did I tell you?' }];

    const result1 = await provider.sendMessage('conv-A', messages1, 'build');
    const result2 = await provider.sendMessage('conv-B', messages2, 'build');

    // Assert: each conversation got its own session
    expect(result1.metadata?.sessionID).toBe('ses_1');
    expect(result2.metadata?.sessionID).toBe('ses_2');

    // Assert: sessions are different
    expect(result1.metadata?.sessionID).not.toBe(result2.metadata?.sessionID);

    // Assert: two session creations happened
    const sessionCreates = httpMock.mock.calls.filter(
      ([method, path]) => method === 'POST' && path === '/session'
    );
    expect(sessionCreates).toHaveLength(2);
  });

  it('simulated "session not found" triggers exactly one recreate-and-retry, not a loop', async () => {
    // Arrange: first message call returns 404 (session not found),
    // then recreation creates a new session, then retry succeeds.
    // Note: resolveMimoSession finds the existing stale session in the map,
    // so it does NOT create a new one — it returns the stale ID. Only after
    // the 404 does recreateMimoSession evict and recreate.
    let createCount = 0;
    const httpMock = vi.fn(async (method: string, path: string, body?: unknown) => {
      if (method === 'POST' && path === '/session') {
        createCount++;
        return { status: 200, data: { id: `ses_fresh_${createCount}` } };
      }
      if (method === 'POST' && path === '/session/ses_stale/message') {
        // First session is "not found"
        return { status: 404, data: { error: 'Session not found' } };
      }
      if (method === 'POST' && path === '/session/ses_fresh_1/message') {
        // Recreated session works
        return { status: 200, data: { content: 'Response after retry' } };
      }
      return { status: 404, data: { error: 'Not found' } };
    });
    (provider as any).httpRequest = httpMock;

    // Pre-populate the session map with a stale session
    (provider as any).sessionMap.set('conv-stale', 'ses_stale');
    (provider as any).sessionLastUsed.set('conv-stale', Date.now());

    // Act
    const messages = [{ role: 'user' as const, content: 'Test' }];
    const result = await provider.sendMessage('conv-stale', messages, 'build');

    // Assert: exactly 1 session creation (from recreateMimoSession only —
    // resolveMimoSession found the existing stale session and didn't create)
    expect(createCount).toBe(1);
    expect(result.content).toBe('Response after retry');

    // Assert: the stale session was evicted and replaced
    const currentSession = (provider as any).sessionMap.get('conv-stale');
    expect(currentSession).toBe('ses_fresh_1');
  });

  it('sweepStaleSessions evicts entries unused for 24h', () => {
    // Arrange: add sessions with old timestamps
    (provider as any).sessionMap.set('old-conv', 'ses_old');
    (provider as any).sessionLastUsed.set('old-conv', Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

    (provider as any).sessionMap.set('new-conv', 'ses_new');
    (provider as any).sessionLastUsed.set('new-conv', Date.now()); // now

    // Act
    (provider as any).sweepStaleSessions();

    // Assert: old session evicted, new session kept
    expect((provider as any).sessionMap.has('old-conv')).toBe(false);
    expect((provider as any).sessionMap.has('new-conv')).toBe(true);
  });

  it('getSessionForConversation returns the mapped session or null', () => {
    // Arrange
    (provider as any).sessionMap.set('conv-1', 'ses_1');

    // Act & Assert
    expect(provider.getSessionForConversation('conv-1')).toBe('ses_1');
    expect(provider.getSessionForConversation('conv-unknown')).toBeNull();
  });
});
