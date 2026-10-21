import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService, type SetupStatus } from '@services/business.service'
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
  let router: jasmine.SpyObj<Router>

  async function setup(status: SetupStatus = EMPTY, owner = true, business: Business | null = BUSINESS): Promise<void> {
    business_ = signal<Business | null>(business)
    isOwner_ = signal(owner)
    loadSetupStatus = jasmine.createSpy('loadSetupStatus').and.resolveTo(status)
    router = jasmine.createSpyObj<Router>('Router', ['navigate'])
    router.navigate.and.returnValue(Promise.resolve(true))
    TestBed.configureTestingModule({
      imports: [SetupChecklistCardComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: { business_: business_.asReadonly(), loadSetupStatus } },
        { provide: PermissionService, useValue: { isOwner_: isOwner_.asReadonly() } },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: router }
      ]
    })
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
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('10 priced products tick step 1, 9 do not', async () => {
    await setup({ ...EMPTY, pricedProducts: 10 })
    expect(isDone('products')).toBeTrue()
    TestBed.resetTestingModule()
    await setup({ ...EMPTY, pricedProducts: 9 })
    expect(isDone('products')).toBeFalse()
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
    await setup({ pricedProducts: 10, suppliers: 1, recipes: 1, events: 1, staff: 0 })
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
  })

  it('renders nothing and asks for nothing for staff', async () => {
    await setup(EMPTY, false)
    expect(card()).toBeNull()
    expect(loadSetupStatus).not.toHaveBeenCalled()
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('an unticked step opens the screen where it is done', async () => {
    await setup()
    ;(step('staff').querySelector('button') as HTMLButtonElement).click()
    expect(router.navigate).toHaveBeenCalledWith(['/settings'], { queryParams: { tab: 'team' } })
    ;(step('supplier').querySelector('button') as HTMLButtonElement).click()
    expect(router.navigate).toHaveBeenCalledWith(['/suppliers/add'], undefined)
  })

  it('owner without a baseline is sent to the baseline screen once, without loading the status', async () => {
    await setup(EMPTY, true, { ...BUSINESS, baseline: undefined })
    expect(router.navigate).toHaveBeenCalledOnceWith(['/settings'], { queryParams: { tab: 'baseline', first: 1 } })
    business_.set({ ...BUSINESS, baseline: undefined, name: 'renamed' })
    fixture.detectChanges()
    expect(router.navigate).toHaveBeenCalledTimes(1)
    expect(loadSetupStatus).not.toHaveBeenCalled()
    expect(card()).toBeNull()
  })

  it('redirects when the business arrives after the card was created', async () => {
    await setup(EMPTY, true, null)
    expect(router.navigate).not.toHaveBeenCalled()
    business_.set({ ...BUSINESS, baseline: undefined })
    fixture.detectChanges()
    expect(router.navigate).toHaveBeenCalledOnceWith(['/settings'], { queryParams: { tab: 'baseline', first: 1 } })
  })

  it('with a baseline there is no redirect and the status loads once', async () => {
    await setup()
    expect(router.navigate).not.toHaveBeenCalled()
    business_.set({ ...BUSINESS, baseline: { filledAt: 2 } })
    fixture.detectChanges()
    expect(loadSetupStatus).toHaveBeenCalledTimes(1)
  })
})
