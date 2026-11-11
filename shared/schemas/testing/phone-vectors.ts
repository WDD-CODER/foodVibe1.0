/**
 * Plan 545 (R-01): phone examples the server and the browser must agree on. Read by
 * `server/test/client-upsert.test.js` and `client-display.util.spec.ts`, so the two sides cannot drift.
 */
export const PHONE_VECTORS: readonly { input: string; normalized: string; key: string }[] = [
  { input: '052-123 4567', normalized: '0521234567', key: '521234567' },
  { input: '+972 52 123 4567', normalized: '972521234567', key: '521234567' },
  { input: '972521234567', normalized: '972521234567', key: '521234567' },
  { input: '123-4567', normalized: '1234567', key: '1234567' },
  { input: '03-123 4567', normalized: '031234567', key: '031234567' },
  { input: '+1 (212) 555-0123', normalized: '12125550123', key: '125550123' },
  { input: 'abc', normalized: '', key: '' }
]
