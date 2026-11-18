'use strict'
/**
 * Plan 618 (contract C-LEARN): the one consent test for platform learning.
 * Every business shares by default; only the platform admin marks a business private (`aiPrivate`).
 * Used before copying anything into a '__master__' pool and before listing a business's AI material for the
 * platform admin. A private business still keeps its own per-business memory and drafts.
 */

/** True unless the business is marked private. No database access. */
function mayLearnFrom(business) {
  return business?.aiPrivate !== true
}

module.exports = { mayLearnFrom }
