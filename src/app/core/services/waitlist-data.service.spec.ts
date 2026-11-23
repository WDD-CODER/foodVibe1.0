import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { WaitlistDataService } from './waitlist-data.service'
import { LoggingService } from './logging.service'
import type { WaitlistEntry } from '../models/waitlist-entry.model'

describe('WaitlistDataService', () => {
  let service: WaitlistDataService
  let http: HttpTestingController
  let logging: jasmine.SpyObj<LoggingService>
  const entry = { _id: 'w1', status: 'waiting', partySize: 2 } as unknown as WaitlistEntry
  const refuse = { status: 409, statusText: 'Conflict' }

  beforeEach(() => {
    logging = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LoggingService, useValue: logging }]
    })
    service = TestBed.inject(WaitlistDataService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('list reads the date and returns the entries with the server clock', fakeAsync(() => {
    let result: unknown
    void service.list('2026-11-23').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/v1/waitlist'))
    expect(req.request.params.get('date')).toBe('2026-11-23')
    req.flush({ entries: [entry], now: 5 })
    tick()
    expect(result).toEqual({ ok: true, entries: [entry], now: 5 })
  }))

  it('add posts the input and returns the entry', fakeAsync(() => {
    let result: unknown
    const input = { date: '2026-11-23', guestName: 'Levi', guestPhone: '', partySize: 2 }
    void service.add(input).then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/v1/waitlist'))
    expect(req.request.body).toEqual(input)
    req.flush(entry, { status: 201, statusText: 'Created' })
    tick()
    expect(result).toEqual({ ok: true, entry })
  }))

  it("notify returns the answer's sent flag", fakeAsync(() => {
    let out: unknown
    void service.notify('w1').then((r) => (out = r))
    http.expectOne((r) => r.url.endsWith('/w1/notify')).flush({ ...entry, sent: true })
    tick()
    expect(out).toEqual({ ok: true, entry, sent: true })
    void service.notify('w1').then((r) => (out = r))
    http.expectOne((r) => r.url.endsWith('/w1/notify')).flush({ ...entry, sent: false })
    tick()
    expect(out).toEqual({ ok: true, entry, sent: false })
  }))

  it('notify, seat and left put to their routes', fakeAsync(() => {
    void service.notify('w1')
    http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/waitlist/w1/notify')).flush(entry)
    let seated: unknown
    void service.seat('w1', ['t1']).then((r) => (seated = r))
    const seat = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/waitlist/w1/seat'))
    expect(seat.request.body).toEqual({ tableKeys: ['t1'] })
    seat.flush(entry)
    void service.left('w1')
    http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/waitlist/w1/left')).flush(entry)
    tick()
    expect(seated).toEqual({ ok: true, entry })
  }))

  it('each error code comes back as a code and is logged without a name', fakeAsync(() => {
    const out: unknown[] = []
    void service.notify('w1').then((r) => out.push(r))
    http.expectOne((r) => r.url.endsWith('/w1/notify')).flush({ error: 'BAD_STATUS' }, refuse)
    void service.seat('w1', ['t1']).then((r) => out.push(r))
    http.expectOne((r) => r.url.endsWith('/w1/seat')).flush({ error: 'NO_TABLE' }, refuse)
    void service.left('w1').then((r) => out.push(r))
    http.expectOne((r) => r.url.endsWith('/w1/left')).flush({ error: 'STATUS_CHANGED' }, refuse)
    void service.list('2026-11-23').then((r) => out.push(r))
    http.expectOne((r) => r.method === 'GET').flush({ error: 'BAD_DATE' }, { status: 400, statusText: 'Bad' })
    tick()
    expect(out).toEqual([
      { ok: false, code: 'BAD_STATUS' },
      { ok: false, code: 'NO_TABLE' },
      { ok: false, code: 'STATUS_CHANGED' },
      { ok: false, code: 'BAD_DATE' }
    ])
    expect(logging.warn).toHaveBeenCalledTimes(4)
  }))

  it('a server failure returns a null code and logs an error', fakeAsync(() => {
    let result: unknown
    void service.add({ date: 'd', guestName: 'x', guestPhone: '', partySize: 1 }).then((r) => (result = r))
    http.expectOne((r) => r.method === 'POST').flush('boom', { status: 500, statusText: 'Server Error' })
    tick()
    expect(result).toEqual({ ok: false, code: null })
    expect(logging.error).toHaveBeenCalled()
  }))
})
