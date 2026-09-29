// Derived from server/constants/collections.js — the single source of truth.
// Deliberately narrower than ALL_USER_ENTITY_TYPES: search is an opt-in surface for
// collections large enough to need typeahead. Add a type here (in collections.js)
// only once its own search UI exists.
const { SEARCHABLE_ENTITY_TYPES } = require('./collections')

module.exports = { SEARCHABLE_ENTITY_TYPES }
