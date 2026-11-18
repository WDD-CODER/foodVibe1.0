import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule, Undo2 } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import { ActingBannerComponent } from './acting-banner.component'

describe('ActingBannerComponent', () => {
  const acting_ = signal<'consultant' | 'platform' | null>(null)
  const business_ = signal<{ name: string } | null>({ name: 'Client kitchen' })
  const switchBusiness = jasmine.createSpy('switchBusiness')
  const onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
  let fixture: ComponentFixture<ActingBannerComponent>
  const host = () => fixture.nativeElement as HTMLElement

  beforeEach(async () => {
    acting_.set(null)
    business_.set({ name: 'Client kitchen' })
    switchBusiness.calls.reset()
    onSetErrorMsg.calls.reset()
    await TestBed.configureTestingModule({
      imports: [ActingBannerComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Undo2 })],
      providers: [
        { provide: UserService, useValue: { acting_, switchBusiness } },
        { provide: BusinessService, useValue: { business_ } },
        { provide: UserMsgService, useValue: { onSetErrorMsg } },
        {
          provide: TranslationService,
          useValue: {
            translate: (k: string) =>
              k === 'acting_banner_consultant' ? 'C {name}' : k === 'acting_banner_platform' ? 'P {name}' : k
          }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(ActingBannerComponent)
    fixture.detectChanges()
  })

  it('renders nothing at home', () => {
    expect(host().querySelector('[data-testid="acting-banner"]')).toBeNull()
  })

  it('names the business for a consultant and for the platform admin', () => {
    acting_.set('consultant')
    fixture.detectChanges()
    const banner = host().querySelector('[data-testid="acting-banner"]')
    expect(banner?.getAttribute('role')).toBe('status')
    expect(banner?.textContent).toContain('C Client kitchen')
    acting_.set('platform')
    fixture.detectChanges()
    expect(host().querySelector('[data-testid="acting-banner"]')?.textContent).toContain('P Client kitchen')
  })

  it('the back button switches home and is disabled while it runs', () => {
    acting_.set('consultant')
    switchBusiness.and.returnValue(new Promise(() => undefined))
    fixture.detectChanges()
    const btn = host().querySelector('[data-testid="acting-back-home"]') as HTMLButtonElement
    btn.click()
    fixture.detectChanges()
    expect(switchBusiness).toHaveBeenCalledOnceWith(null)
    expect(btn.disabled).toBeTrue()
  })

  it('a failed switch shows the failure toast and enables the button again', async () => {
    acting_.set('consultant')
    switchBusiness.and.resolveTo(false)
    fixture.detectChanges()
    const btn = host().querySelector('[data-testid="acting-back-home"]') as HTMLButtonElement
    btn.click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(onSetErrorMsg).toHaveBeenCalledWith('switch_failed')
    expect(btn.disabled).toBeFalse()
  })
})
