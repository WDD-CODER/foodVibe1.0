import type { LogisticsAnswer } from '@models/menu-event.model'
import type { LogisticsItemTerm } from '../services/logistics-item-registry.service'
import { buildClientSummary, openItems } from './logistics-summary.util'

const t = (key: string) => `T:${key}`
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
  showToClient: true,
  at: 1,
  by: 'u',
  byName: 'U',
  ...over
})

describe('logistics-summary.util', () => {
  it('leaves out answers without showToClient or unchecked', () => {
    const out = buildClientSummary(
      [
        answer({ itemKey: 'a' }),
        answer({ itemKey: 'b', showToClient: false }),
        answer({ itemKey: 'c', status: 'unchecked' })
      ],
      [item('a'), item('b'), item('c')],
      t
    )
    expect(out).toBe('T:logistics_section_space\n• a: T:logistics_status_needed')
  })

  it('orders sections canonically with translated headings, groups split by a blank line', () => {
    const out = buildClientSummary(
      [answer({ itemKey: 'x', section: 'food' }), answer({ itemKey: 'y', section: 'infrastructure' })],
      [item('x'), item('y')],
      t
    )
    expect(out).toBe(
      'T:logistics_section_infrastructure\n• y: T:logistics_status_needed\n\nT:logistics_section_food\n• x: T:logistics_status_needed'
    )
  })

  it('renders quantity and text, and falls back to itemKey for a deleted item', () => {
    const out = buildClientSummary(
      [answer({ itemKey: 'gone', quantity: 2, text: 'הערה', status: 'client_provides' })],
      [],
      t
    )
    expect(out).toBe('T:logistics_section_space\n• gone: T:logistics_status_client_provides · 2 · הערה')
  })

  it('prefers the answer label', () => {
    expect(buildClientSummary([answer({ label: 'תווית' })], [item('a')], t)).toContain('• תווית:')
  })

  it('returns empty text when nothing qualifies', () => {
    expect(buildClientSummary([answer({ showToClient: false })], [item('a')], t)).toBe('')
  })

  it('openItems counts items with no answer and unchecked ones', () => {
    const open = openItems(
      [item('a'), item('b'), item('c')],
      [answer({ itemKey: 'a', status: 'unchecked' }), answer({ itemKey: 'b' })]
    )
    expect(open.map((i) => i.key)).toEqual(['a', 'c'])
  })
})
