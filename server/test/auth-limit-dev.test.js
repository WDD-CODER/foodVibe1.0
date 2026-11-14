'use strict';
/** Plan 610 — sign-in limit is skipped in development and still applies in production. */

const request = require('supertest');

const { buildTestApp, teardownTestApp } = require('./helpers/app');

let app;
const originalEnv = process.env.NODE_ENV;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

afterEach(() => {
  process.env.NODE_ENV = originalEnv;
});

async function signIns(count) {
  const statuses = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `nobody-${i}@example.com`, password: 'wrong-password' });
    statuses.push(res.status);
  }
  return statuses;
}

describe('login limiter and NODE_ENV', () => {
  it('never returns 429 in development', async () => {
    process.env.NODE_ENV = 'development';
    const statuses = await signIns(15);
    expect(statuses).not.toContain(429);
  });

  it('returns 429 on the 11th sign-in in production', async () => {
    process.env.NODE_ENV = 'production';
    const statuses = await signIns(15);
    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses[10]).toBe(429);
  });
});
