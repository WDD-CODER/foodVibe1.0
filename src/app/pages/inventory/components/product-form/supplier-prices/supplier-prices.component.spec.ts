import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap } from '@angular/router'
import { KitchenStateService } from '@services/kitchen-state.service'
import type { Product } from '@models/product.model'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { SupplierPricesComponent } from './supplier-prices.component'
import type { SupplierPrices } from './supplier-prices.util'

describe('SupplierPricesComponent', () => {
  let fixture: ComponentFixture<SupplierPricesComponent>
  let emitted: SupplierPrices[]
  const products = signal<Product[]>([])

  const setup = (ids: string[], prices: SupplierPrices, seed = 0): void => {
    fixture.componentRef.setInput('supplierIds', ids)
    fixture.componentRef.setInput('prices', prices)
    fixture.componentRef.setInput('seed', seed)
    fixture.detectChanges()
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplierPricesComponent],
      providers: [
        { provide: PermissionService, useValue: { isStaff_: () => false, can: () => true } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: KitchenStateService, useValue: { products_: products } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } } }
      ]
    })
    products.set([])
    fixture = TestBed.createComponent(SupplierPricesComponent)
    emitted = []
    fixture.componentInstance.pricesChange.subscribe((p) => emitted.push(p))
  })

  it('renders one box per supplier with the waiting placeholder when empty', () => {
    setup(['a', 'b'], { a: 4, b: null })
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>
    expect(inputs.length).toBe(2)
    expect(inputs[0].value).toBe('4')
    expect(inputs[1].placeholder).toBe('waiting_for_price')
  })

  it('pre-fills a supplier that has no row from the first row', () => {
    setup(['a', 'b'], { a: 4 })
    expect(emitted.at(-1)).toEqual({ a: 4, b: 4 })
  })

  it('emits the edited price of one row only', () => {
    setup(['a', 'b'], { a: 4, b: 5 })
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>
    inputs[1].value = '6'
    inputs[1].dispatchEvent(new Event('change'))
    expect(emitted.at(-1)).toEqual({ a: 4, b: 6 })
  })

  it('marks the chosen supplier row (plan 510)', () => {
    fixture.componentRef.setInput('preferredSupplierId', 'b')
    setup(['a', 'b'], { a: 4, b: 5 })
    const marks = fixture.nativeElement.querySelectorAll('.supplier-prices__chosen')
    expect(marks.length).toBe(1)
    expect(marks[0].closest('app-form-field').textContent).toContain('supplier_chosen')
    expect(fixture.nativeElement.querySelectorAll('app-form-field')[0].textContent).not.toContain('supplier_chosen')
  })

  it('reads the chosen supplier from the edited product and follows a later pick (plan 510)', () => {
    products.set([{ _id: 'p1', preferredSupplierId: 'a' } as Product])
    setup(['a', 'b'], { a: 4, b: 5 })
    const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('app-form-field'))
    expect(rows()[0].textContent).toContain('supplier_chosen')
    expect(rows()[1].textContent).not.toContain('supplier_chosen')
    products.set([{ _id: 'p1', preferredSupplierId: 'b' } as Product])
    fixture.detectChanges()
    expect(rows()[0].textContent).not.toContain('supplier_chosen')
    expect(rows()[1].textContent).toContain('supplier_chosen')
  })

  it('shows no mark when the product follows the cheapest (plan 510)', () => {
    products.set([{ _id: 'p1' } as Product])
    setup(['a', 'b'], { a: 4, b: 5 })
    expect(fixture.nativeElement.querySelectorAll('.supplier-prices__chosen').length).toBe(0)
  })
})
