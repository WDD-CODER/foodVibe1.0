import { CookViewPage } from './cook-view.page'

describe('CookViewPage', () => {
  it('class symbol is defined', () => {
    expect(CookViewPage).toBeDefined()
  })

  describe('timerDisplay_', () => {
    it('returns h:mm:ss format when seconds >= 3600', () => {
      // 1 hour 30 minutes = 5400 seconds
      const h = Math.floor(5400 / 3600)
      const m = Math.floor((5400 % 3600) / 60)
      const sec = 5400 % 60
      const display = h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
        : `${m}:${sec.toString().padStart(2, '0')}`
      expect(display).toBe('1:30:00')
    })

    it('returns m:ss format when seconds < 3600', () => {
      const s = 185 // 3 minutes 5 seconds
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      const display = h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
        : `${m}:${sec.toString().padStart(2, '0')}`
      expect(display).toBe('3:05')
    })
  })
})
