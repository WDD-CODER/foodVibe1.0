'use strict';
/**
 * Plan 336 — POST /api/v1/ai/generate-product-from-image rejects bad input
 * before any usage is counted or Gemini is called.
 * GEMINI_API_KEY is set before the app loads so the route gets past its 503 guard.
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

const post = (body, token = signTestToken({ userId: 'photoUser', role: 'user' })) =>
  request(app)
    .post('/api/v1/ai/generate-product-from-image')
    .set('Authorization', `Bearer ${token}`)
    .send(body);

describe('POST /generate-product-from-image', () => {
  it('requires a token', async () => {
    const res = await request(app).post('/api/v1/ai/generate-product-from-image').send({});
    expect(res.status).toBe(401);
  });

  it('missing image → 400', async () => {
    const res = await post({ mimeType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('imageBase64 is required');
  });

  it('blank image → 400', async () => {
    const res = await post({ imageBase64: '   ', mimeType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('bad mime → 400', async () => {
    const res = await post({ imageBase64: 'aGVsbG8=', mimeType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('mimeType must be a valid image MIME type');
  });

  it('missing mime → 400', async () => {
    const res = await post({ imageBase64: 'aGVsbG8=' });
    expect(res.status).toBe(400);
  });
});
