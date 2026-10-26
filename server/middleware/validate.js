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

// ---------------------------------------------------------------------------
// Plan 456 — request-body checks for the AI routes. They answer exactly what the
// hand-written checks answered: 400 with `{ error, ...extra }`.
// ---------------------------------------------------------------------------

/** Sends 400 `{ error, ...extra }`. Returns the response so a handler can `return badRequest(...)`. */
function badRequest(res, error, extra = {}) {
  return res.status(400).json({ error, ...extra });
}

/** True when `value` passes `kind`: 'text' = a string that is not blank, 'object' = any non-null object. */
function passesField(value, kind) {
  if (kind === 'text') return typeof value === 'string' && value.trim() !== '';
  if (kind === 'object') return !!value && typeof value === 'object';
  throw new Error(`requireFields: unknown kind "${kind}"`);
}

/**
 * Checks `rules` ({ field: 'text' | 'object' }) in order against `body`. On the first field that
 * fails it sends 400 `{ error: '<field> is required' }` and returns false; true when all pass.
 *
 * @param {import('express').Response} res
 * @param {Record<string, unknown> | undefined} body
 * @param {Record<string, 'text' | 'object'>} rules
 */
function requireFields(res, body, rules) {
  for (const [field, kind] of Object.entries(rules)) {
    if (!passesField(body?.[field], kind)) {
      badRequest(res, `${field} is required`);
      return false;
    }
  }
  return true;
}

module.exports = { checkStoredDoc, badRequest, requireFields };
