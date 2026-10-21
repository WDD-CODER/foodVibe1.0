'use strict'
/** Plan 442 - the pure stage-move and note rules. */

const { applyStageChange, newNote } = require('../utils/event-stage')

const actor = { userId: 'u1', name: 'דן' }
const dated = { stage: 'inquiry', eventDate: '2026-12-01' }

/** Applies a successful change to a copy of the event, like the router's update does. */
function apply(event, change, now) {
  const r = applyStageChange(event, change, actor, now)
  expect(r.ok).toBe(true)
  return { ...event, ...r.set, stageHistory: [...(event.stageHistory ?? []), ...(r.push ? [r.push] : [])] }
}

describe('applyStageChange', () => {
  it('inquiry -> quote_sent -> deposit_paid logs two entries and sets closedAt to the deposit move', () => {
    const a = apply(dated, { stage: 'quote_sent' }, 100)
    const b = apply(a, { stage: 'deposit_paid' }, 200)
    expect(b.stageHistory).toEqual([
      { stage: 'quote_sent', at: 100, by: 'u1', byName: 'דן' },
      { stage: 'deposit_paid', at: 200, by: 'u1', byName: 'דן' },
    ])
    expect(b.closedAt).toBe(200)
    expect(a.closedAt).toBeUndefined()
  })

  it('moving back and forward again keeps the first closedAt', () => {
    let e = apply(dated, { stage: 'deposit_paid' }, 200)
    e = apply(e, { stage: 'quote_sent' }, 300)
    e = apply(e, { stage: 'ordering' }, 400)
    expect(e.closedAt).toBe(200)
    expect(e.stage).toBe('ordering')
    expect(e.stageHistory).toHaveLength(3)
  })

  it('deposit_paid or later needs an event date', () => {
    for (const stage of ['deposit_paid', 'ordering', 'execution', 'post_production']) {
      expect(applyStageChange({ stage: 'inquiry' }, { stage }, actor, 1)).toEqual({ ok: false, status: 400, error: 'DATE_REQUIRED' })
    }
    expect(applyStageChange({ stage: 'inquiry' }, { stage: 'quote_sent' }, actor, 1).ok).toBe(true)
  })

  it('not_closed needs a reason from the list', () => {
    expect(applyStageChange(dated, { stage: 'not_closed' }, actor, 1)).toEqual({ ok: false, status: 400, error: 'REASON_REQUIRED' })
    expect(applyStageChange(dated, { stage: 'not_closed', reason: 'weather' }, actor, 1).error).toBe('REASON_REQUIRED')
  })

  it('not_closed from quote_sent records the time and the reason', () => {
    const r = applyStageChange({ ...dated, stage: 'quote_sent' }, { stage: 'not_closed', reason: 'price', reasonText: ' יקר ' }, actor, 50)
    expect(r.ok).toBe(true)
    expect(r.set).toEqual({ stage: 'not_closed', notClosedAt: 50, notClosedReason: 'price', notClosedText: 'יקר' })
    expect(r.push).toEqual({ stage: 'not_closed', at: 50, by: 'u1', byName: 'דן', reason: 'price', reasonText: 'יקר' })
  })

  it('not_closed from a later stage is refused', () => {
    expect(applyStageChange({ ...dated, stage: 'ordering' }, { stage: 'not_closed', reason: 'price' }, actor, 1))
      .toEqual({ ok: false, status: 400, error: 'NOT_CLOSED_FROM_STAGE' })
  })

  it('finished is reached only through finish', () => {
    expect(applyStageChange(dated, { stage: 'finished' }, actor, 1)).toEqual({ ok: false, status: 400, error: 'USE_FINISH' })
  })

  it('a finished event cannot move', () => {
    expect(applyStageChange({ ...dated, stage: 'finished' }, { stage: 'quote_sent' }, actor, 1))
      .toEqual({ ok: false, status: 409, error: 'EVENT_FINISHED' })
  })

  it('the same stage is ok and writes nothing', () => {
    const r = applyStageChange({ ...dated, stage: 'quote_sent' }, { stage: 'quote_sent' }, actor, 1)
    expect(r).toEqual({ ok: true, set: {}, push: null })
  })

  it('not_closed can go back to quote_sent', () => {
    const r = applyStageChange({ ...dated, stage: 'not_closed' }, { stage: 'quote_sent' }, actor, 9)
    expect(r.ok).toBe(true)
    expect(r.set).toEqual({ stage: 'quote_sent' })
  })

  it('an unknown stage is refused and a missing current stage counts as inquiry', () => {
    expect(applyStageChange(dated, { stage: 'cancelled' }, actor, 1).error).toBe('BAD_STAGE')
    expect(applyStageChange({}, { stage: 'not_closed', reason: 'other' }, actor, 1).ok).toBe(true)
  })
})

describe('newNote', () => {
  it('trims and stamps the author', () => {
    expect(newNote('  שלום  ', actor, 5, 'n1')).toEqual({
      ok: true, note: { _id: 'n1', text: 'שלום', at: 5, by: 'u1', byName: 'דן' },
    })
  })

  it('refuses empty and over-long text', () => {
    expect(newNote('   ', actor, 1, 'n')).toEqual({ ok: false, status: 400, error: 'NOTE_EMPTY' })
    expect(newNote(undefined, actor, 1, 'n').error).toBe('NOTE_EMPTY')
    expect(newNote('a'.repeat(2001), actor, 1, 'n')).toEqual({ ok: false, status: 400, error: 'NOTE_TOO_LONG' })
    expect(newNote('a'.repeat(2000), actor, 1, 'n').ok).toBe(true)
  })
})
