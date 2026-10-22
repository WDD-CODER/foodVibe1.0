import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { Router } from '@angular/router'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import type { Product } from '@models/product.model'
import { ProductNameSuggestionsComponent } from './product-name-suggestions.component'

describe('ProductNameSuggestionsComponent', () => {
  let fixture: ComponentFixture<ProductNameSuggestionsComponent>
  let router: jasmine.SpyObj<Router>
  const products_ = signal<Product[]>([])

  const names = (...list: string[]): Product[] => list.map((n, i) => ({ _id: `p${i}`, nameHebrew: n }) as Product)
  const rows = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.name-suggestions__list .c-chip')).map((b) =>
      (b.textContent ?? '').trim()
    )

  function show(query: string, currentId: string | null = null): void {
    fixture.componentRef.setInput('query', query)
    fixture.componentRef.setInput('currentId', currentId)
    fixture.detectChanges()
  }

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate'])
    router.navigate.and.resolveTo(true)
    products_.set(
      names('עגבניה', 'עגבניות שרי', 'בצל', 'מיץ עגבניות', 'עגבנייה מיובשת', 'עגבניה ירוקה', 'עגבניה מרוסקת')
    )
    await TestBed.configureTestingModule({
      imports: [ProductNameSuggestionsComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: KitchenStateService, useValue: { products_ } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(ProductNameSuggestionsComponent)
  })

  it('lists nothing for fewer than 2 letters', () => {
    show('ע')
    expect(rows()).toEqual([])
  })

  it('lists at most 5 matches, those starting with the text first', () => {
    show('עגב')
    const found = rows()
    expect(found.length).toBe(5)
    expect(found).not.toContain('בצל')
    expect(found).not.toContain('מיץ עגבניות')
  })

  it('lists the exact match too', () => {
    show('עגבניה')
    expect(rows()).toContain('עגבניה')
  })

  it('never suggests the product being edited', () => {
    show('בצל', 'p2')
    expect(rows()).toEqual([])
  })

  it('opens the product on click', () => {
    show('בצל')
    ;(fixture.nativeElement.querySelector('.name-suggestions__list .c-chip') as HTMLButtonElement).click()
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/edit', 'p2'])
  })

  it('hides the list on Escape until the text changes', () => {
    show('בצל')
    fixture.nativeElement
      .querySelector('.name-suggestions')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    fixture.detectChanges()
    expect(rows()).toEqual([])
    show('בצ')
    expect(rows()).toEqual(['בצל'])
  })
})
