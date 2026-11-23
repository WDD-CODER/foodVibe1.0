import { bookingIcs } from './booking-calendar.util'

describe('bookingIcs (plan 670)', () => {
  it('builds a calendar text with the title, the local start and the length', async () => {
    const text = await bookingIcs({
      title: 'שולחן בהבית',
      date: '2026-12-01',
      time: '20:00',
      minutes: 90,
      location: 'הרצל 1'
    })
    expect(text).not.toBeNull()
    expect(text!.startsWith('BEGIN:VCALENDAR')).toBeTrue()
    expect(text).toContain('שולחן בהבית')
    expect(text).toContain('20261201T200000')
    expect(text).toContain('DURATION:PT90M')
  })

  it('returns null for a date it cannot read', async () => {
    expect(await bookingIcs({ title: 'x', date: 'bad', time: '20:00', minutes: 60 })).toBeNull()
  })
})
