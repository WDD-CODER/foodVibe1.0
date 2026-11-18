import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import type { ModuleKey } from '@schemas/modules-pure'
import { HttpStorageAdapter } from './http-storage.adapter'
import { ModuleService } from './module.service'
import { MODULE_OF_TYPE } from '@schemas/modules-pure'

describe('HttpStorageAdapter module gate (plan 620)', () => {
  const on = signal<ModuleKey[]>(['events'])
  let adapter: HttpStorageAdapter
  let http: HttpTestingController

  beforeEach(() => {
    on.set(['events'])
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ModuleService,
          useValue: {
            ready: () => Promise.resolve(),
            hasType: (type: string) => {
              const keys = MODULE_OF_TYPE[type]
              return keys ? keys.some((k) => on().includes(k)) : true
            }
          }
        }
      ]
    })
    adapter = TestBed.inject(HttpStorageAdapter)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('query("requests") with frontdesk off returns [] and sends no request', async () => {
    expect(await adapter.query('requests')).toEqual([])
    expect(await adapter.count('bookings')).toBe(0)
    expect(await adapter.trash('requests')).toEqual([])
    await adapter.restoreAll('requests')
    await adapter.emptyTrash('requests')
    http.expectNone(() => true)
  })

  it('query("clients") sends a request when only events is on', async () => {
    const pending = adapter.query('clients')
    await new Promise((r) => setTimeout(r))
    http.expectOne((req) => req.url.endsWith('/data/clients')).flush([{ _id: 'c1' }])
    expect(await pending).toEqual([{ _id: 'c1' }])
  })

  it('query("products") always sends one', async () => {
    on.set([])
    const pending = adapter.query('products')
    await new Promise((r) => setTimeout(r))
    http.expectOne((req) => req.url.endsWith('/data/products')).flush([])
    expect(await pending).toEqual([])
  })
})
