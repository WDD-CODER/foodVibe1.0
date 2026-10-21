import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import type { BusinessStats } from '@models/business-stats.model'
import { BusinessStatsService } from './business-stats.service'

describe('BusinessStatsService', () => {
  let service: BusinessStatsService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(BusinessStatsService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('asks the server for the chosen period and returns the answer as is', async () => {
    const stats: BusinessStats = { period: '90', periodDays: 90, hasBaseline: false, funnel: [], upcoming: [] }
    const result = service.get('90')
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/stats/business'))
    expect(req.request.method).toBe('GET')
    expect(req.request.params.get('period')).toBe('90')
    req.flush(stats)
    expect(await result).toEqual(stats)
  })

  it('passes a server error on to the caller', async () => {
    const result = service.get('all')
    http
      .expectOne((r) => r.url.endsWith('/api/v1/stats/business'))
      .flush({ error: 'x' }, { status: 500, statusText: 'err' })
    await expectAsync(result).toBeRejected()
  })
})
