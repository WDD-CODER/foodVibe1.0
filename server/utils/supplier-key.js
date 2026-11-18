'use strict'
/** Plan 626 (C-INVREAD): the one key that names a supplier across businesses. Pure. */
const { normalizePhone, phoneKey } = require('../generated/schemas/phone')
const { normalizeProductName } = require('./price-list-import')

/** `tax:<9 digits>` | `phone:<last 9 digits>` | `name:<normalised name>` | '' when nothing usable. */
function supplierKey({ taxId, phone, name } = {}) {
  if (typeof taxId === 'string' && /^\d{9}$/.test(taxId)) return `tax:${taxId}`
  const digits = normalizePhone(typeof phone === 'string' || typeof phone === 'number' ? String(phone) : '')
  if (digits.length >= 9) return `phone:${phoneKey(digits)}`
  const normalized = normalizeProductName(name).slice(0, 200)
  return normalized ? `name:${normalized}` : ''
}

module.exports = { supplierKey }
