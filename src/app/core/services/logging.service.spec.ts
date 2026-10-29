import { TestBed } from '@angular/core/testing'
import { environment } from '../../../environments/environment'
import { LoggingService } from './logging.service'

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
