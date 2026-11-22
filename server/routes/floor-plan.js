'use strict';
// Plan 662 (C-REGISTRY-R): empty router, filled by plans 664 (C-FLOOR) and 667 (C-HOLD). It has no route of its own.
// The plan that adds a route adds verifyToken and requireModule('tables') on it.
const { Router } = require('express');

module.exports = Router();
