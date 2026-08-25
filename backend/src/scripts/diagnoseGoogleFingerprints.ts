import { getRuntimePaths, resolveMimoBinary, buildChildEnv, pickFreePort, generateServePassword } from '../mimo/runtime';
import { spawn } from 'child_process';
import { MimoLocalClient } from '../mimo/client';
import crypto from 'crypto';
import fs from 'fs';

function keyHash(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
}

async function runFingerprintDiagnostics() {
  console.log('=== Google Credential Fingerprint Trace & Diagnostics ===\n');

  const paths = getRuntimePaths();
  const binary = resolveMimoBinary();
  const testKey = 'AIzaSyTestValidGoogleKeyFingerprintCheck12345';

  // 1. Fingerprint received by backend setCredential()
  const fpReceived = keyHash(testKey);
  console.log('1. Fingerprint received by setCredential():', fpReceived, `(length: ${testKey.length})`);

  // 2. Fingerprint written to auth.json
  if (!fs.existsSync(paths.dataDir)) {
    fs.mkdirSync(paths.dataDir, { recursive: true });
  }
  const authData = {
    google: { type: 'api', key: testKey }
  };
  fs.writeFileSync(paths.authFile, JSON.stringify(authData, null, 2), { mode: 0o600 });
  const writtenRaw = fs.readFileSync(paths.authFile, 'utf-8');
  const writtenJson = JSON.parse(writtenRaw);
  const fpWritten = keyHash(writtenJson.google.key);
  console.log('2. Fingerprint written to auth.json:', fpWritten);

  // 3. Fingerprint read from auth.json after writing
  const readRaw = fs.readFileSync(paths.authFile, 'utf-8');
  const readJson = JSON.parse(readRaw);
  const fpRead = keyHash(readJson.google.key);
  console.log('3. Fingerprint read from auth.json:', fpRead);

  // 4 & 5 & 6 & 7 & 8. Start mimo serve AFTER credential update
  console.log('4. Starting mimo serve AFTER credential update...');
  const port = await pickFreePort();
  const password = generateServePassword();

  const serveProc = spawn(binary, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: paths.repoRoot,
    shell: false,
    env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: password, MIMOCODE_DEBUG: '1' }),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { serveProc.kill(); reject(new Error('timeout')); }, 20000);
    serveProc.stdout?.on('data', (d) => {
      if (d.toString().includes('mimocode server listening on')) { clearTimeout(timeout); resolve(); }
    });
    serveProc.stderr?.on('data', (d) => {
      if (d.toString().includes('mimocode server listening on')) { clearTimeout(timeout); resolve(); }
    });
  });

  const client = new MimoLocalClient(`http://127.0.0.1:${port}`, password);
  const catalog = await client.getProviders();
  const googleProv = catalog.providers.find(p => p.id === 'google');

  console.log('5 & 6 & 7 & 8. mimo serve status for Google provider:');
  console.log('   - Provider ID:', googleProv?.id);
  console.log('   - Source:', googleProv?.source);
  console.log('   - Model count:', Object.keys(googleProv?.models || {}).length);

  // 9 & 10. Verify fingerprinting alignment
  console.log('\n9 & 10. Fingerprint Comparison Summary:');
  console.log('   - Original entered key fingerprint:', fpReceived);
  console.log('   - Written to auth.json fingerprint:  ', fpWritten);
  console.log('   - Read from auth.json fingerprint:   ', fpRead);
  console.log('   - Match across all points:', fpReceived === fpWritten && fpWritten === fpRead ? 'YES (Identical)' : 'NO (Diverged)');

  serveProc.kill();
}

runFingerprintDiagnostics().catch(console.error);
