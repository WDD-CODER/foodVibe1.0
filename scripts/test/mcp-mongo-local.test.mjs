import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkLocalUri } from '../mcp-mongo-local.mjs';

const script = fileURLToPath(new URL('../mcp-mongo-local.mjs', import.meta.url));

test('local uris are ok', () => {
  assert.deepEqual(checkLocalUri('mongodb://127.0.0.1:27017/foodvibe'), { ok: true });
  assert.deepEqual(checkLocalUri('mongodb://localhost/foodvibe'), { ok: true });
  assert.deepEqual(checkLocalUri('mongodb://[::1]:27017/foodvibe'), { ok: true });
});

test('refusal reasons', () => {
  assert.equal(checkLocalUri('').reason, 'unset');
  assert.equal(checkLocalUri(undefined).reason, 'unset');
  assert.equal(checkLocalUri('mongodb+srv://x.mongodb.net/db').reason, 'srv-scheme');
  assert.equal(checkLocalUri('mongodb://a:1,b:2/db').reason, 'multi-host');
  assert.equal(checkLocalUri('mongodb://127.0.0.1:1,127.0.0.1:2/db').reason, 'multi-host');
  assert.equal(checkLocalUri('mongodb://10.0.0.5:27017/db').reason, 'not-local');
  assert.equal(checkLocalUri('mongodb://127.0.0.1@evil.example/db').reason, 'not-local');
  assert.equal(checkLocalUri('not a url').reason, 'not-a-url');
});

test('the script refuses an Atlas uri: exit 2, reason on stderr, nothing on stdout', () => {
  const uri = 'mongodb+srv://x.mongodb.net/db';
  const r = spawnSync(process.execPath, [script], {
    env: { ...process.env, FOODVIBE_MCP_MONGO_URI: uri },
    encoding: 'utf8',
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /refused \(srv-scheme\)/);
  assert.equal(r.stdout, '');
  assert.ok(!r.stderr.includes(uri));
});
