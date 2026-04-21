require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { connectDb } = require('./db');
const { seedMasterData } = require('./services/seed-master');
const authRouter = require('./routes/auth');
const genericRouter = require('./routes/generic');
const aiRouter = require('./routes/ai');

const app = express();
app.set('trust proxy', 1); // Required for Render/reverse-proxy: enables correct IP from X-Forwarded-For
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:4200,http://localhost:4201,http://localhost:4300').split(',').map(s => s.trim())

const STATIC_DIR = path.join(__dirname, '..', 'dist', 'food-vibe1.0', 'browser')

// ---------------------------------------------------------------------------
// Security middleware — runs first so ALL responses (static assets + API) get
// the correct security headers.
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      // Angular injects <style> tags for component encapsulation at runtime.
      styleSrc:       ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:        ["'self'", "https://fonts.gstatic.com"],
      // blob: needed for Excel/image export (FileReader → Blob → URL.createObjectURL)
      imgSrc:         ["'self'", "data:", "blob:"],
      connectSrc:     ["'self'"],
      objectSrc:      ["'none'"],
      frameSrc:       ["'none'"],
      upgradeInsecureRequests: [],
      // Angular's CSS optimization: <link media="print" onload="this.media='all'">
      // Helmet defaults scriptSrcAttr to 'none' which blocks this inline handler.
      // 'unsafe-hashes' + the SHA-256 of the exact handler text allows only this one value.
      scriptSrcAttr:  ["'unsafe-hashes'", "'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='"],
    }
  }
}));

// ---------------------------------------------------------------------------
// Static files — served AFTER Helmet so assets also carry security headers.
// MUST still come before /api/ catch-all.
// ---------------------------------------------------------------------------
app.use(express.static(STATIC_DIR))

app.use(morgan('tiny'));

const corsOptions = {
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS origin not allowed'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 204,
}

// Respond 204 to OPTIONS preflights on every route before they reach handlers.
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// Auth routes bypass JWT middleware (they issue tokens, not consume them).
// Data routes require JWT for all write operations (POST / PUT / DELETE).
// ---------------------------------------------------------------------------
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/data', genericRouter);
app.use('/api/v1/ai', aiRouter);

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------------------------------------------------------------------------
// Angular SPA fallback — catch-all after all /api/ routes
// API 404s must return JSON, not index.html.
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.sendFile(path.join(STATIC_DIR, 'index.html'))
})

// ---------------------------------------------------------------------------
// Global error handler — never expose stack traces in production
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[unhandled]', err.message);
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(500).json({ error: err.message, stack: err.stack });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
connectDb()
  .then(() => seedMasterData())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`foodVibe server listening on port ${PORT}`);
      console.log(`CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
