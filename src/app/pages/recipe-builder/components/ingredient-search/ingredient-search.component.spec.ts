import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { IngredientSearchComponent } from './ingredient-search.component'
import { LucideAngularModule, Search, X, ChevronUp, ChevronDown } from 'lucide-angular'

describe('IngredientSearchComponent', () => {
  let component: IngredientSearchComponent
  let fixture: ComponentFixture<IngredientSearchComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientSearchComponent, LucideAngularModule.pick({ Search, X, ChevronUp, ChevronDown })],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()

    fixture = TestBed.createComponent(IngredientSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('add option + keyboard (add-option rule)', () => {
    const key = (k: string): KeyboardEvent => new KeyboardEvent('keydown', { key: k, cancelable: true })

    it('with one typed letter the list shows only the add "<typed>" option', () => {
      component['onQueryInput']('ע')
      fixture.detectChanges()
      const root = fixture.nativeElement as HTMLElement
      const items = root.querySelectorAll('li[role="option"]')
      expect(items.length).toBe(1)
      expect(items[0].textContent?.trim()).toBe('add "ע"')
      expect(component['highlightedIndex_']()).toBe(0)
    })

    it('Enter on the add option opens quick-add prefilled with the typed name', () => {
      const spy = spyOn(component as unknown as { addNewProduct: () => Promise<void> }, 'addNewProduct').and.resolveTo()
      component['onQueryInput']('ע')
      component['onSearchKeydown'](key('ArrowDown'))
      expect(component['highlightedIndex_']()).toBe(0)
      component['onSearchKeydown'](key('Enter'))
      expect(spy).toHaveBeenCalled()
    })

    it('Enter with the list closed asks for a new row; Tab is never blocked', () => {
      const newRow = jasmine.createSpy('newRow')
      component.addNewRowRequested.subscribe(newRow)
      component['onSearchKeydown'](key('Enter'))
      expect(newRow).toHaveBeenCalled()
      component['onQueryInput']('ע')
      const tab = key('Tab')
      component['onSearchKeydown'](tab)
      expect(tab.defaultPrevented).toBeFalse()
    })
  })
})
