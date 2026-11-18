'use strict';
// Plan 615 (C-REGISTRY): router filled by plans 619 and 630.
const { Router } = require('express');
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth');
const { isFileStoreConfigured } = require('../services/file-store');

const router = Router();

// Plan 619: is the private file store switched on (the three keys are set)?
router.get('/status', verifyToken, requirePlatformAdmin, (_req, res) => {
  res.json({ fileStore: isFileStoreConfigured() });
});

module.exports = router;
