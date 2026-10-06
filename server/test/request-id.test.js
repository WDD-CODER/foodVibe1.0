'use strict';
/**
 * Plan 383 — request ids + structured logging: every response carries X-Request-Id, a valid
 * incoming id is echoed, an invalid one is replaced, and a route failure logs (and persists to
 * app_logs) with the same id the client saw.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let app;
let logs;

beforeAll(async () => {
  app = await buildTestApp();
  logs = captureLogs();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Polls app_logs for the fire-and-forget bridge write; null when nothing arrives. */
async function findLog(filter, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const doc = await testDb().collection('app_logs').findOne(filter);
    if (doc) return doc;
    await new Promise(r => setTimeout(r, 25));
  }
  return null;
}

describe('X-Request-Id', () => {
  it('is set on every response as a UUID', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('echoes a well-formed incoming id', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'abc12345-test');
    expect(res.headers['x-request-id']).toBe('abc12345-test');
  });

  it('replaces a malformed incoming id', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'bad id; drop');
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('is exposed to cross-origin frontends', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:4201');
    expect(res.headers['access-control-expose-headers']).toContain('X-Request-Id');
  });
});

describe('route failure logging', () => {
  it('logs data.query.failed with the response id and persists it to app_logs', async () => {
    const db = testDb();
    const realCollection = db.collection.bind(db);
    vi.spyOn(db, 'collection').mockImplementation((name, ...rest) => {
      if (name === 'products') throw new Error('forced query failure');
      return realCollection(name, ...rest);
    });

    const res = await request(app).get('/api/v1/data/products');
    expect(res.status).toBe(500);
    const id = res.headers['x-request-id'];
    expect(id).toMatch(UUID);

    const record = logs.byEvent('data.query.failed').find(r => r.requestId === id);
    expect(record).toBeDefined();
    expect(record.level).toBe(50);
    expect(record.service).toBe('foodvibe-api');
    expect(record.err.message).toBe('forced query failure');

    vi.restoreAllMocks();
    const doc = await findLog({ event: 'data.query.failed', requestId: id });
    expect(doc).toMatchObject({ source: 'server', level: 'error', requestId: id });
    expect(doc.context.err.message).toBe('forced query failure');
  });

  it('writes one JSON request line per API call, none for static assets', async () => {
    const res = await request(app).get('/api/v1/health');
    const id = res.headers['x-request-id'];
    await new Promise(r => setTimeout(r, 25));
    const line = logs.byEvent('http.request.ok').find(r => r.requestId === id);
    expect(line).toMatchObject({ req: { method: 'GET', url: '/api/v1/health' }, res: { statusCode: 200 } });
    expect(line.req.headers).toBeUndefined();

    await request(app).get('/assets/data/dictionary.json');
    expect(logs.records.some(r => r.req?.url === '/assets/data/dictionary.json')).toBe(false);
  });
});
