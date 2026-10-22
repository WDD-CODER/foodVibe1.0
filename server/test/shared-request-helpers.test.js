'use strict';
/**
 * Plan 456 — the shared request helpers: one access-token check (verifyAccessToken), one
 * platform-admin predicate (isPlatformAdmin), one rate-limiter factory (createRateLimiter) and
 * the AI body checks (requireFields / badRequest). Each answers exactly what the hand-written
 * copies it replaced answered.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const SECRET = 'test-access-secret-456';

let auth;
let createRateLimiter;
let badRequest;
let requireFields;

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = SECRET;
  auth = require('../middleware/auth');
  ({ createRateLimiter } = require('../middleware/rate-limit'));
  ({ badRequest, requireFields } = require('../middleware/validate'));
});

const withBearer = (token) => ({ headers: token === undefined ? {} : { authorization: `Bearer ${token}` } });

describe('verifyAccessToken', () => {
  it('returns the payload of a valid Bearer access token', () => {
    const token = jwt.sign({ userId: 'u1', businessId: 'b1' }, SECRET, { expiresIn: '5m' });
    expect(auth.verifyAccessToken(withBearer(token))).toMatchObject({ userId: 'u1', businessId: 'b1' });
  });

  it('returns null without a token, for a non-Bearer header, a bad signature or an expired token', () => {
    expect(auth.verifyAccessToken(withBearer(undefined))).toBeNull();
    expect(auth.verifyAccessToken({ headers: { authorization: 'Basic abc' } })).toBeNull();
    expect(auth.verifyAccessToken(withBearer(jwt.sign({ userId: 'u1' }, 'other-secret')))).toBeNull();
    const expired = jwt.sign({ userId: 'u1', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect(auth.verifyAccessToken(withBearer(expired))).toBeNull();
  });
});

describe('isPlatformAdmin', () => {
  it('is true only for isPlatformAdmin === true (the legacy role is never read)', () => {
    expect(auth.isPlatformAdmin({ user: { isPlatformAdmin: true } })).toBe(true);
    expect(auth.isPlatformAdmin({ user: { isPlatformAdmin: false, role: 'admin' } })).toBe(false);
    expect(auth.isPlatformAdmin({ user: { isPlatformAdmin: 'true' } })).toBe(false);
    expect(auth.isPlatformAdmin({ user: null })).toBe(false);
    expect(auth.isPlatformAdmin({})).toBe(false);
  });

  it('drives requirePlatformAdmin: 403 for anyone else, next() for a platform admin', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    auth.requirePlatformAdmin({ user: { isPlatformAdmin: false } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    auth.requirePlatformAdmin({ user: { isPlatformAdmin: true } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('createRateLimiter', () => {
  it('sends standard RateLimit headers, no legacy X-RateLimit headers, and 429 { error: message }', async () => {
    const app = express();
    app.get('/x', createRateLimiter({ windowMs: 60_000, max: 2, message: 'Slow down' }), (_req, res) => res.json({ ok: true }));

    const first = await request(app).get('/x');
    expect(first.status).toBe(200);
    expect(first.headers['ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-limit']).toBeUndefined();

    await request(app).get('/x');
    const third = await request(app).get('/x');
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ error: 'Slow down' });
  });

  it('passes other options through (skip)', async () => {
    const app = express();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: 'No', skip: (req) => req.method === 'GET' });
    app.all('/x', limiter, (_req, res) => res.json({ ok: true }));
    await request(app).get('/x');
    expect((await request(app).get('/x')).status).toBe(200);
    await request(app).post('/x');
    expect((await request(app).post('/x')).status).toBe(429);
  });
});

describe('requireFields / badRequest', () => {
  const fakeRes = () => {
    const res = { statusCode: 0, body: undefined };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
  };

  it('passes a non-blank string for text and a non-null object for object', () => {
    const res = fakeRes();
    expect(requireFields(res, { prompt: ' hi ', draft: {} }, { prompt: 'text', draft: 'object' })).toBe(true);
    expect(res.statusCode).toBe(0);
  });

  it('answers 400 "<field> is required" for the first failing field, in rule order', () => {
    for (const body of [{}, { instruction: '   ' }, { instruction: 5 }, undefined]) {
      const res = fakeRes();
      expect(requireFields(res, body, { instruction: 'text', currentRecipe: 'object' })).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'instruction is required' });
    }
    const res = fakeRes();
    expect(requireFields(res, { instruction: 'x', currentRecipe: 'not an object' }, { instruction: 'text', currentRecipe: 'object' })).toBe(false);
    expect(res.body).toEqual({ error: 'currentRecipe is required' });
  });

  it('badRequest sends 400 { error, ...extra }', () => {
    const res = fakeRes();
    badRequest(res, 'TEXT_TOO_LONG', { max: 10 });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'TEXT_TOO_LONG', max: 10 });
  });
});
