import { getRuntimePaths, resolveMimoBinary, buildChildEnv, pickFreePort, generateServePassword } from '../mimo/runtime';
import { spawn, spawnSync } from 'child_process';
import { MimoLocalClient } from '../mimo/client';
import { modelService } from '../services/modelService';
import { getProvider } from '../providers';
import fs from 'fs';

async function investigate() {
  console.log('=== MiMo Code Deep Catalog & Execution Investigation ===\n');

  const paths = getRuntimePaths();
  const binary = resolveMimoBinary();
  const env = buildChildEnv();

  // 1. Installed MiMo CLI Version & Capability
  console.log('1. Installed MiMo CLI Inspection:');
  console.log('   - Binary path:', binary);
  const versionRes = spawnSync(binary, ['--version'], { env, encoding: 'utf-8' });
  console.log('   - `mimo --version`:', versionRes.stdout.trim() || versionRes.stderr.trim());

  const providersRes = spawnSync(binary, ['providers'], { env, encoding: 'utf-8' });
  console.log('   - `mimo providers` output:\n', providersRes.stdout.trim() || providersRes.stderr.trim());

  // 2. mimo serve /config/providers
  console.log('\n2. `mimo serve` & /config/providers:');
  const port = await pickFreePort();
  const pass = generateServePassword();
  const serveProc = spawn(binary, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: paths.repoRoot,
    shell: false,
    env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: pass }),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => { serveProc.kill(); reject(new Error('timeout')); }, 15000);
    const check = (d: Buffer) => {
      if (d.toString().includes('mimocode server listening on')) {
        clearTimeout(t);
        resolve();
      }
    };
    serveProc.stdout.on('data', check);
    serveProc.stderr.on('data', check);
  });

  const client = new MimoLocalClient(`http://127.0.0.1:${port}`, pass);
  const serveCatalog = await client.getProviders();
  console.log('   - /config/providers provider IDs:', serveCatalog.providers.map(p => p.id));
  console.log('   - /config/providers provider details:', serveCatalog.providers.map(p => `${p.id} (${p.name}, source: ${p.source}, models: ${Object.keys(p.models || {}).length})`));

  // 3. Backend modelService
  const provider = getProvider() as any;
  provider.serveUrl = `http://127.0.0.1:${port}`;
  provider.servePassword = pass;
  provider.serveReady = true;
  modelService.invalidate();

  const backendCat = await modelService.getCatalog();
  console.log('\n3. Backend modelService.getCatalog():');
  console.log('   - Provider IDs:', backendCat.providers.map(p => p.id));

  // 4. Test credential activation for google and openai/opencode
  console.log('\n4. Testing credential activation in auth.json for google & openai:');
  fs.writeFileSync(paths.authFile, JSON.stringify({
    google: { type: 'api', key: 'AIzaSyTestKey1234567890abcdef' },
    openai: { type: 'api', key: 'sk-proj-testkey1234567890abcdef' },
    opencode: { type: 'api', key: 'oc_test_key_1234567890abcdef' }
  }, null, 2), { mode: 0o600 });

  // Restart serve to test loaded auth
  serveProc.kill();

  const port2 = await pickFreePort();
  const pass2 = generateServePassword();
  const serveProc2 = spawn(binary, ['serve', '--port', String(port2), '--hostname', '127.0.0.1'], {
    cwd: paths.repoRoot,
    shell: false,
    env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: pass2 }),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => { serveProc2.kill(); reject(new Error('timeout')); }, 15000);
    const check = (d: Buffer) => {
      if (d.toString().includes('mimocode server listening on')) {
        clearTimeout(t);
        resolve();
      }
    };
    serveProc2.stdout.on('data', check);
    serveProc2.stderr.on('data', check);
  });

  const client2 = new MimoLocalClient(`http://127.0.0.1:${port2}`, pass2);
  const serveCatalogWithAuth = await client2.getProviders();
  console.log('   - /config/providers WITH auth.json credentials:', serveCatalogWithAuth.providers.map(p => ({
    id: p.id,
    name: p.name,
    source: p.source,
    modelsCount: Object.keys(p.models || {}).length,
    sampleModels: Object.keys(p.models || {}).slice(0, 3)
  })));

  serveProc2.kill();

  console.log('\n=== Investigation Complete ===');
}

investigate().catch(console.error);
