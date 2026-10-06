const BOOT_START = Date.now(); // 1d: captured at module load, logged once listen() succeeds — the delta is the real cold-start cost (DNS/env setup + all requires + Atlas connect + seedMasterData).
const app = require('./app');
const { connectDb } = require('./db');
const { seedMasterData } = require('./services/seed-master');
const { logger } = require('./logger');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:4200,http://localhost:4201,http://localhost:4300').split(',').map(s => s.trim())

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
connectDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      logger.info({ event: 'server.start.ok', port: Number(PORT), bootMs: Date.now() - BOOT_START, corsOrigins: ALLOWED_ORIGINS });
    });
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.once(signal, () => {
        logger.info({ event: 'server.shutdown.begin', signal });
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5000).unref();
      });
    }
    // Runs after listen() so cold-start latency isn't gated on it — idempotent
    // near-instant no-op on any already-seeded DB (see seed-master.js).
    seedMasterData().catch(err => logger.error({ err, event: 'seed.master.failed' }));
  })
  .catch(err => {
    logger.fatal({ err, event: 'mongo.connection.failed' });
    process.exit(1);
  });
