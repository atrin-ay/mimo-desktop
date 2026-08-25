import { getRuntimePaths, resolveMimoBinary, buildChildEnv } from '../mimo/runtime';
import { spawn } from 'child_process';
import { MimoLocalClient } from '../mimo/client';
import { pickFreePort, generateServePassword } from '../mimo/runtime';
import fs from 'fs';

async function testAuth() {
  const paths = getRuntimePaths();
  const binary = resolveMimoBinary();
  const testKey = 'AIzaSyTestKey1234567890abcdef';

  const shapes = [
    { name: 'type:api,key', val: { type: 'api', key: testKey } },
    { name: 'key only', val: { key: testKey } },
    { name: 'apiKey only', val: { apiKey: testKey } },
    { name: 'string token', val: testKey },
  ];

  for (const shape of shapes) {
    if (!fs.existsSync(paths.dataDir)) {
      fs.mkdirSync(paths.dataDir, { recursive: true });
    }
    fs.writeFileSync(paths.authFile, JSON.stringify({ google: shape.val }, null, 2), { mode: 0o600 });

    const port = await pickFreePort();
    const password = generateServePassword();
    const serveProc = spawn(binary, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
      cwd: paths.repoRoot,
      shell: false,
      env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: password }),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => { serveProc.kill(); reject(new Error('timeout')); }, 10000);
      serveProc.stdout?.on('data', (d) => {
        if (d.toString().includes('mimocode server listening on')) { clearTimeout(t); resolve(); }
      });
      serveProc.stderr?.on('data', (d) => {
        if (d.toString().includes('mimocode server listening on')) { clearTimeout(t); resolve(); }
      });
    });

    const client = new MimoLocalClient(`http://127.0.0.1:${port}`, password);
    try {
      const providers = await client.getProviders();
      const googleProv = providers.providers.find(p => p.id === 'google');
      console.log(`Shape [${shape.name}] -> source: "${googleProv?.source}"`);
    } catch (e: any) {
      console.log(`Shape [${shape.name}] -> error: ${e.message}`);
    } finally {
      serveProc.kill();
    }
  }
}

testAuth().catch(console.error);
