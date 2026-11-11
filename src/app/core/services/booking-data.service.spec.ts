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
