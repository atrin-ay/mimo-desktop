import { getRuntimePaths, resolveMimoBinary } from '../mimo/runtime';

function main() {
  try {
    const paths = getRuntimePaths();
    const binary = resolveMimoBinary();
    console.log('=== MiMo Project-Local Runtime Paths ===');
    console.log(JSON.stringify({ ...paths, binary }, null, 2));
  } catch (err: any) {
    console.error('Failed to resolve runtime paths:', err.message);
    process.exit(1);
  }
}

main();
