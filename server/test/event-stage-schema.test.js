'use strict'
/** Plan 442 - the event schema accepts the stage, history, notes, customer and deposit fields. */

const { menuEventSchema } = require('../generated/schemas/entities')
const { EVENT_STAGES, EVENT_SERVER_FIELDS } = require('../generated/schemas/entities/event-stage')
const { menuEventBody, stored } = require('./helpers/v2-docs')

const base = () => stored(menuEventBody(), { _id: 'e1', userId: 'u1' })
const full = () => ({
  ...base(),
  stage: 'deposit_paid',
  stageHistory: [{ stage: 'not_closed', at: 1, by: 'u1', byName: 'דן', reason: 'price', reasonText: 'יקר' }],
  closedAt: 2,
  notClosedAt: 1,
  notClosedReason: 'price',
  notClosedText: 'יקר',
  legacy: true,
  notes: [{ _id: 'n1', text: 'התקשרתי', at: 3, by: 'u1', byName: 'דן', editedAt: 4 }],
  clientName: 'לקוח',
  clientPhone: '050-1234567',
  deposit: { amount: 500, date: '2026-10-01' },
})

describe('menu event stage fields', () => {
  it('accepts every new field', () => {
    expect(menuEventSchema.safeParse(full()).success).toBe(true)
    expect(menuEventSchema.safeParse(base()).success).toBe(true)
  })

  it('rejects an unknown stage, an over-long note and an unknown reason', () => {
    expect(menuEventSchema.safeParse({ ...full(), stage: 'cancelled' }).success).toBe(false)
    const long = { ...full(), notes: [{ ...full().notes[0], text: 'a'.repeat(2001) }] }
    expect(menuEventSchema.safeParse(long).success).toBe(false)
    expect(menuEventSchema.safeParse({ ...full(), notClosedReason: 'weather' }).success).toBe(false)
  })

  it('lists the stages in order and the server-owned fields', () => {
    expect(EVENT_STAGES[0]).toBe('inquiry')
    expect(EVENT_STAGES[EVENT_STAGES.length - 1]).toBe('not_closed')
    expect(EVENT_SERVER_FIELDS).toContain('stageHistory')
    expect(EVENT_SERVER_FIELDS).not.toContain('clientName')
  })
})
