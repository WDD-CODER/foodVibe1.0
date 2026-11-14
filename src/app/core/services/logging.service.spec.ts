import { TestBed } from '@angular/core/testing'
import { environment } from '../../../environments/environment'
import { LoggingService, maskTokenUrl } from './logging.service'

describe('LoggingService shipping switch', () => {
  let fetchSpy: jasmine.Spy
  let original: boolean

  beforeEach(() => {
    original = environment.sendLogsToServer
    fetchSpy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(null, { status: 202 })))
    spyOn(console, 'error')
  })

  afterEach(() => {
    environment.sendLogsToServer = original
  })

  it('sends no request when the switch is off', () => {
    environment.sendLogsToServer = false
    TestBed.inject(LoggingService).error('boom')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends one request to /api/v1/log when the switch is on', () => {
    environment.sendLogsToServer = true
    TestBed.inject(LoggingService).error('boom')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.calls.mostRecent().args[0])).toContain('/api/v1/log')
  })
})

describe('LoggingService URL masking (plan 555)', () => {
  const SEGMENT = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6'

  it('shows /book/x/r/<token> as /book/x/r/:token', () => {
    expect(maskTokenUrl(`/book/x/r/${SEGMENT}`)).toBe('/book/x/r/:token')
    expect(maskTokenUrl('/book/x')).toBe('/book/x')
  })

  it('masks the token of an API url in the event context', () => {
    const original = environment.sendLogsToServer
    environment.sendLogsToServer = true
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(null, { status: 202 })))
    spyOn(console, 'error')
    TestBed.inject(LoggingService).error('boom', { url: `/api/v1/public/x/requests/${SEGMENT}/cancel` })
    environment.sendLogsToServer = original
    const body = String(fetchSpy.calls.mostRecent().args[1]?.body)
    expect(body).toContain('/api/v1/public/x/requests/:token/cancel')
    expect(body).not.toContain(SEGMENT)
  })
})
