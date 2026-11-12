import { clientLifecycle } from './client-lifecycle.util'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 12)

describe('clientLifecycle', () => {
  it('is new when first seen 10 days ago', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 10 * DAY }, NOW)).toBe('new')
  })
  it('is new on day 30 exactly', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 30 * DAY }, NOW)).toBe('new')
  })
  it('is active when first seen 31 days ago with no contact', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 31 * DAY }, NOW)).toBe('active')
  })
  it('is active on a contact 180 days ago exactly', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 400 * DAY, lastContactAt: NOW - 180 * DAY }, NOW)).toBe('active')
  })
  it('is dormant on a contact 181 days ago', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 400 * DAY, lastContactAt: NOW - 181 * DAY }, NOW)).toBe('dormant')
  })
  it('is dormant when there is no contact and first seen 200 days ago', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 200 * DAY }, NOW)).toBe('dormant')
  })
  it('is active when a recent contact follows an old first sighting', () => {
    expect(clientLifecycle({ firstSeenAt: NOW - 500 * DAY, lastContactAt: NOW - 5 * DAY }, NOW)).toBe('active')
  })
  it('is active when the client has no dates', () => {
    expect(clientLifecycle({}, NOW)).toBe('active')
  })
  it('ignores the stored lifecycle field', () => {
    expect(clientLifecycle({ lifecycle: 'dormant', firstSeenAt: NOW - DAY } as never, NOW)).toBe('new')
  })
})
