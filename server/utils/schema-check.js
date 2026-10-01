'use strict';
/**
 * Plan 321 Phase 2a — one function that answers "would this v1 document be valid v2?".
 * Used by the observe-mode middleware and the read-only validate-all tool, so both
 * report exactly the same thing. Loads the schemas compiled by `npm run build:schemas`
 * into server/generated/schemas (gitignored).
 */

const { upgradeV1toV2 } = require('../generated/schemas/upgrade/upgrade');
const { SCHEMA_BY_COLLECTION } = require('../generated/schemas/entities');

/** True when the collection has a v2 schema in Phase 2a. */
function hasSchema(type) {
  return Object.prototype.hasOwnProperty.call(SCHEMA_BY_COLLECTION, type);
}

/**
 * @returns {{ unmapped: string[], issues: { path: string, code: string, message: string }[] }}
 *   `unmapped` — v1 keys the field map doesn't cover; `issues` — Zod violations on the upgraded doc.
 */
function checkDoc(type, doc) {
  const { doc: upgraded, unmapped } = upgradeV1toV2(type, doc);
  const parsed = SCHEMA_BY_COLLECTION[type].safeParse(upgraded);
  const issues = parsed.success
    ? []
    : parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message }));
  return { unmapped, issues };
}

module.exports = { hasSchema, checkDoc };
