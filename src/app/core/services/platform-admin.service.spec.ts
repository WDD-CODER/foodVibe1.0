import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { PlatformAdminService, type AdminTermRow } from './platform-admin.service'

describe('PlatformAdminService.loadTerms', () => {
  it('GETs the admin taxonomy for the kind and fills termRows_', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlatformAdminService)
    const http = TestBed.inject(HttpTestingController)
    const rows: AdminTermRow[] = [
      {
        id: 't1',
        businessId: 'bA',
        businessName: 'A',
        key: 'k',
        phase: 'site_visit',
        section: 'space',
        answerType: 'status',
        environments: null,
        hint: null,
        createdAt: 1
      }
    ]
    const done = service.loadTerms('logisticsItem')
    const req = http.expectOne((r) => r.url.endsWith('/admin/taxonomy') && r.params.get('kind') === 'logisticsItem')
    req.flush({ rows })
    await done
    expect(service.termRows_()).toEqual(rows)
    http.verify()
  })
})

describe('PlatformAdminService learning reads (plan 630)', () => {
  it('GETs the learning stats with the days', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlatformAdminService)
    const http = TestBed.inject(HttpTestingController)
    const body = {
      days: 90,
      from: 'a',
      to: 'b',
      flows: [],
      brain: { suppliers: 1, names: 2, businesses: 3 },
      privateBusinesses: 0,
      truncated: false
    }
    const done = service.getLearningStats()
    const req = http.expectOne((r) => r.url.endsWith('/admin/learning/stats') && r.params.get('days') === '90')
    req.flush(body)
    expect(await done).toEqual(body)
    http.verify()
  })

  it('GETs the file store status', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlatformAdminService)
    const http = TestBed.inject(HttpTestingController)
    const done = service.getLearningStatus()
    http.expectOne((r) => r.url.endsWith('/admin/learning/status')).flush({ fileStore: false })
    expect(await done).toEqual({ fileStore: false })
    http.verify()
  })
})

describe('PlatformAdminService.getPlatformHistory (plan 638)', () => {
  it('GETs the history of the business and returns the unwrapped rows', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlatformAdminService)
    const http = TestBed.inject(HttpTestingController)
    const rows = [{ at: 1, by: 'u', byName: 'N', reason: 'because', changed: ['modules'] }]
    const done = service.getPlatformHistory('b1')
    http.expectOne((r) => r.url.endsWith('/admin/businesses/b1/platform-history')).flush({ rows })
    expect(await done).toEqual(rows)
    http.verify()
  })
})
