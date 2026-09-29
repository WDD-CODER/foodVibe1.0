const BOOT_START = Date.now(); // 1d: captured at module load, logged once listen() succeeds — the delta is the real cold-start cost (DNS/env setup + all requires + Atlas connect + seedMasterData).
const app = require('./app');
const { connectDb } = require('./db');
const { seedMasterData } = require('./services/seed-master');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:4200,http://localhost:4201,http://localhost:4300').split(',').map(s => s.trim())

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`foodVibe server listening on port ${PORT} (boot ${Date.now() - BOOT_START}ms)`);
      console.log(`CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
    // Runs after listen() so cold-start latency isn't gated on it — idempotent
    // near-instant no-op on any already-seeded DB (see seed-master.js).
    seedMasterData().catch(err => console.error('[seed-master] failed:', err.message));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
