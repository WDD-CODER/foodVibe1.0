import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Business } from '@schemas/entities'
import { BusinessSettingsTabComponent } from './business-settings-tab.component'

const BUSINESS: Business = {
  _id: 'b1',
  name: 'x',
  ownerId: 'o1',
  createdAt: 1,
  internal: false,
  lastSyncedMasterVersion: 0,
  settings: { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }
}

describe('BusinessSettingsTabComponent', () => {
  let fixture: ComponentFixture<BusinessSettingsTabComponent>
  let business_: ReturnType<typeof signal<Business | null>>
  let updateSettings: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>

  beforeEach(() => {
    business_ = signal<Business | null>(BUSINESS)
    updateSettings = jasmine.createSpy('updateSettings').and.callFake(async (settings: Business['settings']) => {
      business_.update((business) => (business ? { ...business, settings } : business))
    })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [BusinessSettingsTabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: { business_: business_.asReadonly(), updateSettings } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    fixture = TestBed.createComponent(BusinessSettingsTabComponent)
    fixture.detectChanges()
  })

  const el = () => fixture.nativeElement as HTMLElement
  const input = (key: string) => el().querySelector(`[data-testid="business-${key}"]`) as HTMLInputElement
  const saveBtn = () => el().querySelector('[data-testid="business-settings-save"]') as HTMLButtonElement
  function type(key: string, value: string): void {
    const field = input(key)
    field.value = value
    field.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  it('shows the stored numbers and keeps save disabled while nothing changed', () => {
    expect(input('profitTargetPct').value).toBe('25')
    expect(input('safetyMarginPct').value).toBe('10')
    expect(input('overrunThresholdPct').value).toBe('10')
    expect(saveBtn().disabled).toBeTrue()
  })

  it('shows the defaults when the business has no settings object yet', () => {
    business_.set({ ...BUSINESS, settings: undefined })
    fixture.detectChanges()
    expect(input('profitTargetPct').value).toBe('25')
  })

  it('100 in the target shows the field error and disables save', () => {
    type('profitTargetPct', '100')
    expect(el().querySelector('[data-testid="business-error-profitTargetPct"]')?.textContent).toContain(
      'pct_range_0_99'
    )
    expect(saveBtn().disabled).toBeTrue()
  })

  it('0 in the overrun threshold is refused with the overrun range message', () => {
    type('overrunThresholdPct', '0')
    expect(el().querySelector('[data-testid="business-error-overrunThresholdPct"]')?.textContent).toContain(
      'pct_range_overrun'
    )
    expect(saveBtn().disabled).toBeTrue()
  })

  it('a valid change enables save, sends all three numbers and toasts', async () => {
    type('profitTargetPct', '30')
    expect(saveBtn().disabled).toBeFalse()
    await fixture.componentInstance.save()
    expect(updateSettings).toHaveBeenCalledWith({ profitTargetPct: 30, safetyMarginPct: 10, overrunThresholdPct: 10 })
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('settings_saved')
    fixture.detectChanges()
    expect(saveBtn().disabled).toBeTrue()
  })

  it('a server refusal shows the invalid-settings toast', async () => {
    updateSettings.and.rejectWith({ status: 400 })
    type('profitTargetPct', '30')
    await fixture.componentInstance.save()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('settings_invalid')
    expect(userMsg.onSetSuccessMsg).not.toHaveBeenCalled()
  })

  it('a 403 adds no second toast (the interceptor already showed one)', async () => {
    updateSettings.and.rejectWith({ status: 403 })
    type('profitTargetPct', '30')
    await fixture.componentInstance.save()
    expect(userMsg.onSetErrorMsg).not.toHaveBeenCalled()
  })

  it('the form is centred in a wide page: equal, positive inline margins (plan 469 H1)', () => {
    const host = fixture.nativeElement as HTMLElement
    host.style.display = 'block'
    host.style.inlineSize = '1280px'
    document.body.appendChild(host)
    try {
      const root = host.querySelector('.business-form') as HTMLElement
      const style = getComputedStyle(root)
      expect(parseFloat(style.marginInlineStart)).toBeGreaterThan(0)
      expect(style.marginInlineStart).toBe(style.marginInlineEnd)
    } finally {
      host.remove()
    }
  })
})
