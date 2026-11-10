// Plan 529 / ADR 0028: starts the read-only MongoDB MCP server against the LOCAL database only.
// Reads its URI only from FOODVIBE_MCP_MONGO_URI (never a .env file, MONGO_URI or MONGO_LOCAL_URI).
// Set FOODVIBE_MCP_MONGO_URI to the value of MONGO_LOCAL_URI in server/.env (login included), then open a NEW
// terminal window: a terminal opened before the variable was set does not see it.
// stdout is the MCP channel: every message from this launcher goes to stderr.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

export function checkLocalUri(uri) {
  if (typeof uri !== 'string' || uri.trim() === '') return { ok: false, reason: 'unset' };
  if (/^mongodb\+srv:/i.test(uri)) return { ok: false, reason: 'srv-scheme' };
  const m = /^mongodb:\/\/([^/?#]*)/i.exec(uri);
  if (!m) return { ok: false, reason: 'not-a-url' };
  if (m[1].slice(m[1].lastIndexOf('@') + 1).includes(',')) return { ok: false, reason: 'multi-host' };
  let url;
  try {
    url = new URL(uri);
  } catch {
    return { ok: false, reason: 'not-a-url' };
  }
  if (!LOCAL_HOSTS.has(url.hostname)) return { ok: false, reason: 'not-local' };
  return { ok: true };
}

function main() {
  const uri = process.env.FOODVIBE_MCP_MONGO_URI;
  const check = checkLocalUri(uri);
  if (!check.ok) {
    process.stderr.write(
      `mcp-mongo-local: refused (${check.reason}) — set the user variable FOODVIBE_MCP_MONGO_URI to the value of MONGO_LOCAL_URI in server/.env (login included), then open a NEW terminal window\n`,
    );
    process.exit(2);
  }
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.toUpperCase().startsWith('MDB_MCP_')) env[k] = v;
  }
  Object.assign(env, {
    MDB_MCP_CONNECTION_STRING: uri,
    MDB_MCP_READ_ONLY: 'true',
    MDB_MCP_DISABLED_TOOLS:
      'atlas,connect,disconnect,atlas-local-list-deployments,atlas-local-connect-deployment,search-knowledge,list-knowledge-sources',
    MDB_MCP_TELEMETRY: 'disabled',
    DO_NOT_TRACK: '1',
  });
  let entry;
  try {
    // the package's exports map hides package.json, so resolve the main file and walk up to the package root
    let dir = dirname(createRequire(import.meta.url).resolve('mongodb-mcp-server'));
    while (
      !existsSync(resolve(dir, 'package.json')) ||
      JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')).name !== 'mongodb-mcp-server'
    ) {
      const up = dirname(dir);
      if (up === dir) throw new Error('package root not found');
      dir = up;
    }
    const pkgPath = resolve(dir, 'package.json');
    const bin = JSON.parse(readFileSync(pkgPath, 'utf8')).bin;
    entry = resolve(dirname(pkgPath), typeof bin === 'string' ? bin : bin['mongodb-mcp-server']);
  } catch {
    process.stderr.write('mcp-mongo-local: mongodb-mcp-server is not installed — run pnpm install in this folder\n');
    process.exit(2);
  }
  const child = spawn(process.execPath, [entry], { stdio: 'inherit', env });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
  child.on('error', (e) => {
    process.stderr.write(`mcp-mongo-local: could not start (${e.code ?? 'error'})\n`);
    process.exit(1);
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
