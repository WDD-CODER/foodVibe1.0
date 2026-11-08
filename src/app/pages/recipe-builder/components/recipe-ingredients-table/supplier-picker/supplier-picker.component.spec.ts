import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import type { Product } from '@models/product.model'
import type { Supplier } from '@models/supplier.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ProductDataService } from '@services/product-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { SupplierPickerComponent } from './supplier-picker.component'

const SUPPLIERS: Supplier[] = [
  { _id: 'david', nameHebrew: 'דוד' } as Supplier,
  { _id: 'grocery', nameHebrew: 'מכולת' } as Supplier
]

function onion(extra: Partial<Product> = {}): Product {
  return {
    _id: 'onion',
    nameHebrew: 'בצל',
    baseUnit: 'kg',
    sources: [
      { supplierId: 'grocery', price: 5 },
      { supplierId: 'david', price: 4 }
    ],
    purchaseOptions: [],
    categories: [],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0,
    ...extra
  }
}

describe('SupplierPickerComponent (plan 510)', () => {
  let fixture: ComponentFixture<SupplierPickerComponent>
  let updateProduct: jasmine.Spy
  let picked: (string | null)[]

  function create(product: Product, canEdit = true): void {
    fixture = TestBed.createComponent(SupplierPickerComponent)
    picked = []
    fixture.componentInstance.picked.subscribe((id) => picked.push(id))
    fixture.componentRef.setInput('product', product)
    fixture.componentRef.setInput('canEdit', canEdit)
    fixture.detectChanges()
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement
  const trigger = (): HTMLButtonElement | null => el().querySelector('.supplier-picker__trigger')
  const rows = (): HTMLButtonElement[] => Array.from(el().querySelectorAll<HTMLButtonElement>('.supplier-picker__row'))

  function open(): void {
    trigger()!.click()
    fixture.detectChanges()
  }

  beforeEach(() => {
    updateProduct = jasmine.createSpy('updateProduct').and.resolveTo()
    TestBed.configureTestingModule({
      imports: [SupplierPickerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: KitchenStateService,
          useValue: { suppliersById_: signal(new Map(SUPPLIERS.map((s) => [s._id, s]))) }
        },
        { provide: ProductDataService, useValue: { updateProduct } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg']) },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'info']) }
      ]
    })
  })

  it('shows no truck when only one supplier prices the product', () => {
    create(
      onion({
        sources: [
          { supplierId: 'david', price: 4 },
          { supplierId: 'grocery', price: 0 }
        ]
      })
    )
    expect(trigger()).toBeNull()
  })

  it('lists the automatic option and each priced supplier; the cheapest is marked and checked', () => {
    create(onion())
    expect(trigger()!.title).toBe('דוד')
    open()
    const all = rows()
    expect(all.length).toBe(3)
    expect(all[0].getAttribute('aria-checked')).toBe('true')
    const david = all.find((r) => r.dataset['supplier'] === 'david')!
    expect(david.textContent).toContain('cheapest_supplier')
    expect(david.textContent).toContain('₪4 / kg')
    expect(david.getAttribute('aria-checked')).toBe('true')
    const grocery = all.find((r) => r.dataset['supplier'] === 'grocery')!
    expect(grocery.textContent).not.toContain('cheapest_supplier')
    expect(grocery.getAttribute('aria-checked')).toBe('false')
  })

  it('picking a supplier saves it on the product and closes the list', async () => {
    create(onion())
    open()
    rows()
      .find((r) => r.dataset['supplier'] === 'grocery')!
      .click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(updateProduct).toHaveBeenCalledWith(
      jasmine.objectContaining({ _id: 'onion', preferredSupplierId: 'grocery' })
    )
    expect(picked).toEqual(['grocery'])
    expect(rows().length).toBe(0)
  })

  it('the automatic option clears the choice (saved as an empty string)', async () => {
    create(onion({ preferredSupplierId: 'grocery' }))
    expect(trigger()!.title).toBe('מכולת')
    open()
    expect(rows()[0].getAttribute('aria-checked')).toBe('false')
    rows()[0].click()
    await fixture.whenStable()
    expect(updateProduct).toHaveBeenCalledWith(jasmine.objectContaining({ preferredSupplierId: '' }))
    expect(picked).toEqual([null])
  })

  it('staff see the current supplier but cannot change it', () => {
    create(onion({ preferredSupplierId: 'grocery' }), false)
    expect(trigger()!.title).toBe('מכולת')
    open()
    expect(rows().every((r) => r.disabled)).toBeTrue()
    expect(el().textContent).toContain('supplier_picker_owner_only')
    rows()[1].click()
    expect(updateProduct).not.toHaveBeenCalled()
  })
})
