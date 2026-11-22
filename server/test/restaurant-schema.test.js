'use strict'
/**
 * Plan 662 (C-REGISTRY-R): the Restaurant program's module key, the new optional fields, `tableServiceOf` and the five
 * new schemas. Pure schema tests: the shared package is read from its compiled copy (`server/generated/schemas`).
 */

const S = require('../generated/schemas')
const { tableServiceOf, TABLE_SERVICE_DEFAULTS } = require('../generated/schemas/front-desk/table-service')

const base = { schemaVersion: 2, businessId: 'b1', createdBy: 'u1', createdAt: 1, updatedAt: 1 }

describe('the tables module', () => {
  it('modulesOf returns the four defaults for a business with no modules field', () => {
    expect(S.modulesOf({})).toEqual(['events', 'event_logistics', 'frontdesk', 'ai_create'])
  })

  it('keeps tables with frontdesk and drops it without', () => {
    expect(S.modulesOf({ modules: ['frontdesk', 'tables'] })).toEqual(['frontdesk', 'tables'])
    expect(S.modulesOf({ modules: ['tables'] })).toEqual([])
    expect(S.modulesOf({ modules: ['events', 'tables'] })).toEqual(['events'])
  })

  it('modulesFieldSchema accepts all six keys and refuses a repeated key', () => {
    const all = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag', 'tables']
    expect(S.MODULE_KEYS).toEqual(all)
    expect(S.modulesFieldSchema.safeParse(all).success).toBe(true)
    expect(S.modulesFieldSchema.safeParse(['tables', 'tables']).success).toBe(false)
  })

  it('MODULE_OF_TYPE has the seven types of today plus floorPlans and waitlistEntries', () => {
    expect(S.MODULE_OF_TYPE).toEqual({
      menuEvents: ['events'],
      venues: ['events'],
      requests: ['frontdesk'],
      bookings: ['frontdesk'],
      frontDeskProfiles: ['frontdesk'],
      knowledgeItems: ['frontdesk'],
      clients: ['events', 'frontdesk'],
      floorPlans: ['tables'],
      waitlistEntries: ['tables'],
    })
  })
})

const profile = {
  ...base, _id: 'fd1', businessType: 'restaurant', slug: 'my-place', displayName: 'המקום', hours: [], requestKinds: {},
  assistant: { level: 0, tone: 'warm' }, status: 'draft',
}
const fullTableService = {
  confirmMode: 'auto', autoMaxParty: 8, slotMinutes: 30,
  turnMinutes: [{ maxParty: 2, minutes: 90 }, { maxParty: 6, minutes: 120 }, { maxParty: 30, minutes: 180 }],
  lastSeatingBeforeCloseMinutes: 45, bufferMinutes: 10, holdMinutes: 20, autoNoShow: true, reminderHour: '09:30',
  cancellationCutoffHours: 4,
}
const booking = {
  ...base, _id: 'bk1', kind: 'table', status: 'confirmed', source: 'request', date: '2026-12-01', time: '19:00',
  startAt: 1000, endAt: 1000 + 120 * 60000, durationMinutes: 120, partySize: 4, clientId: 'c1', guestName: 'דנה',
  guestPhone: '0501234567', statusHistory: [{ status: 'confirmed', at: 1, by: 'u1', byName: 'u', via: 'member' }],
  publicToken: 'abcdefghijklmnop',
}
const request = {
  ...base, _id: 'rq1', kind: 'table', status: 'new', channel: 'manual', clientId: 'c1', guestName: 'דנה',
  guestPhone: '0501234567', wanted: {}, answers: [], statusHistory: [{ status: 'new', at: 1, by: 'u1', byName: 'u', via: 'member' }],
  publicToken: 'abcdefghijklmnop',
}

