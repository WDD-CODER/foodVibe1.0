import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { environment } from '../../../../environments/environment'
import { DiagnosisService } from './diagnosis.service'

describe('DiagnosisService', () => {
  let service: DiagnosisService
  let http: HttpTestingController
  const base = environment.apiUrl

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(DiagnosisService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('list reads the generic data route and sorts newest first', async () => {
    const p = service.list()
    http.expectOne(`${base}/api/v1/data/diagnoses`).flush([
      { _id: 'a', createdAt: 1 },
      { _id: 'b', createdAt: 5 }
    ])
    expect((await p).map((d) => d._id)).toEqual(['b', 'a'])
  })

  it('create posts name and period', async () => {
    const p = service.create({ name: 'N', periodDays: 90 })
    const req = http.expectOne(`${base}/api/v1/diag`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ name: 'N', periodDays: 90 })
    req.flush({ _id: 'd1' })
    expect((await p)._id).toBe('d1')
  })

  it('loadData, saveMenu, saveInvoices and setStatus use their routes', async () => {
    const a = service.loadData('d1')
    http.expectOne(`${base}/api/v1/diag/d1/data`).flush({ diagnosis: {}, volatility: [] })
    await a
    const b = service.saveMenu('d1', { menu: [], draftId: 'dr', pricesIncludeVat: true, vatPct: 18 })
    const menuReq = http.expectOne(`${base}/api/v1/diag/d1/menu`)
    expect(menuReq.request.method).toBe('PUT')
    expect(menuReq.request.body).toEqual({ menu: [], draftId: 'dr', pricesIncludeVat: true, vatPct: 18 })
    menuReq.flush({})
    await b
    const c = service.saveInvoices('d1', ['i1'])
    const invReq = http.expectOne(`${base}/api/v1/diag/d1/invoices`)
    expect(invReq.request.body).toEqual({ invoiceIds: ['i1'] })
    invReq.flush({})
    await c
    const d = service.setStatus('d1', 'done')
    const statusReq = http.expectOne(`${base}/api/v1/diag/d1/status`)
    expect(statusReq.request.body).toEqual({ status: 'done' })
    statusReq.flush({})
    await d
  })

  it('readMenu posts the text to the AI route', async () => {
    const p = service.readMenu('pasta 40')
    const req = http.expectOne(`${base}/api/v1/ai/diag/menu`)
    expect(req.request.body).toEqual({ text: 'pasta 40' })
    req.flush({ items: [{ name: 'pasta', sellPrice: 40 }], draftId: 'dr' })
    expect((await p).draftId).toBe('dr')
  })

  it('a refusal throws', async () => {
    const p = service.saveInvoices('d1', [])
    http.expectOne(`${base}/api/v1/diag/d1/invoices`).flush({ error: 'X' }, { status: 409, statusText: 'Conflict' })
    await expectAsync(p).toBeRejected()
  })
})
