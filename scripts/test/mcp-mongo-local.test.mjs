import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

test('the launcher never uses npx', () => {
  assert.ok(!readFileSync(script, 'utf8').includes('npx'));
});

test('the launcher starts the installed server and lists only local read tools', async () => {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, FOODVIBE_MCP_MONGO_URI: 'mongodb://127.0.0.1:1/none' },
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const replies = new Map();
  let buf = '';
  const waiters = [];
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined) replies.set(msg.id, msg);
      } catch {
        /* not JSON */
      }
    }
    waiters.forEach((w) => w());
  });
  const waitFor = (id, ms) =>
    new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`no reply to ${id} within ${ms} ms`)), ms);
      const check = () => {
        if (replies.has(id)) {
          clearTimeout(t);
          res(replies.get(id));
        }
      };
      waiters.push(check);
      check();
    });
  const send = (m) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
  try {
    send({
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    });
    await waitFor(1, 15000);
    send({ method: 'notifications/initialized' });
    send({ id: 2, method: 'tools/list' });
    const list = await waitFor(2, 15000);
    const names = list.result.tools.map((t) => t.name);
    assert.ok(names.includes('find'), `find missing in ${names.join(',')}`);
    const banned = [
      'connect',
      'disconnect',
      'search-knowledge',
      'list-knowledge-sources',
      'insert-many',
      'delete-many',
      'update-many',
      'drop-collection',
    ];
    for (const n of names) {
      assert.ok(!banned.includes(n) && !n.startsWith('atlas'), `unexpected tool ${n}`);
    }
  } finally {
    child.kill();
  }
});
