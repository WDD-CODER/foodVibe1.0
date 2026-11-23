'use strict';
/**
 * Plan 679 (C-AIKEY): the one place that resolves the model key of a business. Today every business uses the
 * environment key; a key of its own would be read here later. The argument is accepted and unused (D5).
 */
function keyFor(_businessId) {
  return process.env.GEMINI_API_KEY ?? '';
}

module.exports = { keyFor };
