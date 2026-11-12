import type { LogisticsAnswer } from '@models/menu-event.model'
import type { LogisticsItemTerm } from '../services/logistics-item-registry.service'
import { buildClientSummary, openItems } from './logistics-summary.util'

const item = (key: string): LogisticsItemTerm =>
  ({
    _id: key,
    userId: '__master__',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    kind: 'logisticsItem',
    key,
    sortOrder: 0,
    phase: 'site_visit',
    section: 'space',
    answerType: 'status'
  }) as LogisticsItemTerm
const answer = (over: Partial<LogisticsAnswer>): LogisticsAnswer => ({
  itemKey: 'a',
  phase: 'site_visit',
  section: 'space',
  status: 'needed',
  payer: 'client',
  at: 1,
  by: 'u',
  byName: 'U',
  ...over
})

const sections = [
  { key: 'infrastructure', label: 'H:infra' },
  { key: 'space', label: 'H:space' },
  { key: 'food', label: 'H:food' }
]

describe('logistics-summary.util', () => {
  it('lists needed answers with payer client; leaves out ours, chef, none, not_needed and unchecked', () => {
    const out = buildClientSummary(
      [
        answer({ itemKey: 'a' }),
        answer({ itemKey: 'b', payer: 'ours' }),
        answer({ itemKey: 'c', payer: 'chef' }),
        answer({ itemKey: 'd', payer: undefined }),
        answer({ itemKey: 'e', status: 'not_needed' }),
        answer({ itemKey: 'f', status: 'unchecked' })
      ],
      [],
      sections
    )
    expect(out).toBe(['H:space', '• a'].join('\n'))
  })

  it('lists the old client_provides status', () => {
    expect(buildClientSummary([answer({ status: 'client_provides', payer: undefined })], [item('a')], sections)).toBe(
      ['H:space', '• a'].join('\n')
    )
  })

  it('follows the section order, groups split by a blank line', () => {
    const out = buildClientSummary(
      [answer({ itemKey: 'x', section: 'food' }), answer({ itemKey: 'y', section: 'infrastructure' })],
      [item('x'), item('y')],
      sections
    )
    expect(out).toBe(['H:infra', '• y', '', 'H:food', '• x'].join('\n'))
  })

  it('a custom section prints its key; quantity and text are appended', () => {
    const out = buildClientSummary(
      [answer({ itemKey: 'gone', section: 'סעיף שלי', quantity: 2, text: 'הערה' })],
      [],
      sections
    )
    expect(out).toBe(['סעיף שלי', '• gone · 2 · הערה'].join('\n'))
  })

  it('prefers the answer label', () => {
    expect(buildClientSummary([answer({ label: 'תווית' })], [item('a')], sections)).toContain('• תווית')
  })

  it('returns empty text when nothing qualifies', () => {
    expect(buildClientSummary([answer({ payer: 'ours' })], [item('a')], sections)).toBe('')
  })

  it('openItems counts items with no answer and unchecked ones', () => {
    const open = openItems(
      [item('a'), item('b'), item('c')],
      [answer({ itemKey: 'a', status: 'unchecked' }), answer({ itemKey: 'b' })]
    )
    expect(open.map((i) => i.key)).toEqual(['a', 'c'])
  })
})
