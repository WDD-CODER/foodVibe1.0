'use strict'
/** Plan 548 - the fit rules (qualify), the opening-hours rule, the local-time helper and the starting templates. */

const fs = require('fs')
const path = require('path')
const { qualify, parseReason, hoursCheck } = require('../generated/schemas/front-desk/qualify')
const { jerusalemEpoch, weekdayOf } = require('../generated/schemas/front-desk/local-time')
const { templateFor } = require('../generated/schemas/front-desk-templates')
const { frontDeskProfileSchema, BUSINESS_TYPES } = require('../generated/schemas/entities/front-desk-profile.schema')

const dictionary = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/assets/data/dictionary.json'), 'utf8')).general

// 2026-06-01 is a Monday; Jerusalem is on summer time (UTC+3).
const NOW = jerusalemEpoch('2026-06-01', '10:00')
const ALL_WEEK = [{ days: 'א-ש', time: '12:00-23:00', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '12:00', close: '23:00' }]
const SUN_TO_TUE = [{ days: 'א-ג', time: '12:00-23:00', dayIndexes: [0, 1, 2], open: '12:00', close: '23:00' }]
const FREE_TEXT = [{ days: 'א-ה', time: 'בערב' }]

const table = templateFor('restaurant').requestKinds.table
const chefEvent = templateFor('private_chef').requestKinds.event
const chefConsult = templateFor('private_chef').requestKinds.consultation
const cateringEvent = templateFor('catering').requestKinds.event
const tasting = templateFor('catering').requestKinds.tasting
const otherConsult = templateFor('other').requestKinds.consultation
const withRules = (cfg, rules) => ({ ...cfg, rules: { ...cfg.rules, ...rules } })

const tableWanted = { date: '2026-06-02', time: '19:00', partySize: 4 }

