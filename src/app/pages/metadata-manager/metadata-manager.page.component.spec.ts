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

describe('MetadataManagerPageComponent', () => {
  let component: MetadataManagerComponent
  let fixture: ComponentFixture<MetadataManagerComponent>

  // LOGIC CHANGE: Standardized English keys for Mock Signals
  const mockUnits = signal(['gram', 'ml'])
  const mockAllergens = signal(['gluten', 'nuts'])
  const mockCategories = signal(['vegetables', 'meat'])
  const mockLabels = signal([{ key: 'label1', color: '#ccc' }])
  const mockMenuTypes = signal<{ key: string }[]>([])
  const mockProducts = signal([])

  beforeEach(async () => {
    // Mocking Services
    // REPLACEMENT: Changed 'allUnits_' to 'allUnitKeys_' to match the refactored Service
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'registerUnit'], {
      allUnitKeys_: mockUnits
    })
    unitRegistrySpy.getConversion.and.returnValue(1)

    const metadataRegistrySpy = jasmine.createSpyObj('MetadataRegistryService', ['registerAllergen', 'getLabelColor'], {
      allAllergens_: mockAllergens,
      allCategories_: mockCategories,
      allLabels_: mockLabels,
      allMenuTypes_: mockMenuTypes
    })
    metadataRegistrySpy.getLabelColor.and.returnValue('#999')

    const productDataSpy = jasmine.createSpyObj('ProductDataService', [], {
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
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(MetadataManagerComponent)
    component = fixture.componentInstance

    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should identify system units via isSystemUnit', () => {
    expect(component.isSystemUnit('gram')).toBe(true)
    expect(component.isSystemUnit('kg')).toBe(true)
    expect(component.isSystemUnit('dish')).toBe(true)
    expect(component.isSystemUnit('jar')).toBe(false)
  })

  // --- Mobile/tablet jump nav ---

  const JUMP_SECTION_IDS = [
    'mm-sec-unit',
    'mm-sec-category',
    'mm-sec-allergen',
    'mm-sec-label',
    'mm-sec-menu-type',
    'mm-sec-preparation',
    'mm-sec-section',
    'mm-sec-user'
  ]

  it('should render exactly 8 jump-nav tabs in page order', () => {
    const tabs = fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill'))
    expect(tabs.length).toBe(8)
    expect(tabs.map((t) => t.nativeElement.textContent.trim())).toEqual([
      'metadata_units_and_conversions_title',
      'metadata_product_categories_title',
      'metadata_global_allergens_title',
      'metadata_recipe_labels_title',
      'metadata_menu_types_title',
      'metadata_prep_categories',
      'metadata_section_categories_title',
      'user_management'
    ])
  })

  it('should give each of the 8 sections a matching stable id', () => {
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
    const tab = fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill'))[4] // Menu Types
    tab.nativeElement.click()
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('#mm-sec-menu-type')).nativeElement.style.order).toBe('0')
    expect(tab.nativeElement.classList.contains('active')).toBeTrue()
    // Everyone else keeps their natural relative order.
    expect(fixture.debugElement.query(By.css('#mm-sec-unit')).nativeElement.style.order).toBe('1')
    expect(fixture.debugElement.query(By.css('#mm-sec-user')).nativeElement.style.order).toBe('8')
  })

  it('should swap directly to a different section when its tab is clicked while another is front', () => {
    const tabs = fixture.debugElement.queryAll(By.css('.mm-jump-nav .c-tab-pill'))
    tabs[4].nativeElement.click() // Menu Types
    fixture.detectChanges()
    tabs[0].nativeElement.click() // Units
    fixture.detectChanges()

    expect(fixture.debugElement.query(By.css('#mm-sec-menu-type')).nativeElement.style.order).toBe('5')
    expect(fixture.debugElement.query(By.css('#mm-sec-unit')).nativeElement.style.order).toBe('0')
  })

  it('should show tablet-only prev/next arrows that scroll the jump-nav row', () => {
    const nav = fixture.debugElement.query(By.css('.mm-jump-nav')).nativeElement
    spyOn(nav, 'scrollBy')
    fixture.debugElement.query(By.css('.mm-jump-nav-arrow--next')).nativeElement.click()
    expect(nav.scrollBy).toHaveBeenCalledWith(
      jasmine.objectContaining({ left: jasmine.any(Number), behavior: 'smooth' })
    )
    const nextArg = (nav.scrollBy as jasmine.Spy).calls.mostRecent().args[0]
    expect(nextArg.left).toBeGreaterThan(0)

    fixture.debugElement.query(By.css('.mm-jump-nav-arrow--prev')).nativeElement.click()
    const prevArg = (nav.scrollBy as jasmine.Spy).calls.mostRecent().args[0]
    expect(prevArg.left).toBeLessThan(0)
  })

  it('should hide the prev/next arrow once there is nothing left to scroll to on that side', () => {
    const nav = fixture.debugElement.query(By.css('.mm-jump-nav')).nativeElement
    const prevBtn = fixture.debugElement.query(By.css('.mm-jump-nav-arrow--prev')).nativeElement
    const nextBtn = fixture.debugElement.query(By.css('.mm-jump-nav-arrow--next')).nativeElement
    const stub = (scrollLeft: number, scrollWidth: number, clientWidth: number) => {
      Object.defineProperty(nav, 'scrollLeft', { value: scrollLeft, configurable: true })
      Object.defineProperty(nav, 'scrollWidth', { value: scrollWidth, configurable: true })
      Object.defineProperty(nav, 'clientWidth', { value: clientWidth, configurable: true })
      ;(component as unknown as { updateJumpNavScrollState: () => void }).updateJumpNavScrollState()
      fixture.detectChanges()
    }

    // At the very start — nothing to scroll back to, more ahead.
    stub(0, 600, 300)
    expect(prevBtn.classList.contains('mm-jump-nav-arrow--hidden')).toBeTrue()
    expect(nextBtn.classList.contains('mm-jump-nav-arrow--hidden')).toBeFalse()

    // Scrolled to the middle — both directions available.
    stub(-150, 600, 300)
    expect(prevBtn.classList.contains('mm-jump-nav-arrow--hidden')).toBeFalse()
    expect(nextBtn.classList.contains('mm-jump-nav-arrow--hidden')).toBeFalse()

    // Fully scrolled to the end — nothing further ahead.
    stub(-300, 600, 300)
    expect(prevBtn.classList.contains('mm-jump-nav-arrow--hidden')).toBeFalse()
    expect(nextBtn.classList.contains('mm-jump-nav-arrow--hidden')).toBeTrue()
  })
})
