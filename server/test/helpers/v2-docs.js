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

function supplierBody(overrides = {}) {
  return { nameHebrew: 'ספק', deliveryDays: [0], minOrderMov: 0, leadTimeDays: 1, ...overrides };
}

function equipmentBody(overrides = {}) {
  return { nameHebrew: 'סיר', category: 'tool', ownedQuantity: 1, isConsumable: false, ...overrides };
}

function venueBody(overrides = {}) {
  return { nameHebrew: 'אולם', environmentType: 'professional_kitchen', availableInfrastructure: [], capacity: 50, active: true, ...overrides };
}

function menuEventBody(overrides = {}) {
  return { name: 'אירוע', eventType: 'wedding', servingType: 'plated', guestCount: 50, sections: [], ...overrides };
}

/** A full stored doc (what is in Mongo): body + server-owned fields. */
function stored(body, fields) {
  return { schemaVersion: 2, createdAt: 1, updatedAt: 1, ...body, ...fields };
}

module.exports = { productBody, recipeBody, supplierBody, equipmentBody, venueBody, menuEventBody, stored };
