import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ProductImportService, type ApplyInvoice } from './product-import.service'
import { ProductDataService } from './product-data.service'
import { environment } from '../../../environments/environment'

describe('ProductImportService', () => {
  const BASE = `${environment.authApiUrl}/api/v1/product-import`
  let service: ProductImportService
  let http: HttpTestingController
  let reload: jasmine.Spy

  beforeEach(() => {
    reload = jasmine.createSpy('reloadFromStorage').and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductDataService, useValue: { reloadFromStorage: reload } }
      ]
    })
    service = TestBed.inject(ProductImportService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('resolve posts the supplier key and the names and returns the matches', async () => {
    const result = service.resolve('tax:123456789', ['חלב', 'גבינה'])
    const req = http.expectOne(`${BASE}/resolve`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ supplierKey: 'tax:123456789', names: ['חלב', 'גבינה'] })
    req.flush({ matches: [{ i: 0, productId: 'p1', source: 'own' }] })
    expect(await result).toEqual([{ i: 0, productId: 'p1', source: 'own' }])
  })

  it('getPriceRises asks for the last 60 days by default and returns the rows', async () => {
    const result = service.getPriceRises()
    const req = http.expectOne((r) => r.url === `${BASE}/price-rises`)
    expect(req.request.method).toBe('GET')
    expect(req.request.params.get('days')).toBe('60')
    const rows = [{ productId: 'p1', supplierId: '', from: 5, to: 5.3, changePct: 6, at: 1 }]
    req.flush(rows)
    expect(await result).toEqual(rows)
  })

  it('resolve rejects on an HTTP error', async () => {
    const result = service.resolve('name:x', ['a'])
    http.expectOne(`${BASE}/resolve`).flush({ error: 'x' }, { status: 500, statusText: 'Server Error' })
    await expectAsync(result).toBeRejected()
  })

  it('apply without an invoice sends only supplierId and rows, then reloads the products', async () => {
    const result = service.apply('s1', [])
    const req = http.expectOne(`${BASE}/apply`)
    expect(req.request.body).toEqual({ supplierId: 's1', rows: [] })
    req.flush({ created: 0, updated: 0, skipped: 0, skippedRows: [] })
    await result
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('apply with an invoice sends it and returns the invoice id', async () => {
    const invoice: ApplyInvoice = {
      supplierName: 'ספק',
      source: 'pdf',
      lines: [{ printedName: 'חלב', needsReview: false, row: 0 }]
    }
    const result = service.apply('s1', [], invoice)
    const req = http.expectOne(`${BASE}/apply`)
    expect(req.request.body).toEqual({ supplierId: 's1', rows: [], invoice })
    req.flush({ created: 1, updated: 0, skipped: 0, skippedRows: [], invoiceId: 'inv1' })
    expect((await result).invoiceId).toBe('inv1')
  })
})
