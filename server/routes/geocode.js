'use strict';
/**
 * Plan 373 (Human 2026-11-23, todo V2): GET /api/v1/geocode/reverse?lat=<n>&lng=<n> -> { address } | { address: null }.
 * Turns the spot a chef saved with "use my current location" into a street address, through OpenStreetMap Nominatim
 * (free; its usage policy asks for at most one request per second and an identifying User-Agent).
 * The call is made here, never from the browser, so no CSP change. Only the two numbers leave our server — no user,
 * business or venue data. Log lines carry no coordinates.
 */
const { Router } = require('express');
const { createRateLimiter } = require('../middleware/rate-limit');
const { verifyToken } = require('../middleware/auth');

const router = Router();

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'FoodVibe/1.0 (venue address lookup)';
const TIMEOUT_MS = 8000;

const geocodeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: req => String(req.user?.userId ?? 'anonymous'),
  validate: { keyGeneratorIpFallback: false },
  message: 'Too many address lookups, please try again later',
});

/** A finite number inside [min, max], else null. */
function coord(raw, min, max) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** "street number, city" from Nominatim's address parts; falls back to its display name. */
function shortAddress(body) {
  const a = body?.address ?? {};
  const street = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(' ');
  const city = a.city ?? a.town ?? a.village ?? a.suburb ?? a.municipality;
  const short = [street, city].filter(Boolean).join(', ');
  if (short) return short;
  return typeof body?.display_name === 'string' && body.display_name.trim() ? body.display_name.trim() : null;
}

// One request per second for the whole server, as Nominatim asks.
let lastCallAt = 0;
async function waitTurn() {
  const wait = lastCallAt + 1000 - Date.now();
  lastCallAt = Math.max(Date.now(), lastCallAt + 1000);
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
}

/** For tests: forget the last call time. */
function _resetGeocodeThrottle() {
  lastCallAt = 0;
}

router.get('/reverse', verifyToken, geocodeLimiter, async (req, res) => {
  const lat = coord(req.query.lat, -90, 90);
  const lng = coord(req.query.lng, -180, 180);
  if (lat === null || lng === null) return res.status(400).json({ error: 'BAD_COORDS' });
  try {
    await waitTurn();
    const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&accept-language=he&lat=${lat}&lon=${lng}`;
    const upstream = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!upstream.ok) {
      req.log.warn({ event: 'geocode.reverse.upstream', status: upstream.status });
      return res.json({ address: null });
    }
    const address = shortAddress(await upstream.json());
    req.log.info({ event: 'geocode.reverse.done', found: address !== null });
    return res.json({ address });
  } catch (err) {
    req.log.warn({ event: 'geocode.reverse.failed', name: err?.name });
    return res.json({ address: null });
  }
});

module.exports = router;
module.exports._resetGeocodeThrottle = _resetGeocodeThrottle;
module.exports.shortAddress = shortAddress;
