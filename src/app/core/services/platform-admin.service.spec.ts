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