/** [name, kindConfig, wanted, answers, ctx, expected] */
const ROWS = [
  ['table: everything in range', table, tableWanted, {}, { now: NOW, hours: ALL_WEEK, kind: 'table' }, { verdict: 'fit', reasons: [] }],
  ['table: kind disabled', { ...table, enabled: false }, tableWanted, {}, {}, { verdict: 'unfit', reasons: ['fd_reason_kind_disabled'] }],
  ['table: nothing given lists every required question', table, {}, {}, {}, {
    verdict: 'borderline',
    reasons: ['fd_reason_missing_answer|q=date', 'fd_reason_missing_answer|q=time', 'fd_reason_missing_answer|q=party_size'],
  }],
  ['table: 13 guests for a max of 12 is borderline', table, { ...tableWanted, partySize: 13 }, {}, {}, { verdict: 'borderline', reasons: ['fd_reason_party_too_large|max=12'] }],
  ['table: 14 guests for a max of 12 is unfit', table, { ...tableWanted, partySize: 14 }, {}, {}, { verdict: 'unfit', reasons: ['fd_reason_party_too_large|max=12'] }],
  ['table: R-10 outside the opening hours', table, { ...tableWanted, time: '11:00' }, {}, { now: NOW, hours: ALL_WEEK, kind: 'table' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_outside_hours|open=12:00;close=23:00'],
  }],
  ['table: R-10 too soon', table, { date: '2026-06-01', time: '11:00', partySize: 2 }, {}, { now: NOW, kind: 'table' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_too_soon|hours=2'],
  }],
  ['table: too far ahead', table, { ...tableWanted, date: '2026-09-01' }, {}, { now: NOW, kind: 'table' }, { verdict: 'unfit', reasons: ['fd_reason_too_far|days=60'] }],
  ['table: closed date', table, tableWanted, {}, { closedDates: ['2026-06-02'] }, { verdict: 'unfit', reasons: ['fd_reason_closed_date'] }],
  ['table: closed weekday names the open days', table, { ...tableWanted, date: '2026-06-03' }, {}, { hours: SUN_TO_TUE, kind: 'table' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_closed_day|days=0,1,2'],
  }],
  ['table: free-text hours are not checked', table, { ...tableWanted, time: '03:00' }, {}, { hours: FREE_TEXT, kind: 'table' }, { verdict: 'fit', reasons: [] }],
  ['table: no now and no hours skips the time rules', table, { ...tableWanted, time: '03:00', date: '2030-01-01' }, {}, {}, { verdict: 'fit', reasons: [] }],
  ['private chef event: in range, hours ignored for an event', chefEvent, { date: '2026-06-20', partySize: 20, location: 'תל אביב' }, {}, { now: NOW, hours: SUN_TO_TUE, kind: 'event' }, {
    verdict: 'fit',
    reasons: [],
  }],
  ['private chef event: 1 guest for a min of 2 is unfit', chefEvent, { date: '2026-06-20', partySize: 1, location: 'חיפה' }, {}, {}, {
    verdict: 'unfit',
    reasons: ['fd_reason_party_too_small|min=2'],
  }],
  ['private chef event: 45 guests for a max of 40 is unfit', chefEvent, { date: '2026-06-20', partySize: 45, location: 'חיפה' }, {}, {}, {
    verdict: 'unfit',
    reasons: ['fd_reason_party_too_large|max=40'],
  }],
  ['private chef event: 42 guests for a max of 40 is borderline', chefEvent, { date: '2026-06-20', partySize: 42, location: 'חיפה' }, {}, {}, {
    verdict: 'borderline',
    reasons: ['fd_reason_party_too_large|max=40'],
  }],
  ['private chef event: missing location', chefEvent, { date: '2026-06-20', partySize: 10 }, {}, {}, {
    verdict: 'borderline',
    reasons: ['fd_reason_missing_answer|q=location'],
  }],
  ['private chef event: too soon (72 hours)', chefEvent, { date: '2026-06-03', partySize: 10, location: 'חיפה' }, {}, { now: NOW }, {
    verdict: 'unfit',
    reasons: ['fd_reason_too_soon|hours=72'],
  }],
  ['budget: 95 for a min of 100 is borderline', withRules(chefEvent, { minBudgetPerGuest: 100 }), { date: '2026-06-20', partySize: 10, location: 'חיפה', budgetPerGuest: 95 }, {}, {}, {
    verdict: 'borderline',
    reasons: ['fd_reason_budget_low|min=100'],
  }],
  ['budget: 80 for a min of 100 is unfit', withRules(chefEvent, { minBudgetPerGuest: 100 }), { date: '2026-06-20', partySize: 10, location: 'חיפה', budgetPerGuest: 80 }, {}, {}, {
    verdict: 'unfit',
    reasons: ['fd_reason_budget_low|min=100'],
  }],
  ['area: a listed area (case-insensitive substring) fits', withRules(chefEvent, { areas: ['רמת גן', 'Tel Aviv'] }), { date: '2026-06-20', partySize: 10, location: 'tel aviv, Rothschild' }, {}, {}, {
    verdict: 'fit',
    reasons: [],
  }],
  ['area: a place outside the list is unfit', withRules(chefEvent, { areas: ['רמת גן', 'Tel Aviv'] }), { date: '2026-06-20', partySize: 10, location: 'חיפה' }, {}, {}, {
    verdict: 'unfit',
    reasons: ['fd_reason_out_of_area'],
  }],
  ['catering event: 25 guests for a min of 30 is unfit', cateringEvent, { date: '2026-08-01', partySize: 25, eventTypeKey: 'wedding', location: 'תל אביב' }, {}, { now: NOW }, {
    verdict: 'unfit',
    reasons: ['fd_reason_party_too_small|min=30'],
  }],
  ['catering event: 28 guests for a min of 30 is borderline', cateringEvent, { date: '2026-08-01', partySize: 28, eventTypeKey: 'wedding', location: 'תל אביב' }, {}, { now: NOW }, {
    verdict: 'borderline',
    reasons: ['fd_reason_party_too_small|min=30'],
  }],
  ['catering event: no event type', cateringEvent, { date: '2026-08-01', partySize: 50, location: 'תל אביב' }, {}, { now: NOW }, {
    verdict: 'borderline',
    reasons: ['fd_reason_missing_answer|q=event_type'],
  }],
  ['catering event: two weeks notice is needed (336 hours)', cateringEvent, { date: '2026-06-10', partySize: 50, eventTypeKey: 'wedding', location: 'תל אביב' }, {}, { now: NOW }, {
    verdict: 'unfit',
    reasons: ['fd_reason_too_soon|hours=336'],
  }],
  ['catering tasting: in range', tasting, { date: '2026-06-10', time: '18:00', partySize: 6 }, {}, { now: NOW, hours: ALL_WEEK, kind: 'tasting' }, {
    verdict: 'fit',
    reasons: [],
  }],
  ['catering tasting: 7 people for a max of 6 is unfit', tasting, { date: '2026-06-10', time: '18:00', partySize: 7 }, {}, { now: NOW, kind: 'tasting' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_party_too_large|max=6'],
  }],
  ['catering tasting: outside the opening hours', tasting, { date: '2026-06-10', time: '08:00', partySize: 4 }, {}, { now: NOW, hours: ALL_WEEK, kind: 'tasting' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_outside_hours|open=12:00;close=23:00'],
  }],
  ['private chef consultation: exactly 24 hours ahead is enough', chefConsult, { date: '2026-06-02', time: '10:00' }, {}, { now: NOW, kind: 'consultation' }, {
    verdict: 'fit',
    reasons: [],
  }],
  ['private chef consultation: 8 hours ahead is too soon', chefConsult, { date: '2026-06-01', time: '18:00' }, {}, { now: NOW, kind: 'consultation' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_too_soon|hours=24'],
  }],
  ['other consultation: 106 days ahead is too far', otherConsult, { date: '2026-09-15', time: '10:00' }, {}, { now: NOW, kind: 'consultation' }, {
    verdict: 'unfit',
    reasons: ['fd_reason_too_far|days=90'],
  }],
  ['an answer (not a wanted field) satisfies its required question', {
    ...table,
    questions: [{ key: 'allergy', label: 'fd_q_dietary', type: 'text', required: true }],
  }, {}, { allergy: 'אגוזים' }, {}, { verdict: 'fit', reasons: [] }],
  ['reasons stop at eight', {
    ...table,
    questions: Array.from({ length: 12 }, (_, i) => ({ key: `q${i}`, label: 'fd_q_topic', type: 'text', required: true })),
  }, {}, {}, {}, {
    verdict: 'borderline',
    reasons: Array.from({ length: 8 }, (_, i) => `fd_reason_missing_answer|q=q${i}`),
  }],
]

