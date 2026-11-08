import { ComponentFixture, TestBed } from '@angular/core/testing'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { SupplierPricesComponent } from './supplier-prices.component'
import type { SupplierPrices } from './supplier-prices.util'

describe('SupplierPricesComponent', () => {
  let fixture: ComponentFixture<SupplierPricesComponent>
  let emitted: SupplierPrices[]

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
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
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
})
