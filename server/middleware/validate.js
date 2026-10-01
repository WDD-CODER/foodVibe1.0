'use strict';
/**
 * Plan 321 Phase 2b — ENFORCE-mode schema validation for the generic data API.
 * `checkStoredDoc` validates the exact document that is about to be stored (v2 shape, server
 * stamps already applied) for the collections that have a v2 schema; every other collection
 * passes through untouched until its own phase. Violations become a 400 with Zod issues.
 */

const { hasSchema, parseV2 } = require('../utils/schema-check');

/** @returns {{ ok: boolean, issues: { path: string, code: string, message: string }[] }} */
function checkStoredDoc(type, doc) {
  if (!hasSchema(type)) return { ok: true, issues: [] };
  const { success, issues } = parseV2(type, doc);
  return { ok: success, issues };
}

module.exports = { checkStoredDoc };
