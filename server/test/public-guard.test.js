'use strict';
/** Plan 543 (C-GUEST) — the public limiter, the honeypot and the read-back token helper, on a small test app. */
const express = require('express');
const request = require('supertest');
const { ipKeyGenerator } = require('express-rate-limit');
const { publicLimiter, ipAndSlugKey } = require('../middleware/rate-limit');
const { honeypot } = require('../middleware/honeypot');
const { newPublicToken, isPublicTokenShape } = require('../utils/public-token');

function limiterApp() {
  const app = express();
  app.post('/:slug/x', publicLimiter, (_req, res) => res.status(201).json({ ok: true }));
  app.get('/:slug/x', publicLimiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('ipAndSlugKey', () => {
  it('joins the IPv6-safe IP key and the slug', () => {
    expect(ipAndSlugKey({ ip: '1.2.3.4', params: { slug: 'dana' } })).toBe(`${ipKeyGenerator('1.2.3.4')}|dana`);
    expect(ipAndSlugKey({ ip: '2001:db8::1', params: { slug: 'dana' } })).toBe(`${ipKeyGenerator('2001:db8::1')}|dana`);
  });

  it('uses an empty slug when the route has none', () => {
    expect(ipAndSlugKey({ ip: '1.2.3.4' })).toBe(`${ipKeyGenerator('1.2.3.4')}|`);
  });
});

describe('publicLimiter', () => {
  it('answers 201 to 20 writes from one IP on one slug and 429 to the 21st; another slug stays free; no IPv6 key error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = limiterApp();
    for (let i = 0; i < 20; i++) {
      const res = await request(app).post('/slug-a/x').send({});
      expect(res.status).toBe(201);
    }
    const blocked = await request(app).post('/slug-a/x').send({});
    const other = await request(app).post('/slug-b/x').send({});
    const logged = [...err.mock.calls, ...warn.mock.calls].flat().map(String).join('\n');
    err.mockRestore();
    warn.mockRestore();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many requests' });
    expect(other.status).toBe(201);
    expect(logged).not.toContain('ERR_ERL_KEY_GEN_IPV6');
  });

  it('does not count GET requests', async () => {
    const app = limiterApp();
    for (let i = 0; i < 25; i++) {
      const res = await request(app).get('/slug-get/x');
      expect(res.status).toBe(200);
    }
    for (let i = 0; i < 20; i++) {
      const res = await request(app).post('/slug-get/x').send({});
      expect(res.status).toBe(201);
    }
    expect((await request(app).post('/slug-get/x').send({})).status).toBe(429);
  });
});

describe('honeypot', () => {
  function honeypotApp(next) {
    const app = express();
    app.use(express.json());
    app.post('/x', honeypot, (_req, res) => {
      next();
      res.status(201).json({ ok: true, wrote: true });
    });
    return app;
  }

  it('answers 201 { ok: true } to a filled website field and never calls the next handler', async () => {
    const next = vi.fn();
    const res = await request(honeypotApp(next)).post('/x').send({ website: 'http://spam.example', name: 'bot' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes an empty or missing website field through', async () => {
    const next = vi.fn();
    const app = honeypotApp(next);
    const empty = await request(app).post('/x').send({ website: '', name: 'Dana' });
    const missing = await request(app).post('/x').send({ name: 'Dana' });
    expect(empty.body).toEqual({ ok: true, wrote: true });
    expect(missing.body).toEqual({ ok: true, wrote: true });
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('passes a request with no body through', async () => {
    const next = vi.fn();
    const app = express();
    app.post('/x', honeypot, (_req, res) => {
      next();
      res.status(201).json({ ok: true, wrote: true });
    });
    const res = await request(app).post('/x');
    expect(res.body).toEqual({ ok: true, wrote: true });
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('newPublicToken', () => {
  it('returns 32 base64url characters', () => {
    const token = newPublicToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('draws 10,000 different tokens', () => {
    const seen = new Set();
    for (let i = 0; i < 10000; i++) seen.add(newPublicToken());
    expect(seen.size).toBe(10000);
  });
});

describe('isPublicTokenShape', () => {
  it('accepts a token and refuses anything else', () => {
    expect(isPublicTokenShape(newPublicToken())).toBe(true);
    expect(isPublicTokenShape('abcdefghijklmnopqrstuvwxyzABCD-_')).toBe(true);
    expect(isPublicTokenShape('abcdefghijklmnopqrstuvwxyzABCD-')).toBe(false);
    expect(isPublicTokenShape('abcdefghijklmnopqrstuvwxyzABCD-_x')).toBe(false);
    expect(isPublicTokenShape('abcdefghijklmnopqrstuvwxyzABCD+/')).toBe(false);
    expect(isPublicTokenShape(null)).toBe(false);
    expect(isPublicTokenShape(12345)).toBe(false);
  });
});
