import path from 'path';
import fs from 'fs';
import net from 'net';
import crypto from 'crypto';

export interface MimoRuntimePaths {
  repoRoot: string;
  runtimeRoot: string;
  configHome: string;
  dataHome: string;
  cacheHome: string;
  stateHome: string;
  configDir: string;
  configFile: string;
  dataDir: string;
  authFile: string;
}

export class MimoRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MimoRuntimeError';
  }
}

export class MimoBinaryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MimoBinaryNotFoundError';
  }
}

export class MimoEnvLeakError extends Error {
  constructor(offendingKeys: string[]) {
    super(`Environment leak detected: disallowed API keys present: ${offendingKeys.join(', ')}`);
    this.name = 'MimoEnvLeakError';
  }
}

export class MimoIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MimoIsolationError';
  }
}

let memoizedPaths: MimoRuntimePaths | null = null;

export function getRuntimePaths(): MimoRuntimePaths {
  if (memoizedPaths) return memoizedPaths;

  // backend/src/mimo/runtime.ts -> backend/src/mimo -> backend/src -> backend -> repoRoot
  const repoRoot = process.env.MIMO_RUNTIME_REPO_ROOT || path.resolve(__dirname, '../../..');

  const backendPkg = path.join(repoRoot, 'backend', 'package.json');
  const frontendPkg = path.join(repoRoot, 'frontend', 'package.json');

  if (!fs.existsSync(backendPkg) || !fs.existsSync(frontendPkg)) {
    throw new MimoRuntimeError(`Repo root detection failed at ${repoRoot}: expected backend and frontend packages.`);
  }

  const runtimeRoot = process.env.MIMO_RUNTIME_DIR
    ? path.resolve(repoRoot, process.env.MIMO_RUNTIME_DIR)
    : path.join(repoRoot, '.mimo-runtime');

  const configHome = path.join(runtimeRoot, 'config');
  const dataHome = path.join(runtimeRoot, 'data');
  const cacheHome = path.join(runtimeRoot, 'cache');
  const stateHome = path.join(runtimeRoot, 'state');

  const configDir = path.join(configHome, 'mimocode');
  const configFile = path.join(configDir, 'mimocode.jsonc');
  const dataDir = path.join(dataHome, 'mimocode');
  const authFile = path.join(dataDir, 'auth.json');

  memoizedPaths = {
    repoRoot,
    runtimeRoot,
    configHome,
    dataHome,
    cacheHome,
    stateHome,
    configDir,
    configFile,
    dataDir,
    authFile,
  };

  return memoizedPaths;
}

export function ensureRuntimeDirs(): void {
  const paths = getRuntimePaths();
  for (const dir of [paths.configHome, paths.dataHome, paths.cacheHome, paths.stateHome]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function resolveMimoBinary(): string {
  if (process.env.MIMO_BINARY_PATH) {
    const explicit = path.resolve(process.env.MIMO_BINARY_PATH);
    if (fs.existsSync(explicit)) return explicit;
    throw new MimoBinaryNotFoundError(`Explicit MIMO_BINARY_PATH not found at ${explicit}`);
  }

  const paths = getRuntimePaths();
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const ext = process.platform === 'win32' ? '.exe' : '';

  const candidateDirect1 = path.join(
    paths.repoRoot,
    'backend',
    'node_modules',
    '@mimo-ai',
    `mimocode-${platform}-${arch}`,
    'bin',
    `mimo${ext}`
  );
  if (fs.existsSync(candidateDirect1)) return candidateDirect1;

  const candidate1 = path.join(
    paths.repoRoot,
    'backend',
    'node_modules',
    '@mimo-ai',
    'cli',
    'node_modules',
    '@mimo-ai',
    `mimocode-${platform}-${arch}`,
    'bin',
    `mimo${ext}`
  );

  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.join(
    paths.repoRoot,
    'node_modules',
    '@mimo-ai',
    'cli',
    'node_modules',
    '@mimo-ai',
    `mimocode-${platform}-${arch}`,
    'bin',
    `mimo${ext}`
  );

  if (fs.existsSync(candidate2)) return candidate2;

  throw new MimoBinaryNotFoundError(
    `MiMo binary not found for platform ${platform}-${arch}. run: npm install --prefix backend`
  );
}

export function buildChildEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  const paths = getRuntimePaths();
  const allowedKeys = new Set([
    'PATH',
    'Path',
    'SystemRoot',
    'windir',
    'COMSPEC',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'HOME',
    'HOMEDRIVE',
    'HOMEPATH',
    'APPDATA',
    'LOCALAPPDATA',
    'PROGRAMFILES',
    'PROGRAMFILES(X86)',
    'PROGRAMDATA',
    'NUMBER_OF_PROCESSORS',
    'PROCESSOR_ARCHITECTURE',
    'OS',
    'PATHEXT',
    'TZ',
    'SHELL',
    'LANG',
    'LC_ALL',
    'CHCP',
    'PYTHONIOENCODING',
  ]);

  const deniedRegex = /(_API_KEY|_TOKEN|_SECRET)$/i;
  const offending: string[] = [];
  const cleanEnv: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (allowedKeys.has(key) || key.startsWith('MIMOCODE_') || key.startsWith('XDG_')) {
      if (deniedRegex.test(key) && key !== 'MIMOCODE_SERVER_PASSWORD') {
        offending.push(key);
        continue;
      }
      cleanEnv[key] = value;
    }
  }

  if (offending.length > 0) {
    throw new MimoEnvLeakError(offending);
  }

  // Layer 1: XDG and MIMOCODE config/data roots
  cleanEnv.XDG_CONFIG_HOME = paths.configHome;
  cleanEnv.XDG_DATA_HOME = paths.dataHome;
  cleanEnv.XDG_CACHE_HOME = paths.cacheHome;
  cleanEnv.XDG_STATE_HOME = paths.stateHome;
  cleanEnv.MIMOCODE_CONFIG_DIR = paths.configDir;
  cleanEnv.MIMOCODE_DISABLE_AUTOUPDATE = '1';

  // Windows UTF-8 standards
  cleanEnv.CHCP = cleanEnv.CHCP || '65001';
  cleanEnv.PYTHONIOENCODING = cleanEnv.PYTHONIOENCODING || 'utf-8';
  cleanEnv.LANG = cleanEnv.LANG || 'en_US.UTF-8';
  cleanEnv.LC_ALL = cleanEnv.LC_ALL || 'en_US.UTF-8';

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (deniedRegex.test(k) && k !== 'MIMOCODE_SERVER_PASSWORD') {
        throw new MimoEnvLeakError([k]);
      }
      cleanEnv[k] = v;
    }
  }

  return cleanEnv;
}

export function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address() as net.AddressInfo;
      const port = address.port;
      srv.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
    srv.on('error', reject);
  });
}

export function generateServePassword(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function assertPathInsideRuntime(p: string): void {
  const paths = getRuntimePaths();
  const resolvedRuntime = path.resolve(paths.runtimeRoot);
  const resolvedTarget = path.resolve(p);

  const isWin = process.platform === 'win32';
  const runtimePrefix = isWin ? resolvedRuntime.toLowerCase() : resolvedRuntime;
  const targetPrefix = isWin ? resolvedTarget.toLowerCase() : resolvedTarget;

  const rel = path.relative(resolvedRuntime, resolvedTarget);
  const isInside = !rel.startsWith('..') && !path.isAbsolute(rel);

  if (!isInside && targetPrefix !== runtimePrefix) {
    throw new MimoIsolationError(`Path security violation: ${resolvedTarget} is outside runtime root ${resolvedRuntime}`);
  }
}
