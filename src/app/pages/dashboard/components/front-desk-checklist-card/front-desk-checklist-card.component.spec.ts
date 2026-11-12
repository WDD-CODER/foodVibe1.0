import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { Circle, CircleCheck, ClipboardCheck, LucideAngularModule } from 'lucide-angular'
import { BusinessService, type FrontDeskSetup } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import type { Business } from '@schemas/entities'
import { FrontDeskChecklistCardComponent } from './front-desk-checklist-card.component'

const BUSINESS = {
  _id: 'b1',
  name: 'x',
  ownerId: 'o1',
  createdAt: 1,
  internal: false,
  lastSyncedMasterVersion: 0
} as Business
const NONE: FrontDeskSetup = { businessType: null, items: [], done: 0, total: 0 }
const PARTIAL: FrontDeskSetup = {
  businessType: 'catering',
  items: [
    { key: 'profile_basics', done: true },
    { key: 'hours', done: false },
    { key: 'test_request', done: false }
  ],
  done: 1,
  total: 3
}

describe('FrontDeskChecklistCardComponent (plan 556)', () => {
  let fixture: ComponentFixture<FrontDeskChecklistCardComponent>

  async function setup(frontDesk: FrontDeskSetup | undefined, owner = true): Promise<void> {
    TestBed.configureTestingModule({
      imports: [FrontDeskChecklistCardComponent, LucideAngularModule.pick({ ClipboardCheck, Circle, CircleCheck })],
      providers: [
        {
          provide: BusinessService,
          useValue: { business_: signal(BUSINESS).asReadonly(), loadSetupStatus: () => Promise.resolve({ frontDesk }) }
        },
        { provide: PermissionService, useValue: { isOwner_: signal(owner).asReadonly() } },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) },
        {
          provide: TranslationService,
          useValue: {
            translate: (key: string) => (key === 'frontdesk_setup_progress' ? '{{done}} מתוך {{total}}' : key)
          }
        },
        provideRouter([])
      ]
    })
    fixture = TestBed.createComponent(FrontDeskChecklistCardComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const el = (): HTMLElement => fixture.nativeElement
  const card = () => el().querySelector('[data-testid="frontdesk-setup-card"]')

  it('shows the progress and one row per item, open rows linking to the form and the test request to /requests', async () => {
    await setup(PARTIAL)
    expect(el().querySelector('[data-testid="frontdesk-setup-progress"]')!.textContent!.trim()).toBe('1 מתוך 3')
    expect(el().querySelectorAll('li').length).toBe(3)
    expect(el().querySelector('[data-testid="frontdesk-row-hours"] a')!.getAttribute('href')).toBe(
      '/frontdesk/onboarding'
    )
    expect(el().querySelector('[data-testid="frontdesk-row-test_request"] a')!.getAttribute('href')).toBe('/requests')
    expect(el().querySelector('[data-testid="frontdesk-row-profile_basics"] a')).toBeNull()
  })

  it('offers a start button when the business has no profile', async () => {
    await setup(NONE)
    expect(el().querySelector('[data-testid="frontdesk-setup-start"]')!.getAttribute('href')).toBe(
      '/frontdesk/onboarding'
    )
    expect(el().querySelector('li')).toBeNull()
  })

  it('hides itself when everything is done, and for staff', async () => {
    await setup({ ...PARTIAL, items: PARTIAL.items.map((i) => ({ ...i, done: true })), done: 3 })
    expect(card()).toBeNull()
    TestBed.resetTestingModule()
    await setup(PARTIAL, false)
    expect(card()).toBeNull()
  })
})
