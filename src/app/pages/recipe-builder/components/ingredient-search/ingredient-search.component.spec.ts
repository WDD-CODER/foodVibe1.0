import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { IngredientSearchComponent } from './ingredient-search.component'
import { LucideAngularModule, Search, X, ChevronUp, ChevronDown } from 'lucide-angular'

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
})
