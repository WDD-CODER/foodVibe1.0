import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { LoggingService } from '@services/logging.service'
import { SimulatorService } from './simulator.service'

describe('SimulatorService (plan 678)', () => {
  let service: SimulatorService
  let http: HttpTestingController
  const logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error'])

  beforeEach(() => {
    logging.warn.calls.reset()
    logging.error.calls.reset()
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LoggingService, useValue: logging }]
    })
    service = TestBed.inject(SimulatorService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('send posts { phone, name, text } and returns the conversation id', async () => {
    const p = service.send('0500000001', 'אורח בדיקה', 'שלום')
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/sim/inbound'))
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ phone: '0500000001', name: 'אורח בדיקה', text: 'שלום' })
    req.flush({ conversationId: 'c1', messageId: 'm1' })
    expect(await p).toEqual({ ok: true, conversationId: 'c1' })
  })

  it('tap posts { phone, buttonId }', async () => {
    const p = service.tap('0500000001', 'CANCEL:b1')
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/sim/inbound'))
    expect(req.request.body).toEqual({ phone: '0500000001', buttonId: 'CANCEL:b1' })
    req.flush({ conversationId: 'c1', messageId: 'm2' })
    expect((await p).ok).toBeTrue()
  })

  it('runJob posts the clock body and returns done and reason', async () => {
    const p = service.runJob('c1', 'reminder')
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/sim/clock'))
    expect(req.request.body).toEqual({ conversationId: 'c1', job: 'reminder' })
    req.flush({ job: 'reminder', done: false, reason: 'NO_BOOKING' })
    expect(await p).toEqual({ ok: true, job: 'reminder', done: false, reason: 'NO_BOOKING' })
    const q = service.runJob('c1', 'late')
    http.expectOne((r) => r.url.endsWith('/api/v1/sim/clock')).flush({ job: 'late', done: true })
    expect(await q).toEqual({ ok: true, job: 'late', done: true, reason: undefined })
  })

  it('clearTestData sends the DELETE', async () => {
    const p = service.clearTestData()
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/sim/test-data'))
    expect(req.request.method).toBe('DELETE')
    req.flush({ clients: 1 })
    expect(await p).toEqual({ ok: true })
  })

  it('a 409 REAL_CLIENT, a 400 BAD_INPUT and a 4xx of the clock come back as codes', async () => {
    const a = service.send('0500000001', 'x', 'y')
    http
      .expectOne((r) => r.url.endsWith('/sim/inbound'))
      .flush({ error: 'REAL_CLIENT' }, { status: 409, statusText: 'Conflict' })
    expect(await a).toEqual({ ok: false, code: 'REAL_CLIENT' })
    const b = service.send('0500000001', 'x', 'y')
    http
      .expectOne((r) => r.url.endsWith('/sim/inbound'))
      .flush({ error: 'BAD_INPUT' }, { status: 400, statusText: 'x' })
    expect(await b).toEqual({ ok: false, code: 'BAD_INPUT' })
    const c = service.runJob('c1', 'late')
    http.expectOne((r) => r.url.endsWith('/sim/clock')).flush({ error: 'NOT_TEST' }, { status: 409, statusText: 'x' })
    expect(await c).toEqual({ ok: false, code: 'NOT_TEST' })
  })

  it('no log line holds the phone, the name or the text', async () => {
    const a = service.send('0500000001', 'אורח בדיקה', 'שלום סודי')
    http
      .expectOne((r) => r.url.endsWith('/sim/inbound'))
      .flush({ error: 'REAL_CLIENT' }, { status: 409, statusText: 'x' })
    await a
    const b = service.send('0500000001', 'אורח בדיקה', 'שלום סודי')
    http.expectOne((r) => r.url.endsWith('/sim/inbound')).flush({}, { status: 500, statusText: 'x' })
    await b
    const logged = JSON.stringify([...logging.warn.calls.allArgs(), ...logging.error.calls.allArgs()])
    expect(logging.warn).toHaveBeenCalledTimes(1)
    expect(logging.error).toHaveBeenCalledTimes(1)
    for (const secret of ['0500000001', 'אורח בדיקה', 'שלום סודי']) expect(logged).not.toContain(secret)
  })
})
