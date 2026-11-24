import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, Send, Settings } from 'lucide-angular'
import { FrontDeskOnboardingComponent } from './frontdesk-onboarding.page'
import { BusinessService } from '@services/business.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { KnowledgeItemDataService } from '@services/knowledge-item-data.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { PermissionService } from '@services/permission.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('FrontDeskOnboardingComponent shared pieces (plan 708)', () => {
  let fixture: ComponentFixture<FrontDeskOnboardingComponent>

  type Internals = {
    form: { controls: Record<string, { setValue: (v: unknown) => void }> }
    newClosed_: { set: (v: string) => void }
    addClosedDate: () => void
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(ensureLoaded: () => Promise<void>): Promise<void> {
    TestBed.configureTestingModule({
      imports: [FrontDeskOnboardingComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Settings, Send })],
      providers: [
        provideRouter([]),
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_: signal(null), ensureLoaded, reloadFromStorage: () => Promise.resolve() }
        },
        {
          provide: KnowledgeItemDataService,
          useValue: {
            allItems_: signal([]),
            ensureLoaded: () => Promise.resolve(),
            reloadFromStorage: () => Promise.resolve()
          }
        },
        {
          provide: BusinessService,
          useValue: { business_: signal(null), saveFrontDeskIntake: () => Promise.resolve({}) }
        },
        { provide: RequestDataService, useValue: { createManual: () => Promise.resolve({ ok: true }) } },
        { provide: MenuEventTypeService, useValue: { allEventTypes_: signal(['wedding']) } },
        { provide: PermissionService, useValue: { can: () => true } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        }
      ]
    })
    fixture = TestBed.createComponent(FrontDeskOnboardingComponent)
    fixture.detectChanges()
  }

  it('shows one app-loader while loading', async () => {
    await setup(() => new Promise<void>(() => undefined))
    expect(el().querySelectorAll('app-loader').length).toBe(1)
  })

  it('draws closed dates as removable chips and removes one', async () => {
    await setup(() => Promise.resolve())
    await settle()
    cmp().form.controls['type'].setValue('catering')
    await settle()
    for (const date of ['2026-12-01', '2026-12-02']) {
      cmp().newClosed_.set(date)
      cmp().addClosedDate()
    }
    await settle()
    expect(el().querySelectorAll('.c-chip--removable').length).toBe(2)
    el().querySelector<HTMLButtonElement>('.c-chip--removable .c-chip__remove')!.click()
    await settle()
    expect(el().querySelectorAll('.c-chip--removable').length).toBe(1)
  })
})