describe('qualify (table)', () => {
  it('has at least 20 rows', () => expect(ROWS.length).toBeGreaterThanOrEqual(20))
  it.each(ROWS)('%s', (_name, kindConfig, wanted, answers, ctx, expected) => {
    expect(qualify(kindConfig, wanted, answers, ctx)).toEqual(expected)
  })
})

describe('R-10: the allowed window travels in the reason', () => {
  it('outside the opening hours', () => {
    const res = qualify(table, { ...tableWanted, time: '23:30' }, {}, { now: NOW, hours: ALL_WEEK, kind: 'table' })
    expect(res).toEqual({ verdict: 'unfit', reasons: ['fd_reason_outside_hours|open=12:00;close=23:00'] })
    expect(parseReason(res.reasons[0])).toEqual({ key: 'fd_reason_outside_hours', params: { open: '12:00', close: '23:00' } })
  })
  it('too soon', () => {
    const res = qualify(table, { date: '2026-06-01', time: '11:00', partySize: 2 }, {}, { now: NOW })
    expect(res.reasons).toEqual(['fd_reason_too_soon|hours=2'])
  })
})

describe('parseReason', () => {
  it('splits key and params, or returns the key alone', () => {
    expect(parseReason('fd_reason_closed_date')).toEqual({ key: 'fd_reason_closed_date', params: {} })
    expect(parseReason('fd_reason_too_far|days=60')).toEqual({ key: 'fd_reason_too_far', params: { days: '60' } })
  })
})

