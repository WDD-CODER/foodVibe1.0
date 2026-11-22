'use strict';
// Plan 615 (C-REGISTRY): router filled by plans 619 and 630.
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth');
const { isFileStoreConfigured } = require('../services/file-store');
const { jerusalemDate } = require('../middleware/usage');
const { MASTER_BUSINESS_ID } = require('../utils/business-scope');
const { mayLearnFrom } = require('../utils/ai-learning');
const { buildLearningStats } = require('../utils/learning-stats');

const router = Router();

const DAY_MS = 86400000;
const DRAFT_LIMIT = 20000;

// Plan 619: is the private file store switched on (the three keys are set)?
router.get('/status', verifyToken, requirePlatformAdmin, (_req, res) => {
  res.json({ fileStore: isFileStoreConfigured() });
});

// Plan 630: accuracy per AI flow and model, and the size of the shared supplier brain. Counts only.
router.get('/stats', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    let days = 90;
    if (req.query.days !== undefined) {
      const raw = String(req.query.days);
      days = /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (!Number.isInteger(days) || days < 7 || days > 365) return res.status(400).json({ error: 'BAD_DAYS' });
    }
    const db = mongoose.connection.db;
    const now = Date.now();
    const businesses = await db.collection('businesses').find({}, { projection: { aiPrivate: 1 } }).toArray();
    const priv = new Set(businesses.filter(b => b._id !== MASTER_BUSINESS_ID && !mayLearnFrom(b)).map(b => b._id));
    const rows = await db
      .collection('aiDrafts')
      .find(
        { at: { $gte: now - days * DAY_MS } },
        { projection: { businessId: 1, feature: 1, model: 1, status: 1, keptRatio: 1, at: 1 } }
      )
      .sort({ at: -1 })
      .limit(DRAFT_LIMIT)
      .toArray();
    const flows = buildLearningStats(
      rows.filter(r => !priv.has(r.businessId)),
      { dayOf: jerusalemDate, now }
    );
    const suppliers = await db.collection('supplierProfiles').countDocuments({});
    const names = await db.collection('invoiceAliases').countDocuments({ businessId: MASTER_BUSINESS_ID });
    const fromAliases = await db.collection('invoiceAliases').distinct('contributors', { businessId: MASTER_BUSINESS_ID });
    const fromProfiles = await db.collection('supplierProfiles').distinct('contributors');
    res.json({
      days,
      from: jerusalemDate(now - days * DAY_MS),
      to: jerusalemDate(now),
      flows,
      brain: { suppliers, names, businesses: new Set([...fromAliases, ...fromProfiles]).size },
      privateBusinesses: priv.size,
      truncated: rows.length === DRAFT_LIMIT
    });
  } catch (err) {
    req.log.error({ err, event: 'admin.learning_stats.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
