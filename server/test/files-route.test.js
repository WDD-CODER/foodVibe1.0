'use strict';
/** Plan 619 (C-FILES): GET /api/v1/files/:id, GET /api/v1/admin/learning/status and the media-src policy. */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { setFileStoreForTests, createMemoryFileStore } = require('../services/file-store');
const { resetRetentionThrottle } = require('../jobs/retention');

let app;
beforeAll(async () => { app = await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const as = u => ({ Authorization: `Bearer ${signTestToken(u)}` });
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' };
const STAFF = { userId: 'st1', businessId: 'b1', businessRole: 'staff' };
const OTHER = { userId: 'own2', businessId: 'b2', businessRole: 'owner' };
const ADMIN = { userId: 'adm1', role: 'admin', businessId: 'bAdmin' };
const clearKeys = () => { for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete process.env[k]; };

const doc = (id, kind) => ({
  _id: id, businessId: 'b1', kind, mimeType: kind === 'voice' ? 'audio/webm' : 'image/png', bytes: 3, provider: 'cloudinary',
  providerId: 'fv/b1/' + id, resourceType: 'image', createdBy: 'own1', createdAt: Date.now(),
});

beforeEach(async () => {
  resetRetentionThrottle();
  setFileStoreForTests(createMemoryFileStore());
  await testDb().collection('storedFiles').deleteMany({});
  await testDb().collection('storedFiles').insertMany([doc('f_inv', 'invoice'), doc('f_voice', 'voice')]);
});
afterEach(() => setFileStoreForTests(null));

describe('GET /api/v1/files/:id', () => {
  it('200 { url } for the owner, expiring in 300 seconds', async () => {
    const res = await request(app).get('/api/v1/files/f_inv').set(as(OWNER));
    expect(res.status).toBe(200);
    const exp = Number(/exp=(\d+)/.exec(res.body.url)[1]);
    expect(Math.abs(exp - (Math.floor(Date.now() / 1000) + 300))).toBeLessThanOrEqual(2);
  });
  it('404 for another business and for an unknown id', async () => {
    expect((await request(app).get('/api/v1/files/f_inv').set(as(OTHER))).status).toBe(404);
    expect((await request(app).get('/api/v1/files/nope').set(as(OWNER))).status).toBe(404);
  });
  it('staff: 403 for an invoice file, 200 for a voice file', async () => {
    expect((await request(app).get('/api/v1/files/f_inv').set(as(STAFF))).status).toBe(403);
    expect((await request(app).get('/api/v1/files/f_voice').set(as(STAFF))).status).toBe(200);
  });
  it('401 without a token', async () => {
    expect((await request(app).get('/api/v1/files/f_inv')).status).toBe(401);
  });
  it('503 FILE_STORE_OFF when the store is not configured', async () => {
    setFileStoreForTests(null);
    clearKeys();
    const res = await request(app).get('/api/v1/files/f_voice').set(as(OWNER));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'FILE_STORE_OFF' });
  });
});

describe('GET /api/v1/admin/learning/status', () => {
  it('false without keys, true with the in-memory store, 403 for an owner', async () => {
    setFileStoreForTests(null);
    clearKeys();
    expect((await request(app).get('/api/v1/admin/learning/status').set(as(ADMIN))).body).toEqual({ fileStore: false });
    setFileStoreForTests(createMemoryFileStore());
    expect((await request(app).get('/api/v1/admin/learning/status').set(as(ADMIN))).body).toEqual({ fileStore: true });
    expect((await request(app).get('/api/v1/admin/learning/status').set(as(OWNER))).status).toBe(403);
  });
});

describe('content security policy', () => {
  it('allows media from self and blob:', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-security-policy']).toContain("media-src 'self' blob:");
  });
});
