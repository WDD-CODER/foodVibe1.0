'use strict';
/** Minimal VALID v2 bodies/docs for tests (the server enforces the schema on products/recipes/...). */

function productBody(overrides = {}) {
  return {
    nameHebrew: 'תפוח',
    baseUnit: 'kg',
    sources: [],
    purchaseOptions: [],
    categories: [],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0,
    ...overrides,
  };
}

function recipeBody(overrides = {}) {
  return {
    nameHebrew: 'רוטב',
    ingredients: [],
    steps: [],
    yieldAmount: 1,
    yieldUnit: 'kg',
    defaultStation: 'cold',
    isApproved: false,
    ...overrides,
  };
}

/** A full stored doc (what is in Mongo): body + server-owned fields. */
function stored(body, fields) {
  return { schemaVersion: 2, createdAt: 1, updatedAt: 1, ...body, ...fields };
}

module.exports = { productBody, recipeBody, stored };
