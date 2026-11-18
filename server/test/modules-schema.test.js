'use strict'
/**
 * Plan 615 (C-REGISTRY, C-MODULES): the module rule, the new optional fields and the nine new schemas.
 * Pure schema tests: the shared package is read from its compiled copy (`server/generated/schemas`).
 */

const S = require('../generated/schemas')

const base = { schemaVersion: 2, businessId: 'b1', createdBy: 'u1', createdAt: 1, updatedAt: 1 }
const biz = { _id: 'b1', name: 'עסק', ownerId: 'u1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 }
const row = (i = 0) => ({ at: i, by: 'u1', byName: 'admin', reason: 'because', changed: ['modules'] })

describe('modulesOf / hasModule / MODULE_OF_TYPE', () => {
  it('returns the four defaults when the business has no modules field', () => {
    expect(S.modulesOf({})).toEqual(['events', 'event_logistics', 'frontdesk', 'ai_create'])
    expect(S.modulesOf(null)).toEqual([...S.DEFAULT_MODULES])
    expect(S.modulesOf(undefined)).toEqual([...S.DEFAULT_MODULES])
  })

  it('returns [] for a stored empty list', () => {
    expect(S.modulesOf({ modules: [] })).toEqual([])
  })

  it('drops event_logistics when events is not in the list, and repeats / unknown keys', () => {
    expect(S.modulesOf({ modules: ['event_logistics', 'frontdesk'] })).toEqual(['frontdesk'])
    expect(S.modulesOf({ modules: ['events', 'event_logistics'] })).toEqual(['events', 'event_logistics'])
    expect(S.modulesOf({ modules: ['frontdesk', 'frontdesk', 'nope', 'events'] })).toEqual(['events', 'frontdesk'])
  })

  it('hasModule agrees with modulesOf', () => {
    expect(S.hasModule({}, 'events')).toBe(true)
    expect(S.hasModule({}, 'consultant_diag')).toBe(false)
    expect(S.hasModule({ modules: ['event_logistics'] }, 'event_logistics')).toBe(false)
    expect(S.hasModule({ modules: ['consultant_diag'] }, 'consultant_diag')).toBe(true)
  })

  it('MODULE_OF_TYPE has exactly the seven types of the C-MODULES table', () => {
    expect(Object.keys(S.MODULE_OF_TYPE).sort()).toEqual(['bookings', 'clients', 'frontDeskProfiles', 'knowledgeItems', 'menuEvents', 'requests', 'venues'])
    expect(S.MODULE_OF_TYPE.clients).toEqual(['events', 'frontdesk'])
  })

  it('platformUpdateSchema needs a reason and at least one change', () => {
    expect(S.platformUpdateSchema.safeParse({ modules: ['events'], reason: 'pilot' }).success).toBe(true)
    expect(S.platformUpdateSchema.safeParse({ reason: 'pilot' }).success).toBe(false)
    expect(S.platformUpdateSchema.safeParse({ aiPrivate: true, reason: 'x' }).success).toBe(false)
    expect(S.platformUpdateSchema.safeParse({ aiMonthlyTokenCap: null, reason: 'reset' }).success).toBe(true)
  })
})

describe('businessSchema new optional fields', () => {
  it('a stored business of today still passes', () => {
    expect(S.businessSchema.safeParse(biz).success).toBe(true)
  })

  it('accepts modules, platformHistory, aiMonthlyTokenCap 0 and aiPrivate', () => {
    const ok = { ...biz, modules: ['events', 'consultant_diag'], platformHistory: [row()], aiMonthlyTokenCap: 0, aiPrivate: true }
    expect(S.businessSchema.safeParse(ok).success).toBe(true)
  })

  it.each([
    ['a sixth module', { modules: ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag', 'events'] }],
    ['a repeated module', { modules: ['events', 'events'] }],
    ['a 51st history row', { platformHistory: Array.from({ length: 51 }, (_, i) => row(i)) }],
    ['a cap of -1', { aiMonthlyTokenCap: -1 }],
    ['a cap of 1.5', { aiMonthlyTokenCap: 1.5 }],
  ])('refuses %s', (_name, extra) => {
    expect(S.businessSchema.safeParse({ ...biz, ...extra }).success).toBe(false)
  })

  it('settings: priceRiseAlertPct is optional, 5 is valid, 0 and 101 are refused; the default is 5', () => {
    const s = { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }
    expect(S.businessSettingsSchema.safeParse(s).success).toBe(true)
    expect(S.businessSettingsSchema.safeParse({ ...s, priceRiseAlertPct: 5 }).success).toBe(true)
    expect(S.businessSettingsSchema.safeParse({ ...s, priceRiseAlertPct: 0 }).success).toBe(false)
    expect(S.businessSettingsSchema.safeParse({ ...s, priceRiseAlertPct: 101 }).success).toBe(false)
    expect(S.BUSINESS_SETTINGS_DEFAULTS.priceRiseAlertPct).toBe(5)
  })
})

describe('supplier taxId and event siteLogistics.loaded', () => {
  const supplier = { ...base, _id: 's1', nameHebrew: 'ספק', deliveryDays: [], minOrderMov: 0, leadTimeDays: 1 }

  it('supplier accepts a nine-digit taxId and refuses five digits', () => {
    expect(S.supplierSchema.safeParse({ ...supplier, taxId: '123456789' }).success).toBe(true)
    expect(S.supplierSchema.safeParse({ ...supplier, taxId: '12345' }).success).toBe(false)
    expect(S.supplierSchema.safeParse(supplier).success).toBe(true)
  })

  it('siteLogistics.loaded takes one row and refuses 601', () => {
    const shape = S.menuEventSchema.shape.siteLogistics.unwrap()
    const tick = { key: 'k1', at: 1, by: 'u1', byName: 'n' }
    expect(shape.safeParse({ answers: [], loaded: [tick] }).success).toBe(true)
    expect(shape.safeParse({ answers: [], loaded: Array.from({ length: 601 }, () => tick) }).success).toBe(false)
    expect(shape.safeParse({ answers: [] }).success).toBe(true)
  })
})

describe('the nine new schemas', () => {
  const docs = {
    invoices: {
      ...base, _id: 'i1', supplierName: 'ספק', source: 'photo',
      lines: [{ printedName: 'עגבניות', price: 3.2, needsReview: false, result: 'created' }],
    },
    priceHistory: { _id: 'p1', businessId: 'b1', productId: 'pr1', supplierId: '', price: 3, at: 1, by: 'u1', source: 'invoice' },
    invoiceAliases: { _id: 'a1', businessId: 'b1', supplierKey: 'tax:123456789', nameKey: 'tomato', printedName: 'Tomato', productId: 'pr1', hits: 1, lastAt: 1 },
    supplierProfiles: { _id: 'tax:123456789', names: ['ספק'], vatIncludedYes: 1, vatIncludedNo: 0, invoices: 1, contributors: ['b1'], lastAt: 1 },
    aiDrafts: { _id: 'd1', businessId: 'b1', userId: 'u1', feature: 'invoice_read', input: { text: 'x' }, aiDraft: { rows: [] }, status: 'pending', at: 1 },
    storedFiles: { _id: 'f1', businessId: 'b1', kind: 'invoice', mimeType: 'image/png', bytes: 10, provider: 'cloudinary', providerId: 'abc', resourceType: 'image', createdBy: 'u1', createdAt: 1 },
    businessAccess: { _id: 'g1', userId: 'u2', businessId: 'b1', role: 'consultant', grantedBy: 'u1', grantedByName: 'admin', grantedAt: 1 },
    diagnoses: { ...base, _id: 'dg1', name: 'אבחון', periodDays: 60, menu: [{ name: 'מנה', sellPrice: 50 }], pricesIncludeVat: true, vatPct: 18, invoiceIds: [], homeBusinessId: 'h1', status: 'open' },
    stockCounts: { ...base, _id: 'sc1', countedAt: 1, status: 'draft', source: 'manual', lines: [{ productId: 'pr1', quantity: 2, unit: 'kg', baseQuantity: 2000 }] },
  }

  it('SCHEMA_BY_COLLECTION has the nine new keys', () => {
    for (const k of Object.keys(docs)) expect(S.SCHEMA_BY_COLLECTION[k], k).toBeTruthy()
  })

  it.each(Object.keys(docs))('%s accepts a full valid document and refuses an unknown key', key => {
    const schema = S.SCHEMA_BY_COLLECTION[key]
    expect(schema.safeParse(docs[key]).success).toBe(true)
    expect(schema.safeParse({ ...docs[key], surprise: 1 }).success).toBe(false)
  })

  it('a shared alias is valid and an own alias cannot use the master business', () => {
    const shared = { _id: 'a2', businessId: '__master__', supplierKey: 'tax:123456789', nameKey: 'tomato', printedName: 'Tomato', masterProductId: 'm1', hits: 2, contributors: ['b1'], lastAt: 1 }
    expect(S.sharedInvoiceAliasSchema.safeParse(shared).success).toBe(true)
    expect(S.invoiceAliasSchema.safeParse(shared).success).toBe(true)
    expect(S.ownInvoiceAliasSchema.safeParse({ ...docs.invoiceAliases, businessId: '__master__' }).success).toBe(false)
  })

  it('the shared shapes carry no price, quantity or date of purchase', () => {
    expect(Object.keys(S.sharedInvoiceAliasSchema.shape).sort()).toEqual(['_id', 'businessId', 'contributors', 'hits', 'lastAt', 'masterProductId', 'nameKey', 'printedName', 'supplierKey'])
    expect(Object.keys(S.supplierProfileSchema.shape).sort()).toEqual(['_id', 'contributors', 'invoices', 'lastAt', 'names', 'vatIncludedNo', 'vatIncludedYes'])
  })

  it('refuses a tax id of the wrong length on an invoice and a 201st line', () => {
    expect(S.invoiceSchema.safeParse({ ...docs.invoices, supplierTaxId: '123' }).success).toBe(false)
    const line = docs.invoices.lines[0]
    expect(S.invoiceSchema.safeParse({ ...docs.invoices, lines: Array.from({ length: 201 }, () => line) }).success).toBe(false)
  })

  it('exports the constants later plans use', () => {
    expect(S.INVOICE_LINES_MAX).toBe(200)
    expect(S.AI_DRAFT_TEXT_MAX).toBe(20000)
    expect([...S.STOCK_COUNT_STATUSES]).toEqual(['draft', 'final'])
    expect([...S.DIAGNOSIS_STATUSES]).toEqual(['open', 'done'])
  })
})
