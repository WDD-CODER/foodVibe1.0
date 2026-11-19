import { fakeAsync, TestBed, tick, discardPeriodicTasks } from '@angular/core/testing'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { LoggingService } from './logging.service'
import { NotificationsService, type AlertRow } from './notifications.service'

const row = (id: string, readAt?: number): AlertRow => ({
  _id: id,
  businessId: 'b1',
  userId: 'u1',
  kind: 'price_change',
  productId: 'p1',
  productName: 'לחם',
  supplierName: 'ספק',
  from: 10,
  to: 11,
  changePct: 10,
  createdAt: 1,
  businessName: 'עסק',
  ...(readAt ? { readAt } : {})
})

describe('NotificationsService (plan 646)', () => {
  let service: NotificationsService
  let http: HttpTestingController
  const flush = (rows: AlertRow[]) =>
    http.expectOne((r) => r.url.endsWith('/api/v1/notifications?limit=50')).flush({ rows, unread: 0 })

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: LoggingService, useValue: { warn: () => {} } }]
    })
    service = TestBed.inject(NotificationsService)
    http = TestBed.inject(HttpTestingController)
  })

  it('counts the unread alerts from the loaded rows', async () => {
    const done = service.load()
    flush([row('a'), row('b', 5)])
    await done
    expect(service.rows_().length).toBe(2)
    expect(service.unread_()).toBe(1)
  })

  it('markRead updates the list at once and posts the id', async () => {
    const loaded = service.load()
    flush([row('a'), row('b')])
    await loaded
    const done = service.markRead('a')
    expect(service.unread_()).toBe(1)
    http.expectOne((r) => r.url.endsWith('/api/v1/notifications/a/read') && r.method === 'POST').flush({ ok: true })
    await done
  })

  it('markAllRead clears the count and posts read-all', async () => {
    const loaded = service.load()
    flush([row('a'), row('b')])
    await loaded
    const done = service.markAllRead()
    expect(service.unread_()).toBe(0)
    http.expectOne((r) => r.url.endsWith('/api/v1/notifications/read-all') && r.method === 'POST').flush({ marked: 2 })
    await done
  })

  it('polls every 60 s and asks nothing while the tab is hidden', fakeAsync(() => {
    let hidden = false
    spyOnProperty(document, 'visibilityState', 'get').and.callFake(() => (hidden ? 'hidden' : 'visible'))
    service.startPolling()
    flush([])
    tick(60_000)
    flush([])
    hidden = true
    tick(60_000)
    http.expectNone((r) => r.url.includes('/api/v1/notifications'))
    service.stopPolling()
    tick(120_000)
    http.expectNone((r) => r.url.includes('/api/v1/notifications'))
    discardPeriodicTasks()
  }))
})
