import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { FloorPlanDataService } from './floor-plan-data.service'
import { LoggingService } from './logging.service'
import type { FloorPlan, FloorPlanBody } from '../models/floor-plan.model'

describe('FloorPlanDataService', () => {
  let service: FloorPlanDataService
  let http: HttpTestingController
  let logging: jasmine.SpyObj<LoggingService>

  const plan = {
    _id: 'p1',
    businessId: 'b1',
    grid: { cols: 24, rows: 16 },
    areas: [],
    tables: [],
    joins: []
  } as unknown as FloorPlan
  const body = { grid: plan.grid, areas: plan.areas, tables: plan.tables, joins: plan.joins } as FloorPlanBody
  const isRoute = (method: string) => (r: { method: string; url: string }) =>
    r.method === method && r.url.endsWith('/api/v1/floor-plan')

  beforeEach(() => {
    logging = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LoggingService, useValue: logging }]
    })
    service = TestBed.inject(FloorPlanDataService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('load puts the server plan into plan_ and null for { plan: null }', async () => {
    let p = service.load()
    http.expectOne(isRoute('GET')).flush({ plan })
    await p
    expect(service.plan_()).toEqual(plan)
    expect(service.isLoaded_()).toBeTrue()
    p = service.load()
    http.expectOne(isRoute('GET')).flush({ plan: null })
    await p
    expect(service.plan_()).toBeNull()
  })

  it('ensureLoaded loads once', async () => {
    const a = service.ensureLoaded()
    const b = service.ensureLoaded()
    http.expectOne(isRoute('GET')).flush({ plan })
    await Promise.all([a, b])
    await service.ensureLoaded()
    expect(service.plan_()).toEqual(plan)
  })

  it('a failed load sets loadFailed_ and logs the status only', async () => {
    const p = service.load()
    http.expectOne(isRoute('GET')).flush({ error: 'x' }, { status: 500, statusText: 'err' })
    await p
    expect(service.loadFailed_()).toBeTrue()
    expect(logging.error).toHaveBeenCalledWith(
      jasmine.objectContaining({ event: 'floor_plan.load_failed', context: { status: '500' } })
    )
  })

  it('save puts the stored plan into plan_', async () => {
    const p = service.save(body)
    const req = http.expectOne(isRoute('PUT'))
    expect(req.request.body).toEqual(body)
    req.flush({ plan })
    expect(await p).toEqual({ ok: true, plan })
    expect(service.plan_()).toEqual(plan)
  })

  it('a 400 and a 409 return the refusal and leave plan_ alone', async () => {
    let p = service.save(body)
    http
      .expectOne(isRoute('PUT'))
      .flush(
        { error: 'BAD_FLOOR_PLAN', issues: [{ code: 'duplicate_key', key: 'tblaaa01' }] },
        { status: 400, statusText: 'bad' }
      )
    expect(await p).toEqual({ ok: false, code: 'BAD_FLOOR_PLAN', issues: [{ code: 'duplicate_key', key: 'tblaaa01' }] })
    const bookings = [{ _id: 'bk1', date: '2026-12-01', time: '19:00', partySize: 4, tableKeys: ['tblaaa01'] }]
    p = service.save(body)
    http.expectOne(isRoute('PUT')).flush({ error: 'TABLE_IN_USE', bookings }, { status: 409, statusText: 'conflict' })
    expect(await p).toEqual({ ok: false, code: 'TABLE_IN_USE', bookings })
    expect(service.plan_()).toBeNull()
  })
})
