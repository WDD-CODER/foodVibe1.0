import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { BookingDataService } from './booking-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import type { Booking } from '../models/booking.model'

describe('BookingDataService', () => {
  let service: BookingDataService
  let http: HttpTestingController
  let logging: jasmine.SpyObj<LoggingService>

  const stored = { _id: 'b1', kind: 'table', status: 'confirmed' } as unknown as Booking

  beforeEach(() => {
    const storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    storageSpy.query.and.returnValue(Promise.resolve([]))
    logging = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storageSpy },
        { provide: LoggingService, useValue: logging }
      ]
    })
    service = TestBed.inject(BookingDataService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('setStatus puts the status to the bookings router and replaces the booking in the store', fakeAsync(() => {
    service['updateItems'](() => [stored])
    let result: unknown
    void service.setStatus('b1', 'seated').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/bookings/b1/status'))
    expect(req.request.body).toEqual({ status: 'seated' })
    req.flush({ ...stored, status: 'seated' })
    tick()
    expect(result).toEqual({ ok: true, booking: { ...stored, status: 'seated' } })
    expect(service.all_().map((b) => b.status)).toEqual(['seated'])
  }))

  it('a refused move returns the server code and leaves the store alone', fakeAsync(() => {
    service['updateItems'](() => [stored])
    let result: unknown
    void service.setStatus('b1', 'no_show').then((r) => (result = r))
    http
      .expectOne((r) => r.url.endsWith('/api/v1/bookings/b1/status'))
      .flush({ error: 'BAD_STATUS' }, { status: 409, statusText: 'Conflict' })
    tick()
    expect(result).toEqual({ ok: false, code: 'BAD_STATUS' })
    expect(service.all_()).toEqual([stored])
    expect(logging.warn).toHaveBeenCalled()
  }))

  it('day reads the day load from the bookings router and keeps the store alone', fakeAsync(() => {
    let result: unknown
    void service.day('2026-12-24').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/v1/bookings/day'))
    expect(req.request.params.get('date')).toBe('2026-12-24')
    req.flush({ bookings: [stored], coversByHour: { '19': 10 } })
    tick()
    expect(result).toEqual({ bookings: [stored], coversByHour: { '19': 10 } })
    expect(service.all_()).toEqual([])
  }))

  it('availability reads the slots of the day and keeps the store alone', fakeAsync(() => {
    let result: unknown
    void service.availability('2026-12-24', 4, 'inside').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/v1/bookings/availability'))
    expect(req.request.params.get('date')).toBe('2026-12-24')
    expect(req.request.params.get('partySize')).toBe('4')
    expect(req.request.params.get('area')).toBe('inside')
    req.flush({ slots: [{ time: '19:00', available: true }] })
    tick()
    expect(result).toEqual([{ time: '19:00', available: true }])
    expect(service.all_()).toEqual([])
  }))

  it('availability returns null on a failure', fakeAsync(() => {
    let result: unknown = 'unset'
    void service.availability('2026-12-24', 4).then((r) => (result = r))
    http
      .expectOne((r) => r.url.endsWith('/api/v1/bookings/availability'))
      .flush({ error: 'BAD_REQUEST_INPUT' }, { status: 400, statusText: 'Bad Request' })
    tick()
    expect(result).toBeNull()
  }))

  it('create posts the body and puts the new booking into the store', fakeAsync(() => {
    const input = { clientId: 'c1', date: '2026-12-24', time: '20:00', partySize: 2 }
    let result: unknown
    void service.create(input).then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/v1/bookings'))
    expect(req.request.body).toEqual(input)
    req.flush(stored)
    tick()
    expect(result).toEqual({ ok: true, booking: stored })
    expect(service.all_()).toEqual([stored])
  }))

  it('walkIn posts to /walk-in', fakeAsync(() => {
    const input = { partySize: 2, tableKeys: ['table01'] }
    void service.walkIn(input)
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/v1/bookings/walk-in'))
    expect(req.request.body).toEqual(input)
    req.flush(stored)
    tick()
    expect(service.all_()).toEqual([stored])
  }))

  it('setTables and setWhen put their bodies', fakeAsync(() => {
    void service.setTables('b1', ['table02'])
    const t = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/bookings/b1/tables'))
    expect(t.request.body).toEqual({ tableKeys: ['table02'] })
    t.flush(stored)
    tick()
    void service.setWhen('b1', { time: '21:00', partySize: 3 })
    const w = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/bookings/b1/when'))
    expect(w.request.body).toEqual({ time: '21:00', partySize: 3 })
    w.flush(stored)
    tick()
    expect(service.all_()).toEqual([stored])
  }))

  it('a 409 NO_TABLE returns the reason and alternatives and leaves the store alone', fakeAsync(() => {
    let result: unknown
    const alternatives = [{ date: '2026-12-24', time: '21:00' }]
    void service.create({ clientId: 'c1', date: '2026-12-24', time: '20:00', partySize: 2 }).then((r) => (result = r))
    http
      .expectOne((r) => r.url.endsWith('/api/v1/bookings'))
      .flush({ error: 'NO_TABLE', reason: 'full', alternatives }, { status: 409, statusText: 'Conflict' })
    tick()
    expect(result).toEqual({ ok: false, code: 'NO_TABLE', reason: 'full', alternatives })
    expect(service.all_()).toEqual([])
  }))

  it('day returns null when the server refuses the date', fakeAsync(() => {
    let result: unknown = 'unset'
    void service.day('24-12').then((r) => (result = r))
    http
      .expectOne((r) => r.url.endsWith('/api/v1/bookings/day'))
      .flush({ error: 'BAD_DATE' }, { status: 400, statusText: 'Bad Request' })
    tick()
    expect(result).toBeNull()
    expect(logging.warn).toHaveBeenCalled()
  }))

  it('addServerCreated adds a booking once', () => {
    service.addServerCreated(stored)
    service.addServerCreated(stored)
    expect(service.all_()).toEqual([stored])
  })
})
