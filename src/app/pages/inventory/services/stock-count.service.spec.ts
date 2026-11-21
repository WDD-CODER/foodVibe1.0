import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { PermissionService } from '@services/permission.service'
import { UserService } from '@services/user.service'
import { StockCountService } from './stock-count.service'

describe('StockCountService', () => {
  let service: StockCountService
  let http: HttpTestingController
  const owner = signal(true)

  beforeEach(() => {
    owner.set(true)
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PermissionService, useValue: { isOwner_: owner } },
        { provide: UserService, useValue: { user_: signal({ _id: 'u1' }) } }
      ]
    })
    service = TestBed.inject(StockCountService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  const draft = (id: string, createdBy: string, updatedAt: number) => ({ _id: id, createdBy, updatedAt, lines: [] })

  it('posts a new draft and puts an existing one', async () => {
    const input = { countedAt: 1, source: 'manual' as const, lines: [] }
    const first = service.saveDraft(input)
    const post = http.expectOne((r) => r.url.endsWith('/api/v1/stock/counts'))
    expect(post.request.method).toBe('POST')
    post.flush({ _id: 'c1' })
    await first
    const second = service.saveDraft(input, 'c1')
    const put = http.expectOne((r) => r.url.endsWith('/api/v1/stock/counts/c1'))
    expect(put.request.method).toBe('PUT')
    put.flush({ _id: 'c1' })
    await second
  })

  it('finalizes through the finalize route', async () => {
    const p = service.finalize('c1')
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/stock/counts/c1/finalize'))
    expect(req.request.method).toBe('POST')
    req.flush({ _id: 'c1' })
    await p
  })

  it('reads on-hand', async () => {
    const p = service.loadOnHand()
    http
      .expectOne((r) => r.url.endsWith('/api/v1/stock/on-hand'))
      .flush([{ productId: 'a', baseQuantity: 1, countedAt: 1 }])
    expect((await p).length).toBe(1)
  })

  it('opens the newest draft for the owner, whoever made it', async () => {
    const p = service.loadOpenDraft()
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/stock/counts'))
    expect(req.request.params.get('status')).toBe('draft')
    expect(req.request.params.get('limit')).toBe('20')
    req.flush([draft('a', 'u2', 5), draft('b', 'u3', 9), draft('c', 'u1', 7)])
    expect((await p)?._id).toBe('b')
  })

  it('opens only the staff member own draft', async () => {
    owner.set(false)
    const p = service.loadOpenDraft()
    http.expectOne((r) => r.url.endsWith('/api/v1/stock/counts')).flush([draft('b', 'u3', 9), draft('c', 'u1', 7)])
    expect((await p)?._id).toBe('c')
  })

  it('returns null when there is no draft to edit', async () => {
    owner.set(false)
    const p = service.loadOpenDraft()
    http.expectOne((r) => r.url.endsWith('/api/v1/stock/counts')).flush([draft('b', 'u3', 9)])
    expect(await p).toBeNull()
  })
})
