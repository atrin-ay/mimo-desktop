import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { providerService, keyHash } from '../providerService';
import { getRuntimePaths } from '../../mimo/runtime';

vi.mock('../../providers', () => ({
  getProvider: () => ({
    name: 'mimo-serve',
    isReady: true,
    url: 'http://127.0.0.1:9999',
    servePassword: 'test-password',
    runCommand: vi.fn(async () => ({ stdout: '', stderr: '', code: 0 })),
  }),
}));

vi.mock('../../mimo/client', () => {
  return {
    MimoLocalClient: class {
      async putAuth(providerId: string, cred: any) {
        const paths = getRuntimePaths();
        if (!fs.existsSync(paths.dataDir)) {
          fs.mkdirSync(paths.dataDir, { recursive: true });
        }
        let auth = {};
        try {
          if (fs.existsSync(paths.authFile)) {
            auth = JSON.parse(fs.readFileSync(paths.authFile, 'utf-8'));
          }
        } catch {}
        (auth as any)[providerId] = cred;
        fs.writeFileSync(paths.authFile, JSON.stringify(auth, null, 2), { mode: 0o600 });
        return true;
      }
      async deleteAuth(providerId: string) {
        const paths = getRuntimePaths();
        if (fs.existsSync(paths.authFile)) {
          const auth = JSON.parse(fs.readFileSync(paths.authFile, 'utf-8'));
          delete auth[providerId];
          fs.writeFileSync(paths.authFile, JSON.stringify(auth, null, 2), { mode: 0o600 });
        }
        return true;
      }
    }
  };
});

describe('providerService credential flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('securely stores credential with correct fingerprint, provider ID, and auth file path', async () => {
    const providerId = 'google';
    const testKey = 'AIzaSyTestKeyForRegressionTest1234567890';
    const expectedFingerprint = keyHash(testKey);

    expect(expectedFingerprint).toHaveLength(8);

    await providerService.setCredential(providerId, testKey);

    const paths = getRuntimePaths();
    expect(fs.existsSync(paths.authFile)).toBe(true);

    const authContent = JSON.parse(fs.readFileSync(paths.authFile, 'utf-8'));
    expect(authContent[providerId]).toBeDefined();
    expect(authContent[providerId].type).toBe('api');
    expect(authContent[providerId].key).toBe(testKey);

    // Verify fingerprint matches stored key safely without leaking secret
    const storedFingerprint = keyHash(authContent[providerId].key);
    expect(storedFingerprint).toBe(expectedFingerprint);

    console.log('Credential regression test verified successfully:');
    console.log(' - Provider ID:', providerId);
    console.log(' - Auth file path:', paths.authFile);
    console.log(' - Key length:', testKey.length);
    console.log(' - Key SHA-256 fingerprint:', storedFingerprint);

    // Clean up
    await providerService.removeCredential(providerId);
  });
});
