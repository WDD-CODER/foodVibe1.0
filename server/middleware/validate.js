'use strict';
/**
 * Plan 321 Phase 2a — OBSERVE-mode schema validation for POST/PUT /api/v1/data/:type.
 * Logs a structured warning per violation and always calls next(): nothing is rejected
 * and nothing is modified. Phase 2b flips this to enforce.
 */

const { hasSchema, checkDoc } = require('../utils/schema-check');

function validateObserve(req, _res, next) {
  try {
    const type = req.params.type;
    if (hasSchema(type) && req.body && typeof req.body === 'object') {
      // Validate the document as it will be stored: the server stamps userId and (on POST) _id.
      const candidate = { ...req.body, userId: req.user.userId };
      if (req.params.id) candidate._id = req.params.id;
      if (!candidate._id) candidate._id = '(server-generated)';
      const { unmapped, issues } = checkDoc(type, candidate);
      if (unmapped.length || issues.length) {
        console.warn('[schema-observe]', JSON.stringify({ type, id: candidate._id, unmapped, issues }));
      }
    }
  } catch (err) {
    // Observe mode must never break a write.
    console.warn('[schema-observe] check failed:', err.message);
  }
  next();
}

module.exports = { validateObserve };
