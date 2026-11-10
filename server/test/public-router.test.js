'use strict';
/** Plan 543 (C-GUEST, ADR 0030) — the public door at /api/v1/public on the real app. */
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  await testDb().collection('usageDays').deleteMany({});
});

const OWNER = { Authorization: `Bearer ${signTestToken({ userId: 'ownerP', role: 'user' })}` };

/** recordUsage writes after `finish`; give a fire-and-forget write the time to land. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

describe('GET /api/v1/public/health', () => {
  it('answers 200 { ok: true } with Cache-Control: no-store and no token', async () => {
    const res = await request(app).get('/api/v1/public/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('answers the same with a member token and writes no usage record', async () => {
    const res = await request(app).get('/api/v1/public/health').set(OWNER);
    await settle();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(await testDb().collection('usageDays').countDocuments({})).toBe(0);
  });

  it('a member route does write a usage record (the check above can fail)', async () => {
    await request(app).get('/api/v1/business').set(OWNER);
    await settle();
    expect(await testDb().collection('usageDays').countDocuments({ userId: 'ownerP' })).toBe(1);
  });
});

describe('anything else under /api/v1/public', () => {
  it('POST /api/v1/public/anything with no token answers JSON 404 NOT_FOUND', async () => {
    const res = await request(app).post('/api/v1/public/anything').send({ name: 'x' });
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: 'NOT_FOUND' });
  });

  it('GET of an unknown path answers JSON 404 NOT_FOUND with no-store', async () => {
    const res = await request(app).get('/api/v1/public/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND' });
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
