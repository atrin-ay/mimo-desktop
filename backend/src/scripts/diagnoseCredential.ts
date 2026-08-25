import { getRuntimePaths, resolveMimoBinary, buildChildEnv } from '../mimo/runtime';
import { spawn } from 'child_process';
import { MimoLocalClient } from '../mimo/client';
import { pickFreePort, generateServePassword } from '../mimo/runtime';
import fs from 'fs';

async function diagnose() {
  console.log('=== Credential Lifecycle Diagnostics ===\n');

  const paths = getRuntimePaths();
  console.log('Runtime paths:');
  console.log(' - runtimeRoot:', paths.runtimeRoot);
  console.log(' - authFile:', paths.authFile);

  const binary = resolveMimoBinary();
  const port = await pickFreePort();
  const password = generateServePassword();

  // 1. Pre-warm catalog
  await new Promise<void>((resolve) => {
    const p = spawn(binary, ['models', '--refresh'], {
      cwd: paths.repoRoot,
      shell: false,
      env: buildChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    p.on('close', () => resolve());
    p.on('error', () => resolve());
  });

  // 2. Start serve
  const serveProc = spawn(binary, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: paths.repoRoot,
    shell: false,
    env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: password }),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => { serveProc.kill(); reject(new Error('timeout')); }, 30000);
    serveProc.stdout?.on('data', (d) => {
      if (d.toString().includes('mimocode server listening on')) { clearTimeout(t); resolve(); }
    });
    serveProc.stderr?.on('data', (d) => {
      if (d.toString().includes('mimocode server listening on')) { clearTimeout(t); resolve(); }
    });
  });

  const client = new MimoLocalClient(`http://127.0.0.1:${port}`, password);
  const catalog = await client.getProviders();

  console.log('\nProviders from GET /config/providers:');
  for (const prov of catalog.providers) {
    console.log(` - ID: "${prov.id}", Name: "${prov.name}", source: "${prov.source}", models count: ${Object.keys(prov.models || {}).length}`);
  }

  // Find Google provider ID
  const googleProv = catalog.providers.find(p => p.id.toLowerCase().includes('google') || p.name.toLowerCase().includes('google'));
  if (googleProv) {
    console.log(`\nFound Google provider ID: "${googleProv.id}"`);
    
    // Test putting credential for googleProv.id
    const dummyGoogleKey = 'AIzaSyTestCanaryKeyDoNotUse1234567890';
    console.log(`Putting credential for providerId: "${googleProv.id}"`);
    await client.putAuth(googleProv.id, { type: 'api', key: dummyGoogleKey });

    if (fs.existsSync(paths.authFile)) {
      const authContent = fs.readFileSync(paths.authFile, 'utf-8');
      console.log('auth.json content summary:', authContent.replace(/: ".*?"/g, ': "[REDACTED]"'));
    } else {
      console.log('WARNING: auth.json does not exist at expected path:', paths.authFile);
    }

    // Re-fetch providers
    const catalogAfter = await client.getProviders();
    const gAfter = catalogAfter.providers.find(p => p.id === googleProv.id);
    console.log(`Google provider after credential put: hasCredential source = "${gAfter?.source}"`);
  } else {
    console.log('\nERROR: Google provider not found in catalog!');
  }

  serveProc.kill();
}

diagnose().catch(console.error);
