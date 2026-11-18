'use strict'
/** Plan 622 (C-LOGX) - the pure rules: question list, cleaning the model's answer, kept ratio. */

const { buildQuestionList, cleanLogisticsDraft, keptRatio } = require('../utils/logistics-extract')

const q = (key, answerType = 'status', extra = {}) => ({ key, answerType, phase: 'site_visit', section: 'space', ...extra })
const QUESTIONS = [q('k0'), q('k1', 'quantity'), q('k2', 'text'), q('k3'), q('k4')]
const clean = (model, over = {}) => cleanLogisticsDraft({ questions: QUESTIONS, model, storedAnswers: [], sections: ['space', 'other', 'mine'], ...over })

describe('buildQuestionList', () => {
  it('numbers from 0 with type and hint', () => {
    expect(buildQuestionList([q('a'), q('b', 'text', { hint: 'h' })])).toBe('0. "a" [status]\n1. "b" [text] — "h"')
  })
  it('says (none) for an empty list', () => {
    expect(buildQuestionList([])).toBe('(none)')
  })
})

describe('cleanLogisticsDraft', () => {
  it('returns null for an answer that fails the schema', () => {
    expect(clean({ answers: 'x' })).toBeNull()
  })

  it('drops an i out of range and a repeated i', () => {
    const out = clean({ answers: [{ i: 0, status: 'needed' }, { i: 0, status: 'not_needed' }, { i: 9, status: 'needed' }, { i: -1, status: 'needed' }].slice(0, 3) })
    expect(out.answers.map(a => a.itemKey)).toEqual(['k0'])
    expect(out.answers[0].status).toBe('needed')
  })

  it('removes a quantity on a status question and keeps the answer', () => {
    const out = clean({ answers: [{ i: 0, status: 'needed', quantity: 5 }, { i: 1, status: 'needed', quantity: 7 }] })
    expect(out.answers[0]).toEqual({ itemKey: 'k0', phase: 'site_visit', section: 'space', status: 'needed' })
    expect(out.answers[1].quantity).toBe(7)
  })

  it('drops a quantity out of range but keeps the answer', () => {
    const out = clean({ answers: [{ i: 1, status: 'needed', quantity: 999999 }] })
    expect(out.answers[0].quantity).toBeUndefined()
  })

  it('drops a text question with no text', () => {
    const out = clean({ answers: [{ i: 2, status: 'needed' }, { i: 2, status: 'needed', text: 'x' }] })
    expect(out.answers).toEqual([])
    expect(clean({ answers: [{ i: 2, status: 'needed', text: '   ' }] }).answers).toEqual([])
  })

  it('drops an unknown status', () => {
    expect(clean({ answers: [{ i: 0, status: 'maybe' }, { i: 3, status: 'unchecked' }] }).answers).toEqual([])
  })

  it('cuts text longer than 500', () => {
    const out = clean({ answers: [{ i: 2, status: 'needed', text: 'x'.repeat(900) }] })
    expect(out.answers[0].text).toHaveLength(500)
  })

  it('never takes payer or showToClient from the model', () => {
    const out = clean({
      answers: [{ i: 0, status: 'needed', payer: 'client', showToClient: true }],
      extra: [{ label: 'tent', status: 'needed', payer: 'client', showToClient: true }],
    })
    expect(Object.keys(out.answers[0])).not.toContain('payer')
    expect(Object.keys(out.answers[0])).not.toContain('showToClient')
    expect(Object.keys(out.adhoc[0])).not.toContain('payer')
    expect(JSON.stringify(out)).not.toContain('showToClient')
  })

  it('sends an answered question to conflicts', () => {
    const out = clean({ answers: [{ i: 0, status: 'not_needed' }] }, { storedAnswers: [{ itemKey: 'k0', status: 'needed', payer: 'ours' }] })
    expect(out.answers).toEqual([])
    expect(out.conflicts).toEqual([{ itemKey: 'k0', current: { status: 'needed', payer: 'ours' }, suggested: { status: 'not_needed' } }])
  })

  it('drops an identical suggestion on an answered question', () => {
    const out = clean({ answers: [{ i: 1, status: 'needed', quantity: 4 }] }, { storedAnswers: [{ itemKey: 'k1', status: 'needed', quantity: 4 }] })
    expect(out.answers).toEqual([])
    expect(out.conflicts).toEqual([])
  })

  it('treats a stored needed + payer client as client_provides', () => {
    const out = clean({ answers: [{ i: 0, status: 'client_provides' }] }, { storedAnswers: [{ itemKey: 'k0', status: 'needed', payer: 'client' }] })
    expect(out.conflicts).toEqual([])
    expect(out.answers).toEqual([])
  })

  it('an unchecked stored answer is not an answer', () => {
    const out = clean({ answers: [{ i: 0, status: 'needed' }] }, { storedAnswers: [{ itemKey: 'k0', status: 'unchecked' }] })
    expect(out.answers).toHaveLength(1)
  })

  it('an extra.section the business does not have becomes other', () => {
    const out = clean({ answers: [], extra: [{ label: 'a', section: 'mine', status: 'needed' }, { label: 'b', section: 'nope', status: 'needed' }] })
    expect(out.adhoc.map(a => a.section)).toEqual(['mine', 'other'])
  })

  it('cuts extras to 20 and drops a duplicate label, an empty one, a question key and a bad status', () => {
    const extra = Array.from({ length: 30 }, (_, n) => ({ label: `item ${n}`, status: 'needed' }))
    expect(clean({ answers: [], extra }).adhoc).toHaveLength(20)
    const out = clean({ answers: [], extra: [
      { label: 'Tent', status: 'needed' }, { label: ' tent ', status: 'needed' }, { label: '  ', status: 'needed' },
      { label: 'k0', status: 'needed' }, { label: 'ok', status: 'bogus' },
    ] })
    expect(out.adhoc.map(a => a.label)).toEqual(['Tent'])
  })

  it('never gives an extra a quantity and cuts a long label to 120', () => {
    const out = clean({ answers: [], extra: [{ label: 'y'.repeat(300), status: 'needed', quantity: 3 }] })
    expect(out.adhoc[0].label).toHaveLength(120)
    expect(out.adhoc[0].quantity).toBeUndefined()
  })

  it('unanswered (a): 5 questions, none answered, 2 drafted -> the other 3 in list order', () => {
    const out = clean({ answers: [{ i: 0, status: 'needed' }, { i: 3, status: 'needed' }] })
    expect(out.unanswered).toEqual(['k1', 'k2', 'k4'])
  })

  it('unanswered (b): 2 already answered, 1 new, 1 changed -> the 2 remaining keys', () => {
    const out = clean(
      { answers: [{ i: 2, status: 'needed', text: 't' }, { i: 0, status: 'not_needed' }] },
      { storedAnswers: [{ itemKey: 'k0', status: 'needed' }, { itemKey: 'k1', status: 'needed', quantity: 2 }] },
    )
    expect(out.answers.map(a => a.itemKey)).toEqual(['k2'])
    expect(out.conflicts.map(c => c.itemKey)).toEqual(['k0'])
    expect(out.unanswered).toEqual(['k3', 'k4'])
  })
})

