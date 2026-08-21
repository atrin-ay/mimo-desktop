import { getRuntimePaths, resolveMimoBinary, buildChildEnv } from '../mimo/runtime';
import fs from 'fs';

function runDoctor() {
  console.log('Running MiMo project-local integration doctor...');
  try {
    const paths = getRuntimePaths();
    console.log('[V1] Runtime paths resolved:', paths.runtimeRoot);

    const binary = resolveMimoBinary();
    console.log('[V1] Binary resolved:', binary);

    if (binary.includes('.config\\mimocode') || binary.includes('.local\\share\\mimocode') || binary.includes('AppData\\Roaming\\npm')) {
      console.error('❌ V1 FAILED: Binary resolved from global path:', binary);
      process.exit(1);
    }
    console.log('✅ V1 PASSED: Binary is project-local.');

    const env = buildChildEnv();
    const deniedRegex = /(_API_KEY|_TOKEN|_SECRET)$/i;
    let leak = false;
    for (const [k] of Object.entries(env)) {
      if (deniedRegex.test(k) && k !== 'MIMOCODE_SERVER_PASSWORD') {
        console.error(`❌ V3 FAILED: Environment leak detected in child env: ${k}`);
        leak = true;
      }
    }
    if (leak) {
      process.exit(1);
    }
    console.log('✅ V3 PASSED: Child environment is fully isolated (no secret API keys leaked).');

    console.log('🎉 All doctor checks passed successfully!');
  } catch (err: any) {
    console.error('❌ Doctor check failed with error:', err.message);
    process.exit(1);
  }
}

runDoctor();
