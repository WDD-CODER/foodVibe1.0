import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import type { ModuleKey } from '@schemas/modules'
import { HttpStorageAdapter } from './http-storage.adapter'
import { ModuleService } from './module.service'
import { environment } from '../../../environments/environment'

describe('HttpStorageAdapter module gate (plan 620)', () => {
  let adapter: HttpStorageAdapter
  let http: HttpTestingController
  let on: ModuleKey[]

  beforeEach(() => {
    on = ['events']
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ModuleService,
          useValue: {
            ready: () => Promise.resolve(),
            hasType: (type: string) =>
              type === 'requests'
                ? on.includes('frontdesk')
                : type === 'clients'
                  ? on.some((k) => k === 'events' || k === 'frontdesk')
                  : true
          }
        }
      ]
    })
    adapter = TestBed.inject(HttpStorageAdapter)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('query(requests) with frontdesk off returns [] and sends no request', async () => {
    expect(await adapter.query('requests')).toEqual([])
    expect(await adapter.count('requests')).toBe(0)
    expect(await adapter.trash('requests')).toEqual([])
    expect(await adapter.search('requests', 'x')).toEqual([])
    expect(await adapter.queryFiltered('requests', 'a', 'b')).toEqual([])
    await adapter.restoreAll('requests')
    await adapter.emptyTrash('requests')
    http.expectNone(() => true)
  })

  it('query(clients) sends a request when only events is on', async () => {
    const p = adapter.query('clients')
    await Promise.resolve()
    await Promise.resolve()
    http.expectOne(`${environment.apiUrl}/api/v1/data/clients`).flush([{ _id: 'c1' }])
    expect(await p).toEqual([{ _id: 'c1' }])
  })

  it('query(products) always sends one', async () => {
    on = []
    const p = adapter.query('products')
    await Promise.resolve()
    http.expectOne(`${environment.apiUrl}/api/v1/data/products`).flush([])
    expect(await p).toEqual([])
  })
})
