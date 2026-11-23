import { bookingIcs } from './booking-calendar.util'

describe('bookingIcs (plan 670)', () => {
  it('builds a local-time calendar text with the title, the start and the length', async () => {
    const text = await bookingIcs({
      title: 'שולחן בהבית',
      date: '2026-12-01',
      time: '20:00',
      minutes: 90,
      location: 'הרצל 1'
    })
    expect(text).toBeTruthy()
    expect(text!.startsWith('BEGIN:VCALENDAR')).toBeTrue()
    expect(text).toContain('שולחן בהבית')
    expect(text).toContain('DTSTART:20261201T200000')
    expect(text).toMatch(/DURATION:PT90M/)
  })

  it('answers null for a date the library rejects', async () => {
    expect(await bookingIcs({ title: 'x', date: 'bad', time: '20:00', minutes: 60 })).toBeNull()
  })
})
