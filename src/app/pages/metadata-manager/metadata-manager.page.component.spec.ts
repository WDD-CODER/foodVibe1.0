import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { MetadataManagerComponent } from './metadata-manager.page.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { ProductDataService } from '@services/product-data.service'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { signal } from '@angular/core'
import { TranslationService } from '@services/translation.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserService } from '@services/user.service'

describe('MetadataManagerPageComponent', () => {
  let component: MetadataManagerComponent
  let fixture: ComponentFixture<MetadataManagerComponent>
  let metadataRegistrySpy: jasmine.SpyObj<MetadataRegistryService>
  let productDataSpy: jasmine.SpyObj<ProductDataService>
  let unitRegistrySpy: jasmine.SpyObj<UnitRegistryService>
  let translationMock: { translate: (k: string) => string; updateDictionary: jasmine.Spy }

  // LOGIC CHANGE: Standardized English keys for Mock Signals
  const mockUnits = signal(['gram', 'ml'])
  const mockAllergens = signal(['gluten', 'nuts'])
  const mockCategories = signal(['vegetables', 'meat'])
  const mockLabels = signal([{ key: 'label1', color: '#ccc' }])
  const mockCourses = signal<{ key: string; color: string }[]>([])
  const mockMenuTypes = signal<{ key: string; fields?: string[] }[]>([])
  const mockProducts = signal([])

  beforeEach(async () => {
    // Mocking Services
    // REPLACEMENT: Changed 'allUnits_' to 'allUnitKeys_' to match the refactored Service
    unitRegistrySpy = jasmine.createSpyObj(
      'UnitRegistryService',
      ['getConversion', 'registerUnit', 'renameUnit', 'updateUnitRate'],
      { allUnitKeys_: mockUnits }
    )
    translationMock = { translate: (k: string) => k || '', updateDictionary: jasmine.createSpy('updateDictionary') }
    unitRegistrySpy.getConversion.and.returnValue(1)

    metadataRegistrySpy = jasmine.createSpyObj(
      'MetadataRegistryService',
      ['registerAllergen', 'getLabelColor', 'renameCategory', 'renameMenuType'],
      {
        allAllergens_: mockAllergens,
        allCategories_: mockCategories,
        allLabels_: mockLabels,
        courses_: mockCourses,
        allMenuTypes_: mockMenuTypes
      }
    )
    metadataRegistrySpy.getLabelColor.and.returnValue('#999')

    productDataSpy = jasmine.createSpyObj('ProductDataService', ['reloadFromStorage'], {
      allProducts_: mockProducts
    })

    await TestBed.configureTestingModule({
      imports: [MetadataManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: MetadataRegistryService, useValue: metadataRegistrySpy },
        { provide: ProductDataService, useValue: productDataSpy },
        { provide: TranslationService, useValue: translationMock }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(MetadataManagerComponent)
    component = fixture.componentInstance
    // The page lists all 12 sections for a platform admin; plan 426 tests below flip this.
    TestBed.inject(UserService)._saveUserLocal({ _id: 'u1', name: 'u', email: 'u@x', isPlatformAdmin: true })

    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('platform-admin sections (plan 426)', () => {
    const setPlatformAdmin = (isPlatformAdmin: boolean) => {
      TestBed.inject(UserService)._saveUserLocal({ _id: 'u1', name: 'u', email: 'u@x', isPlatformAdmin })
      fixture.detectChanges()
    }
    const tabLabels = () =>
      fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill')).map((b) => b.nativeElement.textContent.trim())

    it('hides user management, AI models and their jump tabs when the user is not a platform admin', () => {
      setPlatformAdmin(false)
      const host: HTMLElement = fixture.nativeElement
      expect(host.querySelector('#mm-sec-user')).toBeNull()
      expect(host.querySelector('#mm-sec-ai-models')).toBeNull()
      expect(tabLabels()).not.toContain('user_management')
      expect(tabLabels()).not.toContain('ai_model_manager')
    })

    it('shows them, and their jump tabs, for a platform admin', () => {
      setPlatformAdmin(true)
      const host: HTMLElement = fixture.nativeElement
      expect(host.querySelector('#mm-sec-user')).not.toBeNull()
      expect(host.querySelector('#mm-sec-ai-models')).not.toBeNull()
      expect(tabLabels()).toContain('user_management')
      expect(tabLabels()).toContain('ai_model_manager')
    })
  })

  // Plan 385: the server re-keys referencing documents, so a rename is one term write + a reload.
  it('renames a category through the registry only, then reloads products', async () => {
    metadataRegistrySpy.renameCategory.and.resolveTo()
    productDataSpy.reloadFromStorage.and.resolveTo()
    const rename = (
      component as unknown as {
        confirmAndCascadeRename: (type: string, oldKey: string, newKey: string, scope: string) => Promise<boolean>
      }
    ).confirmAndCascadeRename.bind(component)

    expect(await rename('category', 'meat', 'fish', 'me')).toBe(true)
    expect(metadataRegistrySpy.renameCategory).toHaveBeenCalledOnceWith('meat', 'fish')
    expect(productDataSpy.reloadFromStorage).toHaveBeenCalledTimes(1)
  })

  // Plan 421 - a refused menu-type rename must not touch any menu; the server re-keys on success.
  describe('renaming a menu type', () => {
    type MenuTypeRename = { requireSignIn: () => boolean; onMenuTypeNameBlur: (o: string, n: string) => Promise<void> }
    const page = (): MenuTypeRename => component as unknown as MenuTypeRename
    let menuReload: jasmine.Spy
    let menuWrite: jasmine.Spy

    beforeEach(() => {
      spyOn(page(), 'requireSignIn').and.returnValue(true)
      spyOn(TestBed.inject(ConfirmModalService), 'open').and.resolveTo(true)
      const menus = TestBed.inject(MenuEventDataService)
      menuReload = spyOn(menus, 'reloadFromStorage').and.resolveTo()
      menuWrite = spyOn(menus, 'updateMenuEvent').and.resolveTo()
    })

    it('a refused rename (to an existing type) writes no menu and does not reload', async () => {
      metadataRegistrySpy.renameMenuType.and.resolveTo(false)
      await page().onMenuTypeNameBlur('buffet', 'plated')
      expect(metadataRegistrySpy.renameMenuType).toHaveBeenCalledOnceWith('buffet', 'plated')
      expect(menuWrite).not.toHaveBeenCalled()
      expect(menuReload).not.toHaveBeenCalled()
    })

    it('a successful rename reloads the menus once and writes none from the client', async () => {
      metadataRegistrySpy.renameMenuType.and.resolveTo(true)
      await page().onMenuTypeNameBlur('buffet', 'banquet')
      expect(menuReload).toHaveBeenCalledTimes(1)
      expect(menuWrite).not.toHaveBeenCalled()
    })

    it('MenuEventDataService no longer has updateServingTypeForAll', () => {
      expect('updateServingTypeForAll' in TestBed.inject(MenuEventDataService)).toBeFalse()
    })
  })

  // Plan 377 — the unit edit dialog's save path.
  describe('editing a custom unit', () => {
    type UnitSave = { key: string; hebrewLabel: string; gramRate: number }
    const page = (): {
      requireSignIn: () => boolean
      editingUnit_: { (): UnitSave | null; set: (v: UnitSave | null) => void }
      onUnitEditSaved: (v: UnitSave) => Promise<void>
    } => component as unknown as ReturnType<typeof page>
    const jar: UnitSave = { key: 'jar', hebrewLabel: 'צנצנת', gramRate: 500 }
    let recipeReload: jasmine.Spy
    let dishReload: jasmine.Spy

    beforeEach(() => {
      spyOn(page(), 'requireSignIn').and.returnValue(true)
      unitRegistrySpy.renameUnit.and.resolveTo(true)
      unitRegistrySpy.updateUnitRate.and.resolveTo(true)
      productDataSpy.reloadFromStorage.and.resolveTo()
      recipeReload = spyOn(TestBed.inject(RecipeDataService), 'reloadFromStorage').and.resolveTo()
      dishReload = spyOn(TestBed.inject(DishDataService), 'reloadFromStorage').and.resolveTo()
    })

    it('key + conversion in one save: renames first, then sets the rate on the new key, then reloads all lists', async () => {
      page().editingUnit_.set(jar)
      await page().onUnitEditSaved({ key: 'crate', hebrewLabel: 'קרטון', gramRate: 750 })
      expect(unitRegistrySpy.renameUnit).toHaveBeenCalledOnceWith('jar', 'crate')
      expect(translationMock.updateDictionary).toHaveBeenCalledOnceWith('crate', 'קרטון', 'me')
      expect(unitRegistrySpy.updateUnitRate).toHaveBeenCalledOnceWith('crate', 750)
      expect(unitRegistrySpy.renameUnit).toHaveBeenCalledBefore(unitRegistrySpy.updateUnitRate)
      expect(productDataSpy.reloadFromStorage).toHaveBeenCalledTimes(1)
      expect(recipeReload).toHaveBeenCalledTimes(1)
      expect(dishReload).toHaveBeenCalledTimes(1)
    })

    it('label only: updates the dictionary, no term write, no reload', async () => {
      page().editingUnit_.set(jar)
      await page().onUnitEditSaved({ ...jar, hebrewLabel: 'צנצנת גדולה' })
      expect(translationMock.updateDictionary).toHaveBeenCalledOnceWith('jar', 'צנצנת גדולה', 'me')
      expect(unitRegistrySpy.renameUnit).not.toHaveBeenCalled()
      expect(unitRegistrySpy.updateUnitRate).not.toHaveBeenCalled()
      expect(productDataSpy.reloadFromStorage).not.toHaveBeenCalled()
    })

    it('a failed rename stops the save before the rate or dictionary change', async () => {
      unitRegistrySpy.renameUnit.and.resolveTo(false)
      page().editingUnit_.set(jar)
      await page().onUnitEditSaved({ key: 'crate', hebrewLabel: 'קרטון', gramRate: 750 })
      expect(unitRegistrySpy.updateUnitRate).not.toHaveBeenCalled()
      expect(translationMock.updateDictionary).not.toHaveBeenCalled()
    })

    it('a system unit never opens the edit dialog', async () => {
      await component.onRenameMetadata('gram', 'unit')
      expect(page().editingUnit_()).toBeNull()
    })
  })

  it('should identify system units via isSystemUnit', () => {
    expect(component.isSystemUnit('gram')).toBe(true)
    expect(component.isSystemUnit('kg')).toBe(true)
    expect(component.isSystemUnit('dish')).toBe(true)
    expect(component.isSystemUnit('jar')).toBe(false)
  })

  // --- Plan 340: compact chips + tap menu, menu-type toggle chips ---

  it('renders every metadata card as tap chips with no per-item action buttons', () => {
    const card = fixture.debugElement.query(By.css('#mm-sec-category'))
    const chips = card.queryAll(By.css('button.c-tap-chip'))
    expect(chips.map((c) => c.nativeElement.textContent.trim())).toEqual(['vegetables', 'meat'])
    expect(fixture.debugElement.queryAll(By.css('.manager-card .c-icon-btn')).length).toBe(0)
    // System units are locked, not tappable.
    const unitCard = fixture.debugElement.query(By.css('#mm-sec-unit'))
    expect(unitCard.queryAll(By.css('button.c-tap-chip')).length).toBe(0)
    expect(unitCard.queryAll(By.css('.c-tap-chip.is-locked')).length).toBe(2)
  })

  it('tapping a chip opens edit/delete; delete routes to onRemoveMetadata and closes the menu', () => {
    const removeSpy = spyOn(component, 'onRemoveMetadata').and.resolveTo()
    const chip = fixture.debugElement.query(By.css('#mm-sec-category button.c-tap-chip')).nativeElement as HTMLElement
    chip.click()
    fixture.detectChanges()

    expect(chip.getAttribute('aria-expanded')).toBe('true')
    const actions = fixture.debugElement.queryAll(By.css('app-row-actions-menu .c-icon-btn'))
    expect(actions.map((a) => a.nativeElement.getAttribute('aria-label'))).toEqual(['edit', 'delete'])
    expect(actions[1].nativeElement.classList).toContain('danger')

    actions[1].nativeElement.click()
    fixture.detectChanges()
    expect(removeSpy).toHaveBeenCalledOnceWith('vegetables', 'category')
    expect(fixture.debugElement.queryAll(By.css('app-row-actions-menu .c-icon-btn')).length).toBe(0)
  })

  it('menu types show all 5 fields in fixed order; toggling saves in ALL_DISH_FIELDS order', async () => {
    mockMenuTypes.set([{ key: 'buffet', fields: ['serving_portions'] }])
    metadataRegistrySpy.getMenuTypeFields = jasmine.createSpy().and.returnValue(['serving_portions'])
    metadataRegistrySpy.updateMenuType = jasmine.createSpy().and.resolveTo()
    fixture.detectChanges()

    const chips = fixture.debugElement.queryAll(By.css('.menu-type-row .c-toggle-chip input'))
    expect(chips.length).toBe(5)
    expect(chips.map((c) => (c.nativeElement as HTMLInputElement).checked)).toEqual([false, false, false, true, false])

    spyOn(component as unknown as { requireSignIn: () => boolean }, 'requireSignIn').and.returnValue(true)
    await component.onToggleMenuTypeField('buffet', 'sell_price')
    expect(metadataRegistrySpy.updateMenuType).toHaveBeenCalledWith('buffet', ['sell_price', 'serving_portions'])

    await component.onToggleMenuTypeField('buffet', 'serving_portions')
    expect(metadataRegistrySpy.updateMenuType).toHaveBeenCalledWith('buffet', [])
    mockMenuTypes.set([])
  })

  // --- Mobile/tablet jump nav ---

  const JUMP_SECTION_IDS = [
    'mm-sec-unit',
    'mm-sec-category',
    'mm-sec-allergen',
    'mm-sec-label',
    'mm-sec-course',
    'mm-sec-menu-type',
    'mm-sec-coefficients',
    'mm-sec-preparation',
    'mm-sec-section',
    'mm-sec-station',
    'mm-sec-user',
    'mm-sec-ai-models'
  ]

  it('should render exactly 12 jump-nav tabs in page order', () => {
    const tabs = fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill'))
    expect(tabs.length).toBe(12)
    expect(tabs.map((t) => t.nativeElement.textContent.trim())).toEqual([
      'metadata_units_and_conversions_title',
      'metadata_product_categories_title',
      'metadata_global_allergens_title',
      'metadata_recipe_labels_title',
      'metadata_recipe_courses_title',
      'metadata_menu_types_title',
      'metadata_coefficients_title',
      'metadata_prep_categories',
      'metadata_section_categories_title',
      'metadata_stations_title',
      'user_management',
      'ai_model_manager'
    ])
  })

  it('should give each of the 12 sections a matching stable id', () => {
    for (const id of JUMP_SECTION_IDS) {
      expect(fixture.debugElement.query(By.css(`#${id}`)))
        .withContext(id)
        .not.toBeNull()
    }
  })

  it('should default every section to its natural page order (no page scroll ever involved)', () => {
    JUMP_SECTION_IDS.forEach((id, index) => {
      expect(fixture.debugElement.query(By.css(`#${id}`)).nativeElement.style.order).toBe(String(index + 1))
    })
  })

  it('should bring the target section to the front (order 0) when its jump-nav tab is clicked, without disturbing the others', () => {
    const tab = fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill'))[5] // Menu Types
    tab.nativeElement.click()
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('#mm-sec-menu-type')).nativeElement.style.order).toBe('0')
    expect(tab.nativeElement.classList.contains('active')).toBeTrue()
    // Everyone else keeps their natural relative order.
    expect(fixture.debugElement.query(By.css('#mm-sec-unit')).nativeElement.style.order).toBe('1')
    expect(fixture.debugElement.query(By.css('#mm-sec-user')).nativeElement.style.order).toBe('11')
  })

  it('should swap directly to a different section when its tab is clicked while another is front', () => {
    const tabs = fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill'))
    tabs[5].nativeElement.click() // Menu Types
    fixture.detectChanges()
    tabs[0].nativeElement.click() // Units
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('#mm-sec-menu-type')).nativeElement.style.order).toBe('6')
    expect(fixture.debugElement.query(By.css('#mm-sec-unit')).nativeElement.style.order).toBe('0')
  })

  it("renders the jump-nav tabs inside the shared scroll rail (plan 350 — arrows are the rail's job)", () => {
    const rail = fixture.debugElement.query(By.css('app-scroll-rail.mm-jump-nav'))
    expect(rail).not.toBeNull()
    expect(rail.queryAll(By.css('.c-tab-pill')).length).toBe(12)
    expect(fixture.debugElement.query(By.css('.mm-jump-nav-arrow'))).toBeNull()
  })
})
