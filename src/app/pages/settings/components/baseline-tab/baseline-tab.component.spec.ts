import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { BaselineInput, Business } from '@schemas/entities'
import { BaselineTabComponent } from './baseline-tab.component'

const BUSINESS: Business = {
  _id: 'b1',
  name: 'x',
  ownerId: 'o1',
  createdAt: 1,
  internal: false,
  lastSyncedMasterVersion: 0
}

describe('BaselineTabComponent', () => {
  let fixture: ComponentFixture<BaselineTabComponent>
  let business_: ReturnType<typeof signal<Business | null>>
  let updateBaseline: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  let router: jasmine.SpyObj<Router>

  function setup(query: Record<string, string> = {}): void {
    business_ = signal<Business | null>(BUSINESS)
    updateBaseline = jasmine.createSpy('updateBaseline').and.callFake(async (input: BaselineInput) => {
      business_.update((business) =>
        business ? { ...business, baseline: { ...input, filledAt: Date.now() } } : business
      )
    })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    router = jasmine.createSpyObj<Router>('Router', ['navigate'])
    router.navigate.and.returnValue(Promise.resolve(true))
    TestBed.configureTestingModule({
      imports: [BaselineTabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: { business_: business_.asReadonly(), updateBaseline } },
        { provide: UserMsgService, useValue: userMsg },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error'])
        },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParams: of(query), snapshot: { queryParams: query } } }
      ]
    })
    fixture = TestBed.createComponent(BaselineTabComponent)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const input = (key: string) => el().querySelector(`[data-testid="baseline-${key}"]`) as HTMLInputElement
  const saveBtn = () => el().querySelector('[data-testid="baseline-save"]') as HTMLButtonElement
  const skipBtn = () => el().querySelector('[data-testid="baseline-skip"]') as HTMLButtonElement | null
  function type(key: string, value: string): void {
    const field = input(key)
    field.value = value
    field.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  it('starts empty with save disabled and the not-filled line', () => {
    setup()
    expect(input('eventsClosedPerMonth').value).toBe('')
    expect(saveBtn().disabled).toBeTrue()
    expect(el().querySelector('[data-testid="baseline-updated"]')?.textContent).toContain('baseline_not_filled')
  })

  it('saves only the filled fields and toasts', async () => {
    setup()
    type('eventsClosedPerMonth', '4')
    type('avgRevenuePerEvent', '12000')
    expect(saveBtn().disabled).toBeFalse()
    await fixture.componentInstance.save()
    expect(updateBaseline).toHaveBeenCalledOnceWith({ eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000 })
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('baseline_saved')
    expect(router.navigate).not.toHaveBeenCalled()
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="baseline-updated"]')?.textContent).toContain('baseline_updated_at')
  })

  it('shows the stored numbers', () => {
    setup()
    business_.set({
      ...BUSINESS,
      baseline: { eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000, filledAt: 1700000000000 }
    })
    fixture.detectChanges()
    expect(input('eventsClosedPerMonth').value).toBe('4')
    expect(input('avgRevenuePerEvent').value).toBe('12000')
  })

  it('a profit of 100 is invalid and cannot be saved', () => {
    setup()
    type('estProfitPct', '100')
    expect(saveBtn().disabled).toBeTrue()
  })

  it('an out-of-range value shows a message', () => {
    setup()
    type('estProfitPct', '100')
    expect(el().querySelector('[data-testid="baseline-error-estProfitPct"]')?.textContent).toContain(
      'baseline_value_invalid'
    )
  })

  it('clearing a stored value can be saved as an empty baseline', async () => {
    setup()
    business_.set({ ...BUSINESS, baseline: { eventsClosedPerMonth: 4, filledAt: 1700000000000 } })
    fixture.detectChanges()
    type('eventsClosedPerMonth', '')
    expect(saveBtn().disabled).toBeFalse()
    await fixture.componentInstance.save()
    expect(updateBaseline).toHaveBeenCalledOnceWith({})
  })

  it('no skip button outside the first visit', () => {
    setup()
    expect(skipBtn()).toBeNull()
  })

  it('first visit: skip stores an empty baseline and goes to the dashboard', async () => {
    setup({ tab: 'baseline', first: '1' })
    expect(skipBtn()).not.toBeNull()
    await fixture.componentInstance.skip()
    expect(updateBaseline).toHaveBeenCalledOnceWith({})
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'])
  })

  it('first visit: save goes to the dashboard', async () => {
    setup({ tab: 'baseline', first: '1' })
    type('eventsClosedPerMonth', '3')
    await fixture.componentInstance.save()
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'])
  })

  it('a server refusal shows the invalid toast and stays on the page', async () => {
    setup({ first: '1' })
    updateBaseline.and.rejectWith({ status: 400 })
    type('eventsClosedPerMonth', '3')
    await fixture.componentInstance.save()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('settings_invalid')
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('the form is centred in a wide page: equal, positive inline margins (plan 469 H1)', () => {
    setup()
    const host = fixture.nativeElement as HTMLElement
    host.style.display = 'block'
    host.style.inlineSize = '1280px'
    document.body.appendChild(host)
    try {
      const root = host.querySelector('.baseline-form') as HTMLElement
      const style = getComputedStyle(root)
      expect(parseFloat(style.marginInlineStart)).toBeGreaterThan(0)
      expect(style.marginInlineStart).toBe(style.marginInlineEnd)
    } finally {
      host.remove()
    }
  })
})
