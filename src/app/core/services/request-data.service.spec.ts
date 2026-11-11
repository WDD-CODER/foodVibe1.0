import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { RequestDataService } from './request-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { BookingDataService } from './booking-data.service'
import type { Booking } from '../models/booking.model'
import type { FrontDeskRequest } from '../models/request.model'

describe('RequestDataService', () => {
  let service: RequestDataService
  let http: HttpTestingController
  let logging: jasmine.SpyObj<LoggingService>

  const stored = {
    _id: 'r1',
    kind: 'table',
    status: 'qualified',
    wanted: {},
    answers: []
  } as unknown as FrontDeskRequest

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
    service = TestBed.inject(RequestDataService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('createManual posts to the requests router and puts the stored request into the store', fakeAsync(() => {
    let result: unknown
    void service
      .createManual({ kind: 'table', guestName: 'דנה', guestPhone: '0521234567', wanted: {}, answers: [] })
      .then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/v1/requests'))
    expect(req.request.body.guestPhone).toBe('0521234567')
    req.flush(stored)
    tick()
    expect(result).toEqual({ ok: true, request: stored })
    expect(service.all_().map((r) => r._id)).toEqual(['r1'])
  }))

  it('setStatus puts the status (and the note) and replaces the request in the store', fakeAsync(() => {
    service['updateItems'](() => [stored])
    let result: unknown
    void service.setStatus('r1', 'cancelled', 'לא רלוונטי').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/requests/r1/status'))
    expect(req.request.body).toEqual({ status: 'cancelled', note: 'לא רלוונטי' })
    req.flush({ ...stored, status: 'cancelled' })
    tick()
    expect(result).toEqual({ ok: true, request: { ...stored, status: 'cancelled' } })
    expect(service.all_()).toEqual([{ ...stored, status: 'cancelled' } as FrontDeskRequest])
  }))

  it('updateWanted puts wanted without answers when none are given', fakeAsync(() => {
    void service.updateWanted('r1', { partySize: 3 })
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/requests/r1/wanted'))
    expect(req.request.body).toEqual({ wanted: { partySize: 3 } })
    req.flush(stored)
    tick()
  }))

  it('a refused call returns the server code, leaves the store alone and logs a warning', fakeAsync(() => {
    let result: unknown
    void service.setStatus('r1', 'approved').then((r) => (result = r))
    http
      .expectOne((r) => r.url.endsWith('/api/v1/requests/r1/status'))
      .flush({ error: 'BAD_STATUS' }, { status: 409, statusText: 'Conflict' })
    tick()
    expect(result).toEqual({ ok: false, code: 'BAD_STATUS' })
    expect(service.all_()).toEqual([])
    expect(logging.warn).toHaveBeenCalled()
    expect(logging.error).not.toHaveBeenCalled()
  }))

  it('approve posts, stores the approved request and puts the new booking into the booking store', fakeAsync(() => {
    service['updateItems'](() => [stored])
    const booking = { _id: 'b1', kind: 'table', status: 'confirmed' } as unknown as Booking
    const approved = {
      ...stored,
      status: 'approved',
      outcome: { type: 'booking', id: 'b1' }
    } as unknown as FrontDeskRequest
    let result: unknown
    void service.approve('r1', { partySize: 5 }, 'ok').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/v1/requests/r1/approve'))
    expect(req.request.body).toEqual({ wanted: { partySize: 5 }, note: 'ok' })
    req.flush({ request: approved, outcome: booking })
    tick()
    expect(result).toEqual({ ok: true, request: approved, outcome: booking })
    expect(service.all_()[0].status).toBe('approved')
    expect(TestBed.inject(BookingDataService).all_()).toEqual([booking])
  }))

  it('a second approve returns ALREADY_DECIDED and leaves the store alone', fakeAsync(() => {
    service['updateItems'](() => [stored])
    let result: unknown
    void service.approve('r1').then((r) => (result = r))
    http
      .expectOne((r) => r.url.endsWith('/api/v1/requests/r1/approve'))
      .flush({ error: 'ALREADY_DECIDED' }, { status: 409, statusText: 'Conflict' })
    tick()
    expect(result).toEqual({ ok: false, code: 'ALREADY_DECIDED' })
    expect(service.all_()).toEqual([stored])
  }))

  it('decline posts the reason and text and replaces the request in the store', fakeAsync(() => {
    service['updateItems'](() => [stored])
    let result: unknown
    void service.decline('r1', 'date_taken', 'x').then((r) => (result = r))
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/v1/requests/r1/decline'))
    expect(req.request.body).toEqual({ reason: 'date_taken', text: 'x' })
    req.flush({ ...stored, status: 'declined' })
    tick()
    expect(result).toEqual({ ok: true, request: { ...stored, status: 'declined' } })
    expect(service.all_()[0].status).toBe('declined')
  }))
})
