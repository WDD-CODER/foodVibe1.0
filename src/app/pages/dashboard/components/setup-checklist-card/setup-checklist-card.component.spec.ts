import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService, type SetupStatus } from '@services/business.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import type { Business } from '@schemas/entities'
import { SetupChecklistCardComponent } from './setup-checklist-card.component'

const BUSINESS: Business = {
  _id: 'b1',
  name: 'x',
  ownerId: 'o1',
  createdAt: 1,
  internal: false,
  lastSyncedMasterVersion: 0,
  baseline: { filledAt: 1 }
}
const EMPTY: SetupStatus = { pricedProducts: 0, suppliers: 0, recipes: 0, events: 0, staff: 0 }
const KEY = 'fv_setup_card_hidden_b1'

describe('SetupChecklistCardComponent', () => {
  let fixture: ComponentFixture<SetupChecklistCardComponent>
  let business_: ReturnType<typeof signal<Business | null>>
  let isOwner_: ReturnType<typeof signal<boolean>>
  let loadSetupStatus: jasmine.Spy
  let products_: ReturnType<typeof signal<unknown[]>>
  let router: Router
  let navigate: jasmine.Spy

  async function setup(status: SetupStatus = EMPTY, owner = true, business: Business | null = BUSINESS): Promise<void> {
    business_ = signal<Business | null>(business)
    isOwner_ = signal(owner)
    products_ = signal<unknown[]>([])
    loadSetupStatus = jasmine.createSpy('loadSetupStatus').and.resolveTo(status)
    TestBed.configureTestingModule({
      imports: [SetupChecklistCardComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: { business_: business_.asReadonly(), loadSetupStatus } },
        { provide: PermissionService, useValue: { isOwner_: isOwner_.asReadonly() } },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) },
        { provide: KitchenStateService, useValue: { products_: products_.asReadonly() } },
        {
          provide: TranslationService,
          useValue: { translate: (key: string) => (key === 'setup_products_progress' ? '{{done}} מתוך {{goal}}' : key) }
        },
        provideRouter([])
      ]
    })
    router = TestBed.inject(Router)
    navigate = spyOn(router, 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(SetupChecklistCardComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const card = () => el().querySelector('[data-testid="setup-card"]')
  const step = (key: string) => el().querySelector(`[data-testid="setup-step-${key}"]`)!
  const isDone = (key: string) => step(key).querySelector('[data-testid="setup-step-done"]') !== null

  beforeEach(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // storage unavailable in this browser: nothing to clear
    }
  })

  it('shows the five steps, none done, for an owner with a new business', async () => {
    await setup()
    expect(card()).not.toBeNull()
    expect(el().querySelectorAll('li').length).toBe(5)
    for (const key of ['products', 'supplier', 'recipe', 'event', 'staff']) expect(isDone(key)).toBeFalse()
    expect(el().querySelector('[data-testid="setup-progress"]')?.textContent).toContain('0')
    expect(navigate).not.toHaveBeenCalled()
  })

  const progressText = () => step('products').querySelector('[data-testid="setup-step-progress"]')?.textContent?.trim()

  it('5 priced products tick step 1, 4 do not and the step reads "4 מתוך 5"', async () => {
    await setup({ ...EMPTY, pricedProducts: 5 })
    expect(isDone('products')).toBeTrue()
    expect(progressText()).toBeUndefined()
    TestBed.resetTestingModule()
    await setup({ ...EMPTY, pricedProducts: 4 })
    expect(isDone('products')).toBeFalse()
    expect(progressText()).toBe('4 מתוך 5')
  })

  it('one priced product moves the card to "1 מתוך 5" (plan 469 H3-1)', async () => {
    await setup({ ...EMPTY, pricedProducts: 1 })
    expect(progressText()).toBe('1 מתוך 5')
  })

  it('adding a product while the card stays open asks for the status once more', async () => {
    await setup()
    expect(loadSetupStatus).toHaveBeenCalledTimes(1)
    expect(progressText()).toBe('0 מתוך 5')
    loadSetupStatus.and.resolveTo({ ...EMPTY, pricedProducts: 1 })
    products_.set([{}])
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(loadSetupStatus).toHaveBeenCalledTimes(2)
    expect(progressText()).toBe('1 מתוך 5')
  })

  it('a hidden card does not reload when products change', async () => {
    localStorage.setItem(KEY, '1')
    await setup()
    products_.set([{}])
    fixture.detectChanges()
    await fixture.whenStable()
    expect(loadSetupStatus).not.toHaveBeenCalled()
  })

  it('ticks each step from the status and counts only the four required', async () => {
    await setup({ pricedProducts: 3, suppliers: 1, recipes: 2, events: 0, staff: 1 })
    expect(isDone('supplier')).toBeTrue()
    expect(isDone('recipe')).toBeTrue()
    expect(isDone('event')).toBeFalse()
    expect(isDone('staff')).toBeTrue()
    expect(el().querySelector('[data-testid="setup-progress"]')?.textContent).toContain('2')
  })

  it('is hidden when the four required steps are done even if staff is 0', async () => {
    await setup({ pricedProducts: 5, suppliers: 1, recipes: 1, events: 1, staff: 0 })
    expect(card()).toBeNull()
  })

  it('hide removes the card and remembers it for the business', async () => {
    await setup()
    ;(el().querySelector('[data-testid="setup-hide"]') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(card()).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('1')
  })

  it('stays hidden when it was hidden before', async () => {
    localStorage.setItem(KEY, '1')
    await setup()
    expect(card()).toBeNull()
    expect(loadSetupStatus).not.toHaveBeenCalled()
  })

  it('renders nothing and asks for nothing for staff', async () => {
    await setup(EMPTY, false)
    expect(card()).toBeNull()
    expect(loadSetupStatus).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('an unticked step opens the screen where it is done', async () => {
    await setup()
    const href = (key: string) => step(key).querySelector('a')?.getAttribute('href')
    expect(href('staff')).toBe('/settings?tab=team')
    expect(href('supplier')).toBe('/suppliers/add')
  })

  it('owner without a baseline is NOT sent anywhere and the status still loads once (plan 469, replaces the 431 redirect test)', async () => {
    await setup(EMPTY, true, { ...BUSINESS, baseline: undefined })
    expect(navigate).not.toHaveBeenCalled()
    expect(loadSetupStatus).toHaveBeenCalledTimes(1)
    expect(card()).not.toBeNull()
    business_.set({ ...BUSINESS, baseline: undefined, name: 'renamed' })
    fixture.detectChanges()
    expect(navigate).not.toHaveBeenCalled()
    expect(loadSetupStatus).toHaveBeenCalledTimes(1)
  })

  it('does not navigate when the business arrives after the card was created, then loads the status (replaces the 431 redirect test)', async () => {
    await setup(EMPTY, true, null)
    expect(loadSetupStatus).not.toHaveBeenCalled()
    business_.set({ ...BUSINESS, baseline: undefined })
    fixture.detectChanges()
    await fixture.whenStable()
    expect(navigate).not.toHaveBeenCalled()
    expect(loadSetupStatus).toHaveBeenCalledTimes(1)
  })

  it('staff without a baseline: no navigation, no card, no banner, no status request', async () => {
    await setup(EMPTY, false, { ...BUSINESS, baseline: undefined })
    expect(navigate).not.toHaveBeenCalled()
    expect(loadSetupStatus).not.toHaveBeenCalled()
    expect(card()).toBeNull()
    expect(el().querySelector('app-opening-details-banner')).toBeNull()
  })

  it('with a baseline there is no redirect and the status loads once', async () => {
    await setup()
    expect(navigate).not.toHaveBeenCalled()
    business_.set({ ...BUSINESS, baseline: { filledAt: 2 } })
    fixture.detectChanges()
    expect(loadSetupStatus).toHaveBeenCalledTimes(1)
  })
})
