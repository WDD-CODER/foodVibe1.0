'use strict';
/**
 * Plan 382 — POST /api/v1/log: client log ingest into the `app_logs` sink.
 * The route answers 202 before the sink write lands, so assertions poll the collection.
 * The rate-limit test runs last: the 60/min budget is per IP and shared by every test here.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

const event = (overrides = {}) => ({
  level: 'error',
  event: 'test.route.failed',
  message: 'boom',
  timestamp: '2026-10-05T10:00:00.000Z',
  ...overrides,
});

const post = (body, token) => {
  const req = request(app).post('/api/v1/log').set('Content-Type', 'application/json');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body);
};

/** Waits for the fire-and-forget sink write; null when nothing arrives. */
async function findLog(eventName, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const doc = await testDb().collection('app_logs').findOne({ event: eventName });
    if (doc) return doc;
    await new Promise(r => setTimeout(r, 25));
  }
  return null;
}

describe('POST /api/v1/log', () => {
  it('accepts a valid event with 202 and stores it', async () => {
    const res = await post(event({ event: 'test.valid.failed', url: '/recipe-book', requestId: 'r-1' }));
    expect(res.status).toBe(202);

    const doc = await findLog('test.valid.failed');
    expect(doc).toMatchObject({
      source: 'client',
      level: 'error',
      message: 'boom',
      url: '/recipe-book',
      requestId: 'r-1',
      clientTs: '2026-10-05T10:00:00.000Z',
      userId: null,
    });
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  it('accepts camelCase event segments', async () => {
    expect((await post(event({ event: 'crud.menuEvent.get_error' }))).status).toBe(202);
  });

  it('rejects an event name that does not match the pattern with 400', async () => {
    for (const name of ['nodots', 'has space.x', 'trailing.', '.leading']) {
      expect((await post(event({ event: name }))).status).toBe(400);
    }
  });

  it('rejects a context over 4 kb with 400', async () => {
    const res = await post(event({ event: 'test.bigctx.failed', context: { blob: 'x'.repeat(5000) } }));
    expect(res.status).toBe(400);
    expect(await findLog('test.bigctx.failed', 300)).toBeNull();
  });

  it('rejects unknown fields (no IP / PII smuggling) with 400', async () => {
    expect((await post(event({ ip: '1.2.3.4' }))).status).toBe(400);
  });

  it('answers 413 for a body over 16 kb and 400 for malformed JSON', async () => {
    expect((await post(event({ message: 'x'.repeat(20000) }))).status).toBe(413);
    expect((await post('{bad')).status).toBe(400);
  });

  it('does not persist info by default', async () => {
    delete process.env.LOG_PERSIST_INFO;
    expect((await post(event({ level: 'info', event: 'test.info.default' }))).status).toBe(202);
    expect(await findLog('test.info.default', 300)).toBeNull();
  });

  it('persists info when LOG_PERSIST_INFO=1', async () => {
    process.env.LOG_PERSIST_INFO = '1';
    try {
      expect((await post(event({ level: 'info', event: 'test.info.optin' }))).status).toBe(202);
      expect(await findLog('test.info.optin')).not.toBeNull();
    } finally {
      delete process.env.LOG_PERSIST_INFO;
    }
  });

  it('sets userId from a valid Bearer token', async () => {
    const token = signTestToken({ userId: 'log-user-1', name: 'Never Stored', role: 'user' });
    expect((await post(event({ event: 'test.authed.failed' }), token)).status).toBe(202);
    const doc = await findLog('test.authed.failed');
    expect(doc.userId).toBe('log-user-1');
    expect(JSON.stringify(doc)).not.toContain('Never Stored');
  });

  it('records an invalid token as anonymous instead of answering 401', async () => {
    const forged = require('jsonwebtoken').sign({ userId: 'forged' }, 'wrong-secret');
    expect((await post(event({ event: 'test.forged.failed' }), forged)).status).toBe(202);
    expect((await findLog('test.forged.failed')).userId).toBeNull();
  });

  it('answers 429 once the 60/min per-IP budget is spent', async () => {
    const statuses = [];
    for (let i = 0; i < 61; i++) statuses.push((await post(event({ event: 'test.flood.failed' }))).status);
    expect(statuses.at(-1)).toBe(429);
    expect(statuses).not.toContain(401);
  });
});
