import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { environment } from '../../../../environments/environment'
import { MonthPlanService } from './month-plan.service'

describe('MonthPlanService (plan 727)', () => {
  let service: MonthPlanService
  let http: HttpTestingController
  const base = `${environment.apiUrl}/api/v1/month-plans`

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(MonthPlanService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('list reads the month route and unwraps the months', async () => {
    const p = service.list()
    const req = http.expectOne(base)
    expect(req.request.method).toBe('GET')
    req.flush({ months: [{ month: '2026-11' }, { month: '2026-10' }] })
    expect((await p).map((m) => m.month)).toEqual(['2026-11', '2026-10'])
  })

  it('get reads one month', async () => {
    const p = service.get('2026-11')
    http.expectOne(`${base}/2026-11`).flush({ month: '2026-11' })
    expect((await p).month).toBe('2026-11')
  })

  it('create posts the month key', async () => {
    const p = service.create('2026-11')
    const req = http.expectOne(base)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ month: '2026-11' })
    req.flush({ month: '2026-11' })
    expect((await p).month).toBe('2026-11')
  })

  it('update puts only the given fields and keeps null and 0 apart', async () => {
    const p = service.update('2026-11', { revenue: { actual: 0, plan: null }, targets: { profitPct: 8 } })
    const req = http.expectOne(`${base}/2026-11`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual({ revenue: { actual: 0, plan: null }, targets: { profitPct: 8 } })
    req.flush({ month: '2026-11' })
    await p
  })

  it('throws the HttpErrorResponse on a refusal', async () => {
    const p = service.create('2026-11')
    http.expectOne(base).flush({ error: 'MONTH_EXISTS' }, { status: 409, statusText: 'Conflict' })
    await expectAsync(p).toBeRejectedWith(jasmine.objectContaining({ status: 409 }))
  })
})
