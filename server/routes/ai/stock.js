'use strict';
// Plan 615 (C-REGISTRY): empty router, filled by plan 637. It has no route of its own.
// ai.js requires this file before it sets its own module.exports, so read respondFromGeminiFailure, usageOf,
// requestedModel and aiLimiter with require('../ai') INSIDE a handler (or a lazy getter), never at the top of this file.
const { Router } = require('express');

module.exports = Router();
