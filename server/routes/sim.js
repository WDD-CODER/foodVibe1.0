'use strict';
// Plan 662 (C-REGISTRY-R): empty router, filled by plan 675 (the simulated chat channel, `sim`). It has no route of its own.
// The plan that adds a route adds verifyToken and its module gate on it.
const { Router } = require('express');

module.exports = Router();
