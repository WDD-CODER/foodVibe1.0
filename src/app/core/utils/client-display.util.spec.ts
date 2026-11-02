import { Client } from '@models/client.model'
import { clientLabel, matchesClientQuery, normalizePhone } from './client-display.util'

describe('client-display.util', () => {
  const dana: Client = {
    _id: 'c1',
    name: 'Dana Cohen',
    phone: '052-123 4567',
    phoneNormalized: '0521234567',
    clientType: 'private'
  }

  it('normalizePhone keeps digits only', () => {
    expect(normalizePhone('(052) 123-45 67')).toBe('0521234567')
    expect(normalizePhone('abc')).toBe('')
  })

  it('matches on a name hit, any case', () => {
    expect(matchesClientQuery(dana, 'cohen')).toBeTrue()
    expect(matchesClientQuery(dana, 'DANA')).toBeTrue()
  })

  it('matches on a phone prefix hit', () => {
    expect(matchesClientQuery(dana, '0521')).toBeTrue()
  })

  it('matches a formatted phone query against phoneNormalized', () => {
    expect(matchesClientQuery(dana, '052-123')).toBeTrue()
  })

  it('misses on an unknown name and a non-prefix phone', () => {
    expect(matchesClientQuery(dana, 'Levi')).toBeFalse()
    expect(matchesClientQuery(dana, '1234')).toBeFalse()
    expect(matchesClientQuery(dana, '')).toBeFalse()
  })

  it('falls back to the phone digits when phoneNormalized is absent (staff view)', () => {
    const staffView: Client = { _id: 'c2', name: 'Avi', phone: '054-777 0000' }
    expect(matchesClientQuery(staffView, '054-77')).toBeTrue()
  })

  it('labels name and phone without a count', () => {
    expect(clientLabel(dana, 0, 'events')).toBe('Dana Cohen · 052-123 4567')
  })

  it('labels name, phone and count when the client has events', () => {
    expect(clientLabel(dana, 3, 'events')).toBe('Dana Cohen · 052-123 4567 · 3 events')
  })
})
