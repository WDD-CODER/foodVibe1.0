import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { Router } from '@angular/router'
import { By } from '@angular/platform-browser'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'

import { DashboardOverviewComponent } from './dashboard-overview.component'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { ActivityLogService, ActivityEntry, ActivityAction, ActivityEntityType } from '@services/activity-log.service'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import { Product } from '@models/product.model'
import { Recipe } from '@models/recipe.model'

describe('DashboardOverviewComponent', () => {
  let fixture: ComponentFixture<DashboardOverviewComponent>
  let component: DashboardOverviewComponent
  let mockRouter: jasmine.SpyObj<Router>
  let mockActivityLog: jasmine.SpyObj<ActivityLogService>
  let mockProducts: WritableSignal<Product[]>
  let mockRecipes: WritableSignal<Recipe[]>
  let mockLowStock: WritableSignal<Product[]>
  let mockIsLoggedIn: WritableSignal<boolean>
  let mockRecipeData: jasmine.SpyObj<Pick<RecipeDataService, 'getCount'>>
  let mockDishData: jasmine.SpyObj<Pick<DishDataService, 'getCount'>>

  const makeEntry = (overrides: Partial<ActivityEntry> = {}): ActivityEntry => ({
    id: 'e1',
    action: 'updated' as ActivityAction,
    entityType: 'product' as ActivityEntityType,
    entityId: 'p1',
    entityName: 'Test Product',
    timestamp: Date.now(),
    ...overrides
  })

  beforeEach(async () => {
    mockProducts = signal<Product[]>([])
    mockRecipes = signal<Recipe[]>([])
    mockLowStock = signal<Product[]>([])
    mockIsLoggedIn = signal<boolean>(true)

    mockRouter = jasmine.createSpyObj('Router', ['navigate'])
    mockRouter.navigate.and.returnValue(Promise.resolve(true))

    mockActivityLog = jasmine.createSpyObj('ActivityLogService', ['syncFromStorage', 'getRecentEntriesFromStorage'])
    mockActivityLog.getRecentEntriesFromStorage.and.returnValue([])

    const mockKitchenState = {
      products_: mockProducts.asReadonly(),
      recipes_: mockRecipes.asReadonly(),
      lowStockProducts_: mockLowStock.asReadonly()
    }

    // totalRecipes_/unapprovedCount_ come from the lightweight /count endpoint now
    // (plan 304 M2), not kitchenState.recipes_() — default to 0 like a fresh signal.
    mockRecipeData = jasmine.createSpyObj('RecipeDataService', ['getCount'])
    mockRecipeData.getCount.and.resolveTo(0)
    mockDishData = jasmine.createSpyObj('DishDataService', ['getCount'])
    mockDishData.getCount.and.resolveTo(0)

    const mockTranslation = jasmine.createSpyObj('TranslationService', [
      'translate',
      'resolveUnit',
      'resolveCategory',
      'resolveAllergen',
      'resolveSectionCategory',
      'resolvePreparationCategory'
    ])
    mockTranslation.translate.and.callFake((k: string) => k)

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: KitchenStateService, useValue: mockKitchenState },
        { provide: RecipeDataService, useValue: mockRecipeData },
        { provide: DishDataService, useValue: mockDishData },
        { provide: ActivityLogService, useValue: mockActivityLog },
        { provide: UserService, useValue: { isLoggedIn: mockIsLoggedIn } },
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: mockTranslation }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardOverviewComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('activeTab', 'overview')
    // Note: detectChanges() is called per-test so mock state is set before first render
  })

  // --- Lifecycle ---

  it('should create', () => {
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('should call syncFromStorage on init', () => {
    fixture.detectChanges()
    expect(mockActivityLog.syncFromStorage).toHaveBeenCalledTimes(1)
  })

  // --- KPI Signals ---

  it('should reflect totalProducts_ from signal', () => {
    fixture.detectChanges()
    mockProducts.set([{} as Product, {} as Product, {} as Product])
    fixture.detectChanges()
    const kpiVal = fixture.debugElement.query(By.css('[data-testid="kpi-total-products"] .kpi-value'))
    expect(kpiVal.nativeElement.textContent.trim()).toBe('3')
  })

  it('should reflect totalRecipes_ from the /count endpoint', async () => {
    // totalRecipes_ is fetched once in the constructor (plan 304 M2) — configure the
    // spy's resolved value before creating a fresh instance, not after.
    mockRecipeData.getCount.and.resolveTo(1)
    mockDishData.getCount.and.resolveTo(1)
    const freshFixture = TestBed.createComponent(DashboardOverviewComponent)
    freshFixture.componentRef.setInput('activeTab', 'overview')
    freshFixture.detectChanges()
    await freshFixture.whenStable()
    freshFixture.detectChanges()
    const kpiVal = freshFixture.debugElement.query(By.css('[data-testid="kpi-total-recipes"] .kpi-value'))
    expect(kpiVal.nativeElement.textContent.trim()).toBe('2')
  })

  it('should reflect lowStockCount_ from signal', () => {
    fixture.detectChanges()
    mockLowStock.set([{} as Product])
    fixture.detectChanges()
    const kpiVal = fixture.debugElement.query(By.css('[data-testid="kpi-low-stock"] .kpi-value'))
    expect(kpiVal.nativeElement.textContent.trim()).toBe('1')
  })

  it('should count unapproved recipes via the /count endpoint', async () => {
    mockRecipeData.getCount.and.callFake((filter?: string) => Promise.resolve(filter === 'unapproved' ? 1 : 2))
    mockDishData.getCount.and.callFake((filter?: string) => Promise.resolve(filter === 'unapproved' ? 1 : 1))
    const freshFixture = TestBed.createComponent(DashboardOverviewComponent)
    freshFixture.componentRef.setInput('activeTab', 'overview')
    freshFixture.detectChanges()
    await freshFixture.whenStable()
    freshFixture.detectChanges()
    const kpiVal = freshFixture.debugElement.query(By.css('[data-testid="kpi-unapproved"] .kpi-value'))
    expect(kpiVal.nativeElement.textContent.trim()).toBe('2')
  })

  // --- Activity ---

  it('should show empty state when no activity', () => {
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('[data-testid="activity-empty"]'))).not.toBeNull()
  })

  it('should render activity items when entries exist', () => {
    mockActivityLog.getRecentEntriesFromStorage.and.returnValue([makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })])
    fixture.detectChanges()
    const items = fixture.debugElement.queryAll(By.css('[data-testid="activity-item"]'))
    expect(items.length).toBe(2)
  })

  it('should not show empty state when activity exists', () => {
    mockActivityLog.getRecentEntriesFromStorage.and.returnValue([makeEntry()])
    fixture.detectChanges()
    expect(fixture.debugElement.query(By.css('[data-testid="activity-empty"]'))).toBeNull()
  })

  // --- Navigation ---

  it('should navigate to /inventory on goToInventory', () => {
    fixture.detectChanges()
    fixture.debugElement.query(By.css('[data-testid="btn-view-inventory"]')).nativeElement.click()
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory'])
  })

  it('should navigate to /inventory/add on goToAddProduct', () => {
    fixture.detectChanges()
    fixture.debugElement.query(By.css('[data-testid="btn-add-product"]')).nativeElement.click()
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory', 'add'])
  })

  it('should navigate to /recipe-book on goToRecipeBook', () => {
    fixture.detectChanges()
    fixture.debugElement.query(By.css('[data-testid="btn-view-recipes"]')).nativeElement.click()
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/recipe-book'])
  })

  it('should navigate with filters param on goToRecipeBookUnapproved', () => {
    fixture.detectChanges()
    fixture.debugElement.query(By.css('[data-testid="btn-view-unapproved"]')).nativeElement.click()
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/recipe-book'],
      jasmine.objectContaining({ queryParams: { filters: 'Approved:false' } })
    )
  })

  it('should navigate with lowStock param on goToInventoryLowStock', () => {
    fixture.detectChanges()
    fixture.debugElement.query(By.css('[data-testid="btn-view-low-stock"]')).nativeElement.click()
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/inventory'],
      jasmine.objectContaining({ queryParams: { lowStock: '1' } })
    )
  })

  // --- Popover ---

  it('should open popover on toggleChangePopover call', () => {
    mockActivityLog.getRecentEntriesFromStorage.and.returnValue([
      makeEntry({ changes: [{ field: 'price', label: 'activity_field_price' }] })
    ])
    fixture.detectChanges()
    const changeTag = fixture.debugElement.query(By.css('.change-tag'))
    changeTag.nativeElement.click()
    expect((component as unknown as { openChange_: () => unknown }).openChange_()).not.toBeNull()
  })

  it('should close popover on second click of same change tag', () => {
    mockActivityLog.getRecentEntriesFromStorage.and.returnValue([
      makeEntry({ changes: [{ field: 'price', label: 'activity_field_price' }] })
    ])
    fixture.detectChanges()
    const changeTag = fixture.debugElement.query(By.css('.change-tag'))
    changeTag.nativeElement.click() // open
    changeTag.nativeElement.click() // close
    expect((component as unknown as { openChange_: () => unknown }).openChange_()).toBeNull()
  })

  // --- Auth ---

  it('should set title attr on add-product button when not logged in', () => {
    mockIsLoggedIn.set(false)
    fixture.detectChanges()
    const btn = fixture.debugElement.query(By.css('[data-testid="btn-add-product"]'))
    expect(btn.nativeElement.getAttribute('title')).toBeTruthy()
  })

  it('should not set title attr when logged in', () => {
    mockIsLoggedIn.set(true)
    fixture.detectChanges()
    const btn = fixture.debugElement.query(By.css('[data-testid="btn-add-product"]'))
    expect(btn.nativeElement.getAttribute('title')).toBeNull()
  })
})
