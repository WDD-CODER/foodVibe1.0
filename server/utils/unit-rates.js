'use strict'
/** Plan 635: the unit rates of a business — master `unit` terms, then its own, through the shared `unitRatesFrom`. */
const mongoose = require('mongoose')
const { readScope } = require('./business-scope')
const { unitRatesFrom } = require('../generated/schemas/units/to-base')

const MASTER = '__master__'

async function loadUnitRates(req) {
  const terms = await mongoose.connection.db.collection('taxonomyTerms')
    .find({ ...readScope(req, 'taxonomyTerms'), kind: 'unit' }, { projection: { key: 1, gramRate: 1, businessId: 1 } })
    .toArray()
  // The business's own term must come last so it wins over the master's for the same key.
  const ordered = [...terms.filter(t => t.businessId === MASTER), ...terms.filter(t => t.businessId !== MASTER)]
  return unitRatesFrom(ordered)
}

module.exports = { loadUnitRates }
