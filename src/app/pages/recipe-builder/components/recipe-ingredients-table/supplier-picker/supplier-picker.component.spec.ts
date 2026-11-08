import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import type { Product } from '@models/product.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { SupplierPickerComponent } from './supplier-picker.component'

const onion = (extra: Record<string, unknown> = {}): Product =>
  ({
    _id: 'onion',
    nameHebrew: 'בצל',
    sources: [
      { supplierId: 'grocery', price: 5 },
      { supplierId: 'david', price: 4 }
    ],
    ...extra
  }) as unknown as Product

describe('SupplierPickerComponent (plan 510)', () => {
  let fixture: ComponentFixture<SupplierPickerComponent>
  let picked: (string | null)[]

  const setup = (product: Product, canEdit = true): void => {
    fixture.componentRef.setInput('product', product)
    fixture.componentRef.setInput('canEdit', canEdit)
    fixture.detectChanges()
  }
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement
  const openList = (): void => {
    ;(el().querySelector('.supplier-picker__btn') as HTMLButtonElement).click()
    fixture.detectChanges()
  }
  const rows = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('.supplier-picker__row'))

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplierPickerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: KitchenStateService,
          useValue: {
            suppliersById_: signal(
              new Map([
                ['david', { _id: 'david', nameHebrew: 'דוד' }],
                ['grocery', { _id: 'grocery', nameHebrew: 'מכולת' }]
              ])
            )
          }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    fixture = TestBed.createComponent(SupplierPickerComponent)
    picked = []
    fixture.componentInstance.picked.subscribe((v) => picked.push(v))
  })

  it('shows no icon for a product with one priced supplier', () => {
    setup(onion({ sources: [{ supplierId: 'david', price: 4 }] }))
    expect(el().querySelector('.supplier-picker__btn')).toBeNull()
  })

  it('lists the cheapest first, marks it, and checks the automatic option by default', () => {
    setup(onion())
    openList()
    const r = rows()
    expect(r.length).toBe(3)
    expect(r[0].getAttribute('aria-selected')).toBe('true')
    expect(r[1].textContent).toContain('דוד')
    expect(r[1].textContent).toContain('₪4')
    expect(r[1].textContent).toContain('cheapest_supplier')
    expect(r[2].textContent).toContain('מכולת')
    expect(r[2].textContent).not.toContain('cheapest_supplier')
  })

  it('emits the picked supplier and null for automatic', () => {
    setup(onion({ preferredSupplierId: 'david' }))
    openList()
    rows()[2].click()
    expect(picked).toEqual(['grocery'])
    fixture.detectChanges()
    openList()
    rows()[0].click()
    expect(picked).toEqual(['grocery', null])
  })

  it('checks the chosen supplier', () => {
    setup(onion({ preferredSupplierId: 'grocery' }))
    openList()
    expect(rows().map((r) => r.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true'])
  })

  it('shows the icon but changes nothing for staff', () => {
    setup(onion(), false)
    expect(el().querySelector('.supplier-picker__btn')?.getAttribute('title')).toContain('דוד')
    openList()
    expect(rows().every((r) => r.disabled)).toBeTrue()
    rows()[2].click()
    expect(picked).toEqual([])
  })
})
