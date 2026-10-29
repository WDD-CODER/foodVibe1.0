'use strict';
/**
 * Plan 507 — an origin outside ALLOWED_ORIGIN gets a plain 403 (never a 500 / server.unhandled),
 * logged once per origin. Allowed origins and requests without Origin behave as before.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');

let app;
let logs;

beforeAll(async () => {
  app = await buildTestApp();
  logs = captureLogs('warn');
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

describe('CORS origin refusal', () => {
  it('answers a disallowed origin with 403 and no CORS header', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:9876');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Origin not allowed' });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.body.stack).toBeUndefined();
  });

  it('logs the same rejected origin once', async () => {
    const origin = 'http://localhost:9999';
    await request(app).get('/api/v1/health').set('Origin', origin);
    await request(app).get('/api/v1/health').set('Origin', origin);
    const rejected = logs.byEvent('cors.origin_rejected').filter(r => r.origin === origin);
    expect(rejected).toHaveLength(1);
    expect(logs.byEvent('server.unhandled')).toHaveLength(0);
  });

  it('lets an allowed origin through', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:4200');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('lets a request with no Origin through', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});