describe('hoursCheck', () => {
  it('is unchecked when no row has day indexes + open + close', () => {
    expect(hoursCheck(FREE_TEXT, '2026-06-02', '10:00')).toEqual({ ok: true, unchecked: true })
    expect(hoursCheck([], '2026-06-02')).toEqual({ ok: true, unchecked: true })
  })
  it('names the open days on a closed day, and the window outside the hours', () => {
    expect(hoursCheck(SUN_TO_TUE, '2026-06-03', '13:00')).toEqual({ ok: false, reason: 'closed_day', openDays: [0, 1, 2] })
    expect(hoursCheck(SUN_TO_TUE, '2026-06-02', '09:00')).toEqual({ ok: false, reason: 'outside_hours', open: '12:00', close: '23:00' })
    expect(hoursCheck(SUN_TO_TUE, '2026-06-02', '12:00')).toEqual({ ok: true })
    expect(hoursCheck(SUN_TO_TUE, '2026-06-02')).toEqual({ ok: true })
  })
  it('a close after midnight runs into the next morning', () => {
    const late = [{ days: 'א', time: '18:00-02:00', dayIndexes: [1], open: '18:00', close: '02:00' }]
    expect(hoursCheck(late, '2026-06-01', '01:00')).toEqual({ ok: true })
    expect(hoursCheck(late, '2026-06-01', '10:00')).toEqual({ ok: false, reason: 'outside_hours', open: '18:00', close: '02:00' })
  })
})

describe('local time', () => {
  it('jerusalemEpoch on a winter date (UTC+2) and a summer date (UTC+3)', () => {
    expect(jerusalemEpoch('2026-01-15', '12:00')).toBe(Date.UTC(2026, 0, 15, 10, 0))
    expect(jerusalemEpoch('2026-07-15', '12:00')).toBe(Date.UTC(2026, 6, 15, 9, 0))
  })
  it('follows the change to summer time (27 March 2026)', () => {
    expect(jerusalemEpoch('2026-03-26', '12:00')).toBe(Date.UTC(2026, 2, 26, 10, 0))
    expect(jerusalemEpoch('2026-03-28', '12:00')).toBe(Date.UTC(2026, 2, 28, 9, 0))
  })
  it('weekdayOf counts Sunday as 0', () => {
    expect(weekdayOf('2026-06-07')).toBe(0)
    expect(weekdayOf('2026-06-01')).toBe(1)
    expect(weekdayOf('2026-06-06')).toBe(6)
  })
})

describe('templates', () => {
  const base = { _id: 'p1', schemaVersion: 2, businessId: 'b1', createdBy: 'u1', createdAt: 1, updatedAt: 1 }
  const labelKeys = body => Object.values(body.requestKinds).flatMap(k => k.questions.flatMap(q => [q.label, ...(q.options ?? [])]))

  it.each(BUSINESS_TYPES)('%s validates once slug and displayName are filled', type => {
    const parsed = frontDeskProfileSchema.safeParse({ ...base, ...templateFor(type), slug: 'my-place', displayName: 'העסק' })
    expect(parsed.success).toBe(true)
  })

  it.each(BUSINESS_TYPES)('%s: every question label and option is a dictionary key', type => {
    const keys = labelKeys(templateFor(type))
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(dictionary[key], key).toBeTruthy()
  })

  it('every reason key qualify can give is in the dictionary', () => {
    for (const key of [
      'fd_reason_kind_disabled', 'fd_reason_missing_answer', 'fd_reason_party_too_small', 'fd_reason_party_too_large',
      'fd_reason_budget_low', 'fd_reason_out_of_area', 'fd_reason_closed_date', 'fd_reason_closed_day',
      'fd_reason_outside_hours', 'fd_reason_too_soon', 'fd_reason_too_far', 'fd_slug_taken',
    ]) expect(dictionary[key], key).toBeTruthy()
  })

  it('returns a fresh object each time and starts as a draft at level 0', () => {
    const a = templateFor('restaurant')
    a.requestKinds.table.rules.maxPartySize = 99
    const b = templateFor('restaurant')
    expect(b.requestKinds.table.rules.maxPartySize).toBe(12)
    expect(b).toMatchObject({ status: 'draft', hours: [], assistant: { level: 0, tone: 'warm' } })
  })
})
