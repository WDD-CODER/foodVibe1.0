'use strict';
/**
 * Plan 485 — one live product per name in a business.
 * Names compare by the one name rule (`normalizeProductName`: trim, single spaces, lower-case),
 * the same rule as the client form and the price-list import.
 */

const { normalizeProductName } = require('./price-list-import');
const { LIVE } = require('../jobs/purge-deleted');

const PRODUCT_NAME_TAKEN = Object.freeze({ error: 'PRODUCT_NAME_TAKEN', messageKey: 'product_duplicate_name_error' });

/**
 * Returns the live product in `scope` (a business filter) whose name equals `name`, other than `exceptId`,
 * or null. Reads only `_id` + `nameHebrew` of that business's live products.
 */
async function findProductNameClash(collection, scope, name, exceptId = null) {
  const key = normalizeProductName(name);
  if (!key) return null;
  const filter = { ...scope, ...LIVE, ...(exceptId != null && { _id: { $ne: exceptId } }) };
  const docs = await collection.find(filter, { projection: { _id: 1, nameHebrew: 1 } }).toArray();
  return docs.find((d) => normalizeProductName(d.nameHebrew) === key) ?? null;
}

/** True when a write changes the product's name (by the name rule). */
function isRename(currentName, nextName) {
  return nextName !== undefined && normalizeProductName(currentName) !== normalizeProductName(nextName);
}

module.exports = { PRODUCT_NAME_TAKEN, findProductNameClash, isRename };
