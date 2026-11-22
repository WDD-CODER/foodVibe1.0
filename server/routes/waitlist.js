'use strict';
// Plan 662 (C-REGISTRY-R): empty router, filled by plan 673 (C-WAIT). It has no route of its own.
// The plan that adds a route adds verifyToken and requireModule('tables') on it.
const { Router } = require('express');

module.exports = Router();