describe('profile, booking and request', () => {
  it('a stored profile, booking and request of today still pass', () => {
    expect(S.frontDeskProfileSchema.safeParse(profile).success).toBe(true)
    expect(S.bookingSchema.safeParse(booking).success).toBe(true)
    const r = S.requestSchema.safeParse(request)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('a profile with a full tableService passes', () => {
    expect(S.frontDeskProfileSchema.safeParse({ ...profile, tableService: fullTableService }).success).toBe(true)
  })

  it.each([
    ['slotMinutes 20', { slotMinutes: 20 }],
    ['turnMinutes out of ascending order', { turnMinutes: [{ maxParty: 6, minutes: 120 }, { maxParty: 2, minutes: 90 }] }],
    ['autoMaxParty 31', { autoMaxParty: 31 }],
  ])('a profile with %s is refused', (_name, extra) => {
    const tableService = { ...fullTableService, ...extra }
    expect(S.frontDeskProfileSchema.safeParse({ ...profile, tableService }).success).toBe(false)
  })

  it('tableService is owner-written: not a server field', () => {
    expect(S.PROFILE_SERVER_FIELDS).not.toContain('tableService')
  })

  it('a booking with the eight new fields passes; five tableKeys are refused', () => {
    const extra = {
      tableKeys: ['tbl001', 'tbl002'], areaKey: 'area01', seatedAt: 2, finishedAt: 3, remindedAt: 4, guestConfirmedAt: 5,
      override: true, test: true,
    }
    expect(S.bookingSchema.safeParse({ ...booking, ...extra }).success).toBe(true)
    const five = ['tbl001', 'tbl002', 'tbl003', 'tbl004', 'tbl005']
    expect(S.bookingSchema.safeParse({ ...booking, ...extra, tableKeys: five }).success).toBe(false)
    for (const key of Object.keys(extra)) expect(S.BOOKING_SERVER_FIELDS, key).toContain(key)
  })

  it('a request with channel sim passes', () => {
    expect(S.REQUEST_CHANNELS).toEqual(['manual', 'public_form', 'whatsapp', 'sim'])
    expect(S.requestSchema.safeParse({ ...request, channel: 'sim' }).success).toBe(true)
  })
})

describe('tableServiceOf', () => {
  it('an empty profile gets the defaults and the one-step ladder of 120 minutes', () => {
    expect(tableServiceOf({})).toEqual({ ...TABLE_SERVICE_DEFAULTS, turnMinutes: [{ maxParty: 30, minutes: 120 }] })
    expect(tableServiceOf(null)).toEqual(tableServiceOf({}))
    expect(tableServiceOf(undefined)).toEqual(tableServiceOf({}))
  })

  it('the defaults are the C-TSERVICE ones', () => {
    expect(TABLE_SERVICE_DEFAULTS).toEqual({
      confirmMode: 'manual', autoMaxParty: 6, slotMinutes: 15, lastSeatingBeforeCloseMinutes: 60, bufferMinutes: 0,
      holdMinutes: 15, autoNoShow: false, reminderHour: '10:00', cancellationCutoffHours: 3,
    })
  })

  it('the ladder step follows requestKinds.table.defaultDurationMinutes', () => {
    const p = { requestKinds: { table: { defaultDurationMinutes: 90 } } }
    expect(tableServiceOf(p).turnMinutes).toEqual([{ maxParty: 30, minutes: 90 }])
  })

  it('a stored confirmMode auto wins and the other fields stay the defaults', () => {
    const out = tableServiceOf({ tableService: { confirmMode: 'auto' } })
    expect(out).toEqual({ ...TABLE_SERVICE_DEFAULTS, confirmMode: 'auto', turnMinutes: [{ maxParty: 30, minutes: 120 }] })
  })

  it('a stored ladder with steps wins; an empty one falls back to the default step', () => {
    const turnMinutes = [{ maxParty: 4, minutes: 60 }]
    expect(tableServiceOf({ tableService: { turnMinutes } }).turnMinutes).toEqual(turnMinutes)
    expect(tableServiceOf({ tableService: { turnMinutes: [] } }).turnMinutes).toEqual([{ maxParty: 30, minutes: 120 }])
  })
})

const floorPlan = {
  ...base, _id: 'fp1',
  grid: { cols: 20, rows: 15 },
  areas: [{ key: 'area01', name: 'פנים', order: 0 }],
  tables: [
    { key: 'tbl001', number: '1', areaKey: 'area01', shape: 'round', minSeats: 2, maxSeats: 4, x: 1, y: 1, w: 2, h: 2, turned: false, active: true, online: true },
    { key: 'tbl002', number: '2', areaKey: 'area01', shape: 'rect', minSeats: 4, maxSeats: 6, x: 4, y: 1, w: 3, h: 2, turned: true, active: true, online: false },
  ],
  joins: [{ key: 'join01', tableKeys: ['tbl001', 'tbl002'], minSeats: 6, maxSeats: 10, online: true }],
}
const DOCS = {
  floorPlans: floorPlan,
  tableHolds: { _id: 'h1', businessId: 'b1', tableKey: 'tbl001', cell: 1700000000000, bookingId: 'bk1', test: true },
  waitlistEntries: {
    ...base, _id: 'w1', date: '2026-12-01', guestName: 'דנה', guestPhone: '0501234567', clientId: 'c1', partySize: 3,
    areaKey: 'area01', quotedMinutes: 20, status: 'waiting', joinedAt: 5, notifiedAt: 6, bookingId: 'bk1', test: true,
  },
  conversations: {
    ...base, _id: 'cv1', clientId: 'c1', channel: 'sim', waId: '972501234567', status: 'bot', assignedTo: 'u1',
    lastMessageAt: 5, lastInboundAt: 5, unread: 1, requestId: 'rq1', bookingId: 'bk1', windowExpiresAt: 99,
    pending: { kind: 'book', data: { partySize: 2 }, at: 5 }, suggestion: 'שלום', liveKey: 'sim:972501234567', test: true,
  },
  messages: {
    _id: 'm1', businessId: 'b1', conversationId: 'cv1', direction: 'out', author: 'ai', memberId: 'u1', kind: 'button',
    text: 'מתאים?', template: { name: 'confirm', params: ['19:00'] }, buttons: [{ id: 'yes', title: 'כן' }], buttonId: 'yes',
    at: 5, providerMessageId: 'wamid.1', status: 'sent', test: true,
  },
}

describe('the five new schemas', () => {
  it('SCHEMA_BY_COLLECTION has the five new keys', () => {
    for (const k of ['floorPlans', 'tableHolds', 'waitlistEntries', 'conversations', 'messages']) {
      expect(S.SCHEMA_BY_COLLECTION[k], k).toBeTruthy()
    }
  })

  it.each(Object.keys(DOCS))('%s accepts a full valid document and refuses an unknown key', key => {
    const schema = S.SCHEMA_BY_COLLECTION[key]
    const ok = schema.safeParse(DOCS[key])
    expect(ok.success, JSON.stringify(ok.error?.issues)).toBe(true)
    expect(schema.safeParse({ ...DOCS[key], surprise: 1 }).success).toBe(false)
  })

  it('exports the enum constants', () => {
    expect(S.FLOOR_TABLE_SHAPES).toEqual(['round', 'square', 'rect'])
    expect(S.WAITLIST_STATUSES).toEqual(['waiting', 'notified', 'seated', 'left', 'expired'])
    expect(S.CONVERSATION_CHANNELS).toEqual(['sim', 'whatsapp'])
    expect(S.CONVERSATION_STATUSES).toEqual(['bot', 'human', 'closed'])
    expect(S.MESSAGE_KINDS).toEqual(['text', 'template', 'button'])
    expect(S.MESSAGE_STATUSES).toEqual(['queued', 'sent', 'delivered', 'read', 'failed'])
  })

  const table = floorPlan.tables[0]
  it.each([
    ['201 tables', { tables: Array.from({ length: 201 }, (_, i) => ({ ...table, key: 'tbl' + String(i).padStart(3, '0'), number: String(i) })) }],
    ['a table with maxSeats < minSeats', { tables: [{ ...table, minSeats: 4, maxSeats: 2 }] }],
    ['a join with maxSeats < minSeats', { joins: [{ ...floorPlan.joins[0], minSeats: 8, maxSeats: 6 }] }],
    ['a join of five tables', { joins: [{ ...floorPlan.joins[0], tableKeys: ['tbl001', 'tbl002', 'tbl003', 'tbl004', 'tbl005'] }] }],
    ['a join of one table', { joins: [{ ...floorPlan.joins[0], tableKeys: ['tbl001'] }] }],
    ['no area', { areas: [] }],
    ['a 81-column grid', { grid: { cols: 81, rows: 15 } }],
  ])('a floor plan with %s is refused', (_name, extra) => {
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, ...extra }).success).toBe(false)
  })

  it.each([
    ['upper case', 'TBL001'],
    ['five characters', 'tbl01'],
    ['thirteen characters', 'tbl0123456789'],
    ['a dash', 'tbl-01'],
    ['a Latin letter outside a-z0-9 (underscore)', 'tbl_01'],
  ])('a key with %s breaks ^[a-z0-9]{6,12}$ and is refused everywhere', (_name, bad) => {
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, tables: [{ ...table, key: bad }] }).success).toBe(false)
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, areas: [{ ...floorPlan.areas[0], key: bad }] }).success).toBe(false)
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, tables: [{ ...table, areaKey: bad }] }).success).toBe(false)
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, joins: [{ ...floorPlan.joins[0], key: bad }] }).success).toBe(false)
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, joins: [{ ...floorPlan.joins[0], tableKeys: ['tbl001', bad] }] }).success).toBe(false)
    expect(S.bookingSchema.safeParse({ ...booking, tableKeys: [bad] }).success).toBe(false)
  })

  it('accepts keys of six and twelve lower-case letters and digits', () => {
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, tables: [{ ...table, key: 'abcdefghij12' }] }).success).toBe(true)
    expect(S.floorPlanSchema.safeParse({ ...floorPlan, tables: [{ ...table, key: 'a1b2c3' }] }).success).toBe(true)
  })
})
