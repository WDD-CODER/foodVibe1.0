const BOOT_START = Date.now(); // 1d: captured at module load, logged once listen() succeeds — the delta is the real cold-start cost (DNS/env setup + all requires + Atlas connect + seedMasterData).
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { connectDb } = require('./db');
const { seedMasterData } = require('./services/seed-master');
const authRouter = require('./routes/auth');
const genericRouter = require('./routes/generic');
const aiRouter = require('./routes/ai')
const adminRouter = require('./routes/admin');

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
// gzip/deflate compression — large JSON list responses (PRODUCT_LIST,
// RECIPE_LIST, DISH_LIST can run 100s of KB–1MB+ for accounts with big
// catalogs) shrink ~70-90% over the wire for near-zero CPU cost. Runs after
// Helmet (headers still apply to compressed responses) and before every
// route that produces a body.
// ---------------------------------------------------------------------------
app.use(compression());

// ---------------------------------------------------------------------------
// Request logging — MUST come before express.static: express.static terminates
// the response for any file it matches, so requests for static assets never
// reach morgan if it's registered after. Format includes :response-time (stops
// at headers-written, not body-transfer-complete — a fast number here does not
// prove a large JSON response was fast for the user) and :res[content-length]
// (logs "-" for compressed responses since compression() switches to chunked
// transfer encoding and drops the header; see [data/query] logging in
// generic.js for the real pre-compression byte count).
// ---------------------------------------------------------------------------
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// ---------------------------------------------------------------------------
// Static files — served AFTER Helmet so assets also carry security headers,
// and AFTER morgan so asset requests are logged (see the morgan block above).
// MUST still come before /api/ catch-all.
//
// `ng build` content-hashes the JS/CSS bundles it generates ("outputHashing": "all"
// in angular.json), so those filenames can never change content — safe to cache for a
// year and skip revalidation entirely. Before this, express.static defaulted to
// maxAge: 0 and every page load spent ~30 conditional GETs round-tripping to a
// possibly-cold origin just to be told "304 Not Modified".
//
// Only the content-hashed bundles are safe to pin: their name changes whenever their
// content does. Everything else copied out of `public/` keeps its name across deploys —
// `assets/data/dictionary.json` above all, which every Hebrew UI string flows through —
// so pinning those would leave returning browsers stuck on a stale copy for a year with
// `immutable` telling them not to even ask. Those keep `no-cache`: they still revalidate
// and still return a 0-byte 304 when unchanged, exactly as before this change.
//
// index.html is in that same unhashed group. `index: false` additionally keeps
// express.static from serving it for "/" — that falls through to the SPA fallback below,
// which sets the same no-cache header in one place.
// ---------------------------------------------------------------------------
const HASHED_ASSET = /-[A-Z0-9]{8,}\.[a-z0-9]+$/

app.use(express.static(STATIC_DIR, {
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader(
      'Cache-Control',
      HASHED_ASSET.test(filePath) ? 'public, max-age=31536000, immutable' : 'no-cache'
    )
  }
}))

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
app.use('/api/v1/ai', aiRouter)
app.use('/api/v1/admin', adminRouter);

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------------------------------------------------------------------------
// Angular SPA fallback — catch-all after all /api/ routes
// API 404s must return JSON, not index.html.
//
// This path serves index.html itself and therefore bypasses the setHeaders
// callback on express.static above entirely. It must set Cache-Control on its
// own, or every deep-linked route ("/", "/recipe-book", …) would be cached for
// a year and returning browsers would never pick up a new deploy.
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.set('Cache-Control', 'no-cache')
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
      console.log(`foodVibe server listening on port ${PORT} (boot ${Date.now() - BOOT_START}ms)`);
      console.log(`CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
