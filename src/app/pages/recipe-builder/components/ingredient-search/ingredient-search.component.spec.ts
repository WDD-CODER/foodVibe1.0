import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { IngredientSearchComponent } from './ingredient-search.component'
import { LucideAngularModule, Search, X, ChevronUp, ChevronDown } from 'lucide-angular'
import { ProductDataService } from '@services/product-data.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import type { Product } from '@models/product.model'

describe('IngredientSearchComponent', () => {
  let component: IngredientSearchComponent
  let fixture: ComponentFixture<IngredientSearchComponent>

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement
  const field = (): HTMLInputElement => root().querySelector('input')!

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
    function type(text: string): void {
      field().value = text
      field().dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }

    function press(key: string): KeyboardEvent {
      const e = new KeyboardEvent('keydown', { key, cancelable: true })
      field().dispatchEvent(e)
      fixture.detectChanges()
      return e
    }

    it('with one typed letter the list shows only the add "<typed>" option', () => {
      type('ע')
      const items = root().querySelectorAll('li[role="option"]')
      expect(items.length).toBe(1)
      expect(items[0].textContent?.trim()).toBe('add "ע"')
      expect(items[0].classList).toContain('is-highlighted')
    })

    it('Enter on the add option opens quick-add prefilled with the typed name', () => {
      const spy = spyOn(
        component as unknown as { addNewProduct: (typed: string) => Promise<void> },
        'addNewProduct'
      ).and.resolveTo()
      type('ע')
      press('ArrowDown')
      expect(root().querySelector('li[role="option"]')?.classList).toContain('is-highlighted')
      press('Enter')
      expect(spy).toHaveBeenCalledWith('ע')
    })

    it('Enter with the list closed asks for a new row; Tab is never blocked', () => {
      const newRow = jasmine.createSpy('newRow')
      component.addNewRowRequested.subscribe(newRow)
      press('Enter')
      expect(newRow).toHaveBeenCalled()
      type('ע')
      const tab = press('Tab')
      expect(tab.defaultPrevented).toBeFalse()
    })

    it('Escape asks the parent to cancel the edit, with the list open or closed', () => {
      const cancel = jasmine.createSpy('cancel')
      component.cancelSearch.subscribe(cancel)
      press('Escape')
      type('ע')
      press('Escape')
      expect(cancel).toHaveBeenCalledTimes(2)
    })
  })

  // Plan 490 - a not-ready row's inventory options are listed first, marked, while the query is the opening one.
  describe('suggestions (plan 490)', () => {
    const product = (_id: string, nameHebrew: string): Product =>
      ({ _id, nameHebrew, baseUnit: 'gram' }) as unknown as Product
    const ids = (): string[] =>
      (component as unknown as { listedOptions_: () => { _id: string }[] }).listedOptions_().map((x) => x._id)

    beforeEach(() => {
      spyOn(TestBed.inject(ProductDataService), 'searchProducts').and.resolveTo([
        product('p2', 'מלח גס'),
        product('p9', 'salty crackers')
      ])
      spyOn(TestBed.inject(RecipeDataService), 'searchRecipes').and.resolveTo([])
    })

    /** The query reaches the debounced server search through effects: settle them, wait the debounce, settle again. */
    function settle(): void {
      fixture.detectChanges()
      TestBed.flushEffects()
      tick(300)
      flush()
      fixture.detectChanges()
    }

    /** Created inside fakeAsync so the debounce timer of the server search is a fake one. */
    function open(): void {
      fixture.destroy()
      fixture = TestBed.createComponent(IngredientSearchComponent)
      component = fixture.componentInstance
      fixture.componentRef.setInput('suggestions', [product('p1', 'מלח שולחן'), product('p2', 'מלח גס')])
      fixture.componentRef.setInput('initialQuery', 'salt')
      fixture.detectChanges()
      settle()
    }

    it('lists the suggestions first, then server results without the same product', fakeAsync(() => {
      open()
      expect(ids()).toEqual(['p1', 'p2', 'p9'])
      const options = root().querySelectorAll('li[role="option"]')
      expect(options[0].querySelector('.c-chip--amber')).not.toBeNull()
      expect(options[2].querySelector('.c-chip--amber')).toBeNull()
      expect(options[options.length - 1].textContent).toContain('salt')
    }))

    it('drops the suggestions once the user types something else', fakeAsync(() => {
      open()
      field().value = 'מלח'
      field().dispatchEvent(new Event('input'))
      settle()
      expect(ids()).toEqual(['p2', 'p9'])
    }))

    it('the add option opens quick-add prefilled, and cancelling it selects nothing', fakeAsync(() => {
      const openModal = spyOn(TestBed.inject(QuickAddProductModalService), 'open').and.resolveTo(null)
      open()
      const picked = jasmine.createSpy('picked')
      component.itemSelected.subscribe(picked)
      void (component as unknown as { addNewProduct: (t: string) => Promise<void> }).addNewProduct('salt')
      flush()
      expect(openModal).toHaveBeenCalledWith({ prefillName: 'salt' })
      expect(picked).not.toHaveBeenCalled()
    }))
  })
})