describe('keptRatio', () => {
  const draft = { answers: [{ itemKey: 'a', status: 'needed' }], adhoc: [{ label: 'x', status: 'needed', text: 'hi' }], conflicts: [{ itemKey: 'c' }] }
  it('is 1 when every suggested line is saved unchanged', () => {
    expect(keptRatio(draft, [{ itemKey: 'a', status: 'needed' }, { label: 'x', status: 'needed', text: ' hi ' }])).toBe(1)
  })
  it('is 0.5 when one of two is saved unchanged', () => {
    expect(keptRatio(draft, [{ itemKey: 'a', status: 'needed' }, { label: 'x', status: 'needed', text: 'changed' }])).toBe(0.5)
  })
  it('is 0 when none is kept', () => {
    expect(keptRatio(draft, [])).toBe(0)
    expect(keptRatio(draft, [{ itemKey: 'a', status: 'not_needed' }])).toBe(0)
  })
  it('is 1 for an empty draft; conflicts are not counted', () => {
    expect(keptRatio({ answers: [], adhoc: [], conflicts: [{ itemKey: 'c' }] }, [])).toBe(1)
  })
  it('a quantity must match; absent equals absent', () => {
    expect(keptRatio({ answers: [{ itemKey: 'a', status: 'needed', quantity: 3 }], adhoc: [] }, [{ itemKey: 'a', status: 'needed', quantity: 4 }])).toBe(0)
    expect(keptRatio({ answers: [{ itemKey: 'a', status: 'needed' }], adhoc: [] }, [{ itemKey: 'a', status: 'needed' }])).toBe(1)
  })
})
