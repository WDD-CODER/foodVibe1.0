// Derived from server/constants/collections.js — the single source of truth.
// Order matters: KITCHEN_SUPPLIERS must precede PRODUCT_LIST so supplierIdMap is
// ready when clone-master/sync-master process products — collections.js preserves it.
const { CLONEABLE_TYPES } = require('./collections')

module.exports = { CLONEABLE_TYPES }
