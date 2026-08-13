/**
 * Entity types that support the lean prefix-match GET /:type/search endpoint
 * (plan 301, Milestone 1 — server-side search for large catalogs).
 *
 * Deliberately narrower than ALL_USER_ENTITY_TYPES: search is an opt-in surface for
 * collections large enough to need typeahead (PRODUCT_LIST/RECIPE_LIST/DISH_LIST, the
 * catalogs the legacy FoodComposer import pushed to 1,000-1,500+ docs — see plan 300).
 * Add a type here only once its own search UI exists.
 */
const SEARCHABLE_ENTITY_TYPES = ['PRODUCT_LIST', 'RECIPE_LIST', 'DISH_LIST']

module.exports = { SEARCHABLE_ENTITY_TYPES }
