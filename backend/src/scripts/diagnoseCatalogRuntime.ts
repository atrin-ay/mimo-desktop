import { getRuntimePaths, resolveMimoBinary, buildChildEnv } from '../mimo/runtime';
import { spawn } from 'child_process';
import { MimoLocalClient } from '../mimo/client';
import { pickFreePort, generateServePassword } from '../mimo/runtime';
import fs from 'fs';

async function runDiagnostics() {
  const paths = getRuntimePaths();
  const binary = resolveMimoBinary();
  fs.writeFileSync(paths.authFile, JSON.stringify({ google: { type: 'api', key: 'AIzaSyTestKey' } }, null, 2));

  const port = await pickFreePort();
  const password = generateServePassword();

  const serveProc = spawn(binary, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: paths.repoRoot,
    shell: false,
    env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: password }),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 4000);
  });

  const client = new MimoLocalClient(`http://127.0.0.1:${port}`, password);
  const cat = await client.getProviders();
  const g = cat.providers.find(p => p.id === 'google');
  if (g) {
    console.log('Google model keys:', Object.keys(g.models));
  }
  serveProc.kill();
}

runDiagnostics().catch(console.error);
