'use strict';
// Plan 619 (C-FILES): a link (300 s) to a stored file of the caller's business. Plan 615 mounts this router.
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');
const { assertCan } = require('../utils/permissions');
const { signedFileUrl } = require('../services/file-store');
const { purgeRetained } = require('../jobs/retention');

const router = Router();
const LINK_SECONDS = 300;

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    try {
      await purgeRetained(db, req.user.businessId, Date.now());
    } catch (err) {
      req.log.warn({ err, event: 'files.sweep_failed' });
    }
    const file = await db.collection('storedFiles').findOne({ _id: req.params.id, businessId: req.user.businessId });
    if (!file) return res.status(404).json({ error: 'Not found' });
    if (file.kind === 'invoice' && !assertCan(req, res, 'editMoney', { type: 'products' })) return;
    const url = signedFileUrl(file, LINK_SECONDS);
    if (url === null) return res.status(503).json({ error: 'FILE_STORE_OFF' });
    req.log.info({ event: 'files.url_issued', kind: file.kind });
    res.json({ url });
  } catch (err) {
    req.log.error({ err, event: 'files.url_failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
