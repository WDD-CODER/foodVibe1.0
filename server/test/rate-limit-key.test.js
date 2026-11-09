'use strict';
/** Plan 528 — the AI limiter's key is `user:<id>` with an IPv6-safe IP fallback. */
const express = require('express');
const request = require('supertest');
const { ipKeyGenerator } = require('express-rate-limit');
const { createRateLimiter, userOrIpKey } = require('../middleware/rate-limit');

describe('userOrIpKey', () => {
  it('keys a signed-in user by id', () => {
    expect(userOrIpKey({ user: { userId: 'u1' }, ip: '1.2.3.4' })).toBe('user:u1');
  });

  it('keys an IPv6 address by its subnet, not the raw address', () => {
    const key = userOrIpKey({ ip: '2001:db8::1' });
    expect(key).toBe(ipKeyGenerator('2001:db8::1'));
    expect(key).not.toBe('2001:db8::1');
  });

  it('does not log ERR_ERL_KEY_GEN_IPV6 when used as a limiter key', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = express();
    app.get('/x', createRateLimiter({ windowMs: 60000, max: 5, message: 'slow', keyGenerator: userOrIpKey }), (_req, res) =>
      res.json({ ok: true }),
    );
    const res = await request(app).get('/x');
    const logged = [...err.mock.calls, ...warn.mock.calls].flat().map(String).join('\n');
    err.mockRestore();
    warn.mockRestore();
    expect(res.status).toBe(200);
    expect(logged).not.toContain('ERR_ERL_KEY_GEN_IPV6');
  });
});
