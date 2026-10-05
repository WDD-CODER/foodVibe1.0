'use strict';
/**
 * Plan 385 — the /api/v1/data write limiter is keyed per user, not per IP.
 * DATA_WRITE_LIMIT_MAX is read when generic.js loads, so it is set before buildTestApp();
 * vitest runs each file in its own process, so this budget can't leak into other files.
 */

const request = require('supertest');

process.env.DATA_WRITE_LIMIT_MAX = '3';
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

const deleteAs = (token, id) =>
  request(app).delete(`/api/v1/data/products/${id}`).set('Authorization', `Bearer ${token}`);

describe('data write limiter (DATA_WRITE_LIMIT_MAX=3)', () => {
  it('user A exhausting the limit does not 429 user B on the same IP', async () => {
    const tokenA = signTestToken({ userId: 'limitA', role: 'user' });
    const tokenB = signTestToken({ userId: 'limitB', role: 'user' });

    for (let i = 0; i < 3; i++) {
      const res = await deleteAs(tokenA, `missing-${i}`);
      expect(res.status).not.toBe(429);
    }
    expect((await deleteAs(tokenA, 'missing-3')).status).toBe(429);

    expect((await deleteAs(tokenB, 'missing-0')).status).not.toBe(429);
  });

  it('GET requests are never limited', async () => {
    const tokenC = signTestToken({ userId: 'limitC', role: 'user' });
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/v1/data/products').set('Authorization', `Bearer ${tokenC}`);
      expect(res.status).toBe(200);
    }
  });

  it('a forged token does not get its own bucket (falls back to the IP)', async () => {
    const forged = require('jsonwebtoken').sign({ userId: 'forged', role: 'user' }, 'wrong-secret');
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await deleteAs(forged, `x-${i}`)).status);
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
  });
});
