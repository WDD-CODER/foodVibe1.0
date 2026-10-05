'use strict';
/** Plan 385 — DATA_WRITE_LIMIT_MAX=0 turns the /api/v1/data write limiter off. */

const request = require('supertest');

process.env.DATA_WRITE_LIMIT_MAX = '0';
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

describe('data write limiter (DATA_WRITE_LIMIT_MAX=0)', () => {
  it('never returns 429', async () => {
    const token = signTestToken({ userId: 'unlimited', role: 'user' });
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .delete(`/api/v1/data/products/missing-${i}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).not.toBe(429);
    }
  });
});
