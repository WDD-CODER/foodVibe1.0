import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import type { Product } from '@models/product.model'
import { SupplierPickerComponent } from './supplier-picker.component'

describe('SupplierPickerComponent (plan 510)', () => {
  let fixture: ComponentFixture<SupplierPickerComponent>
  let picks: string[]

  const suppliers = new Map([
    ['d', { _id: 'd', nameHebrew: 'דוד' }],
    ['g', { _id: 'g', nameHebrew: 'מכולת' }]
  ])
  const product = (extra: Partial<Product> = {}): Product =>
    ({
      _id: 'p',
      sources: [
        { supplierId: 'g', price: 5 },
        { supplierId: 'd', price: 4 }
      ],
      ...extra
    }) as Product

  function setup(p: Product, canEdit: boolean): void {
    fixture.componentRef.setInput('product', p)
    fixture.componentRef.setInput('canEdit', canEdit)
    fixture.detectChanges()
  }
  const el = (): HTMLElement => fixture.nativeElement
  const open = (): void => {
    ;(el().querySelector('.supplier-picker__btn') as HTMLButtonElement).click()
    fixture.detectChanges()
  }
  const rowsOf = (): HTMLButtonElement[] =>
    Array.from(el().querySelectorAll('.supplier-picker__row')) as HTMLButtonElement[]

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplierPickerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: KitchenStateService, useValue: { suppliersById_: () => suppliers } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    fixture = TestBed.createComponent(SupplierPickerComponent)
    picks = []
    fixture.componentInstance.picked.subscribe((id) => picks.push(id))
  })

  it('shows no icon for a product with one priced supplier', () => {
    setup(product({ sources: [{ supplierId: 'd', price: 4 }] }), true)
    expect(el().querySelector('.supplier-picker__btn')).toBeNull()
  })

  it('lists suppliers cheapest first, marks the cheapest and checks the automatic option', () => {
    setup(product(), true)
    open()
    const rows = rowsOf()
    expect(rows.length).toBe(3)
    expect(rows[0].textContent).toContain('✓')
    expect(rows[1].textContent).toContain('דוד')
    expect(rows[1].textContent).toContain('supplier_cheapest')
    expect(rows[2].textContent).toContain('מכולת')
    expect(rows[2].textContent).not.toContain('✓')
  })

  it('checks the chosen supplier and emits the pick; the automatic option emits an empty id', () => {
    setup(product({ preferredSupplierId: 'g' }), true)
    expect(el().querySelector('.supplier-picker__btn')?.getAttribute('title')).toBe('מכולת')
    open()
    expect(rowsOf()[2].textContent).toContain('✓')
    rowsOf()[1].click()
    expect(picks).toEqual(['d'])
    open()
    ;(el().querySelector('.supplier-picker__auto') as HTMLButtonElement).click()
    expect(picks).toEqual(['d', ''])
  })

  it('treats a removed chosen supplier as automatic', () => {
    setup(product({ preferredSupplierId: 'gone' }), true)
    open()
    expect(el().querySelector('.supplier-picker__auto')?.textContent).toContain('✓')
  })

  it('staff: the list shows but its rows are disabled', () => {
    setup(product({ preferredSupplierId: 'g' }), false)
    open()
    const rows = rowsOf()
    expect(rows.every((r) => r.disabled)).toBeTrue()
    rows[1].click()
    expect(picks).toEqual([])
  })
})
