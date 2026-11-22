'use strict';
/**
 * Plan 373 — a venue with tour video links and a saved location passes the shared schema,
 * and a PUT with `location: null` clears a stored location.
 */

const request = require('supertest');
const { venueSchema } = require('../generated/schemas/entities');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { venueBody, stored } = require('./helpers/v2-docs');

const base = {
  _id: 'v1',
  schemaVersion: 2,
  userId: 'u1',
  businessId: 'b_u1',
  createdBy: 'u1',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  nameHebrew: 'אולם',
  environmentType: 'outdoor_field',
  availableInfrastructure: []
};
const ok = extra => venueSchema.safeParse({ ...base, ...extra }).success;

describe('venue tour videos and location', () => {
  it('accepts videos and a location', () => {
    expect(ok({
      videos: [
        { url: 'https://youtu.be/abc', visitDate: 1700000000000, note: 'סיור ראשון' },
        { url: 'https://drive.google.com/file/d/x' }
      ],
      location: { lat: 32.0853, lng: 34.7818, accuracy: 15 }
    })).toBe(true);
  });

  it('still accepts a venue without either field, and a null location (cleared)', () => {
    expect(ok({})).toBe(true);
    expect(ok({ location: null })).toBe(true);
  });

  it('rejects a string lat, a missing lng and an unknown video field', () => {
    expect(ok({ location: { lat: '32.08', lng: 34.78 } })).toBe(false);
    expect(ok({ location: { lat: 32.08 } })).toBe(false);
    expect(ok({ videos: [{ url: 'https://x.y', title: 'a' }] })).toBe(false);
  });
});

describe('PUT /api/v1/data/venues/:id clears a saved location', () => {
  let app;
  const token = () => signTestToken({ userId: 'userA', businessId: 'b_userA', role: 'user' });

  beforeAll(async () => {
    app = await buildTestApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestApp();
  });

  beforeEach(async () => {
    await testDb().collection('venues').deleteMany({});
    await testDb().collection('venues').insertOne(stored(venueBody({ location: { lat: 32.1, lng: 34.8, accuracy: 15 } }), {
      _id: 'v1',
      userId: 'userA'
    }));
  });

  it('location: null on PUT leaves the venue with no location on GET', async () => {
    const put = await request(app)
      .put('/api/v1/data/venues/v1')
      .set('Authorization', `Bearer ${token()}`)
      .send(venueBody({ location: null }));
    expect(put.status).toBe(200);

    const get = await request(app)
      .get('/api/v1/data/venues/v1')
      .set('Authorization', `Bearer ${token()}`);
    expect(get.status).toBe(200);
    expect(get.body.location ?? null).toBeNull();
  });

  it('a PUT without the key keeps the stored location (why the form must send null)', async () => {
    await request(app)
      .put('/api/v1/data/venues/v1')
      .set('Authorization', `Bearer ${token()}`)
      .send(venueBody({ capacity: 60 }));
    const get = await request(app)
      .get('/api/v1/data/venues/v1')
      .set('Authorization', `Bearer ${token()}`);
    expect(get.body.location).toEqual({ lat: 32.1, lng: 34.8, accuracy: 15 });
  });
});
