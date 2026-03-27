require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDb } = require('./db');
const authRouter = require('./routes/auth');
const genericRouter = require('./routes/generic');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:4200';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const corsOptions = {
  origin: ALLOWED_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 204,
};

// Respond 204 to OPTIONS preflights on every route before they reach handlers.
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// Auth routes bypass JWT middleware (they issue tokens, not consume them).
// Data routes require JWT for all write operations (POST / PUT / DELETE).
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/data', genericRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

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
