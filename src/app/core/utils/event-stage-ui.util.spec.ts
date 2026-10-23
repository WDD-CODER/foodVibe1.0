import {
  EVENT_STAGE_ORDER,
  canPickNotClosed,
  isActiveStage,
  needsDateFor,
  selectableStages,
  stageErrorKey,
  stageLabelKey
} from './event-stage-ui.util'

describe('event-stage-ui.util', () => {
  it('never offers "finished" as a pick', () => {
    expect(selectableStages('inquiry')).not.toContain('finished')
    expect(selectableStages('execution')).not.toContain('finished')
  })

  it('offers "not closed" only from the first two stages', () => {
    expect(selectableStages('inquiry')).toContain('not_closed')
    expect(selectableStages('deposit_paid')).not.toContain('not_closed')
  })

  it('canPickNotClosed is true for inquiry and quote_sent only', () => {
    expect(canPickNotClosed('inquiry')).toBeTrue()
    expect(canPickNotClosed('quote_sent')).toBeTrue()
    expect(canPickNotClosed('deposit_paid')).toBeFalse()
    expect(canPickNotClosed('not_closed')).toBeFalse()
  })

  it('needsDateFor asks for a date from "deposit paid" on, not before', () => {
    expect(needsDateFor('deposit_paid', undefined)).toBeTrue()
    expect(needsDateFor('deposit_paid', '')).toBeTrue()
    expect(needsDateFor('ordering', undefined)).toBeTrue()
    expect(needsDateFor('quote_sent', undefined)).toBeFalse()
    expect(needsDateFor('not_closed', undefined)).toBeFalse()
    expect(needsDateFor('deposit_paid', '2026-12-01')).toBeFalse()
  })

  it('isActiveStage is false only for finished and not_closed', () => {
    expect(isActiveStage('finished')).toBeFalse()
    expect(isActiveStage('not_closed')).toBeFalse()
    for (const stage of EVENT_STAGE_ORDER.filter((s) => s !== 'finished' && s !== 'not_closed')) {
      expect(isActiveStage(stage)).toBeTrue()
    }
    expect(isActiveStage(undefined)).toBeTrue()
  })

  it('stageLabelKey builds the dictionary key', () => {
    expect(stageLabelKey('quote_sent')).toBe('event_stage_quote_sent')
  })

  it('stageErrorKey maps every plan 442 code and falls back for the rest', () => {
    expect(stageErrorKey('DATE_REQUIRED')).toBe('stage_needs_date')
    expect(stageErrorKey('REASON_REQUIRED')).toBe('stage_reason_required')
    expect(stageErrorKey('NOT_CLOSED_FROM_STAGE')).toBe('stage_not_closed_from')
    expect(stageErrorKey('USE_FINISH')).toBe('stage_finished_hint')
    expect(stageErrorKey('FINISH_FROM_STAGE')).toBe('stage_finish_from_not_closed')
    expect(stageErrorKey('EVENT_FINISHED')).toBe('event_finished_locked')
    expect(stageErrorKey('NOTE_EMPTY')).toBe('notes_empty_error')
    expect(stageErrorKey('NOTE_TOO_LONG')).toBe('notes_too_long')
    expect(stageErrorKey('FORBIDDEN')).toBe('no_permission')
    expect(stageErrorKey('SOMETHING_ELSE')).toBe('stage_change_failed')
    expect(stageErrorKey(undefined)).toBe('stage_change_failed')
  })
})
