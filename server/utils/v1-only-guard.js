'use strict';
/**
 * Plan 321 Phase 2b: the app now reads/writes the v2 collections (products, recipes, dishes,
 * suppliers, equipment, venues, menuEvents) with camelCase fields. Scripts written against the
 * v1 names (PRODUCT_LIST, name_hebrew, ingredients_ ...) would write v1-shaped docs into the
 * old rollback collections, or do nothing. They refuse to run unless explicitly told it is
 * intended (e.g. rebuilding a v1 database to re-run the migration).
 */
module.exports = function v1OnlyGuard(scriptName) {
  if (process.argv.includes('--allow-v1=yes')) return;
  console.error(
    `[v1-only] ${scriptName} targets the v1 schema/collection names and is disabled after the Plan 321 v2 cutover.\n` +
    '          Pass --allow-v1=yes only if you deliberately want to touch the v1 (rollback) collections.'
  );
  process.exit(1);
};
