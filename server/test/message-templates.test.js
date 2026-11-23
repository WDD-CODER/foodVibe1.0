'use strict'
/** Plan 675 - the closed list of message templates. */

const {
  MESSAGE_TEMPLATES, MESSAGE_TEMPLATE_NAMES, templateMessage, oneLine,
} = require('../generated/schemas/front-desk/message-templates')

describe('message templates', () => {
  it('has exactly the eight names, in order', () => {
    expect(MESSAGE_TEMPLATE_NAMES).toEqual([
      'booking_confirmed', 'booking_reminder', 'booking_cancelled', 'waitlist_table_ready',
      'request_received', 'request_approved', 'request_declined', 'need_more_info',
    ])
    expect(Object.keys(MESSAGE_TEMPLATES)).toEqual(MESSAGE_TEMPLATE_NAMES)
    for (const t of Object.values(MESSAGE_TEMPLATES)) expect(t.bodyKey.startsWith('tpl_')).toBe(true)
  })

  it('builds the reminder with its two buttons from a token', () => {
    const m = templateMessage('booking_reminder', { name: 'Dana', time: '19:00', partySize: 4, token: 'abc' })
    expect(m.name).toBe('booking_reminder')
    expect(m.params).toEqual(['Dana', '19:00', '4'])
    expect(m.buttons.map(b => b.id)).toEqual(['CONFIRM:abc', 'CANCEL:abc'])
  })

  it('puts every parameter on one line (R-17)', () => {
    expect(oneLine('a\nb\tc  d')).toBe('a b c d')
    const m = templateMessage('need_more_info', { text: 'line1\nline2\t  line3' })
    expect(m.params).toEqual(['line1 line2 line3'])
    expect(oneLine('x'.repeat(300))).toHaveLength(200)
  })

  it('throws BAD_TEMPLATE for an unknown name, a missing value, or buttons without a token', () => {
    const code = fn => { try { fn() } catch (e) { return e.code } return null }
    expect(code(() => templateMessage('nope', {}))).toBe('BAD_TEMPLATE')
    expect(code(() => templateMessage('request_received', {}))).toBe('BAD_TEMPLATE')
    expect(code(() => templateMessage('booking_reminder', { name: 'a', time: 'b', partySize: 1 }))).toBe('BAD_TEMPLATE')
  })
})
