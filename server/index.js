require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDb } = require('./db');
const authRouter = require('./routes/auth');
const genericRouter = require('./routes/generic');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:4200';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());

app.use(morgan('tiny'));

const corsOptions = {
  origin: ALLOWED_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 204,
};

// Respond 204 to OPTIONS preflights on every route before they reach handlers.
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Routes
// Auth routes bypass JWT middleware (they issue tokens, not consume them).
// Data routes require JWT for all write operations (POST / PUT / DELETE).
// ---------------------------------------------------------------------------
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/data', genericRouter);

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

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
  .then(() => {
    app.listen(PORT, () => {
      console.log(`foodVibe server listening on port ${PORT}`);
      console.log(`CORS origin: ${ALLOWED_ORIGIN}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
