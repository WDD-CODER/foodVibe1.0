import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { Bell, LucideAngularModule } from 'lucide-angular'
import { NotificationsService, type AlertRow } from '@services/notifications.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { NotificationBellComponent } from './notification-bell.component'

const row = (id: string, extra: Partial<AlertRow> = {}): AlertRow => ({
  _id: id,
  businessId: 'b1',
  userId: 'u1',
  kind: 'price_change',
  productId: 'p-' + id,
  productName: 'לחם',
  supplierName: 'ספק א',
  from: 100,
  to: 106,
  changePct: 6,
  createdAt: 1,
  businessName: 'העסק של לקוח',
  ...extra
})

describe('NotificationBellComponent (plan 646)', () => {
  let fixture: ComponentFixture<NotificationBellComponent>
  let el: HTMLElement
  const rows = signal<AlertRow[]>([])
  const unread = signal(0)
  let markRead: jasmine.Spy
  let markAllRead: jasmine.Spy
  let start: jasmine.Spy
  let stop: jasmine.Spy
  let navigate: jasmine.Spy
  let switchBusiness: jasmine.Spy

  const open = () => {
    el.querySelector<HTMLButtonElement>('[data-testid="notification-bell"]')!.click()
    fixture.detectChanges()
  }

  beforeEach(() => {
    rows.set([])
    unread.set(0)
    markRead = jasmine.createSpy('markRead').and.resolveTo()
    markAllRead = jasmine.createSpy('markAllRead').and.resolveTo()
    start = jasmine.createSpy('startPolling')
    stop = jasmine.createSpy('stopPolling')
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    switchBusiness = jasmine.createSpy('switchBusiness').and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [NotificationBellComponent, LucideAngularModule.pick({ Bell })],
      providers: [
        {
          provide: NotificationsService,
          useValue: { rows_: rows, unread_: unread, markRead, markAllRead, startPolling: start, stopPolling: stop }
        },
        {
          provide: TranslationService,
          useValue: {
            translate: (k: string | undefined) =>
              k === 'alert_price_change' ? '{product}: {from} ← {to} ({pct}) אצל {supplier}' : (k ?? '')
          }
        },
        {
          provide: UserService,
          useValue: {
            user_: signal({ _id: 'u1', businessId: 'b1' }),
            homeBusinessId_: signal('b_home'),
            switchBusiness
          }
        },
        { provide: Router, useValue: { navigate } }
      ]
    })
    fixture = TestBed.createComponent(NotificationBellComponent)
    el = fixture.nativeElement
    fixture.detectChanges()
  })

  it('starts polling on init and stops on destroy', () => {
    expect(start).toHaveBeenCalledTimes(1)
    fixture.destroy()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('shows the unread count above 0 and hides it at 0', () => {
    expect(el.querySelector('[data-testid="notification-count"]')).toBeNull()
    unread.set(3)
    fixture.detectChanges()
    expect(el.querySelector('[data-testid="notification-count"]')?.textContent?.trim()).toBe('3')
  })

  it('lists the alerts with the dictionary text; no business name for the current business', () => {
    rows.set([row('a')])
    unread.set(1)
    fixture.detectChanges()
    open()
    expect(el.querySelector('[data-testid="notification-item"]')?.textContent).toContain(
      'לחם: ₪100.00 ← ₪106.00 (+6.0%) אצל ספק א'
    )
    expect(el.querySelector('[data-testid="notification-business"]')).toBeNull()
  })

  it('shows the business name for an alert of another business', () => {
    rows.set([row('a', { businessId: 'b2' })])
    fixture.detectChanges()
    open()
    expect(el.querySelector('[data-testid="notification-business"]')?.textContent).toContain('העסק של לקוח')
  })

  it('shows the empty text with no alerts', () => {
    open()
    expect(el.querySelector('[data-testid="notification-empty"]')).toBeTruthy()
  })

  it('a click marks the alert read and opens the product', async () => {
    rows.set([row('a')])
    unread.set(1)
    fixture.detectChanges()
    open()
    el.querySelector<HTMLButtonElement>('[data-testid="notification-item"]')!.click()
    await fixture.whenStable()
    expect(markRead).toHaveBeenCalledOnceWith('a')
    expect(navigate).toHaveBeenCalledOnceWith(['/inventory/edit', 'p-a'])
    expect(switchBusiness).not.toHaveBeenCalled()
  })

  it('an alert of another business switches into it first', async () => {
    rows.set([row('a', { businessId: 'b2' })])
    fixture.detectChanges()
    open()
    el.querySelector<HTMLButtonElement>('[data-testid="notification-item"]')!.click()
    await fixture.whenStable()
    expect(markRead).toHaveBeenCalledOnceWith('a')
    expect(switchBusiness).toHaveBeenCalledOnceWith('b2')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('mark all calls markAllRead', () => {
    rows.set([row('a')])
    unread.set(1)
    fixture.detectChanges()
    open()
    el.querySelector<HTMLButtonElement>('[data-testid="notification-mark-all"]')!.click()
    expect(markAllRead).toHaveBeenCalledTimes(1)
  })
})
