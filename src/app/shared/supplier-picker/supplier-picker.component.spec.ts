import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import type { Product } from '@models/product.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { SupplierPickerComponent } from './supplier-picker.component'

const onion = (sources?: { supplierId: string; price: number }[]): Product =>
  ({
    _id: 'onion',
    nameHebrew: 'בצל',
    sources: sources ?? [
      { supplierId: 'grocery', price: 5 },
      { supplierId: 'shuk', price: 6 },
      { supplierId: 'david', price: 4 }
    ]
  }) as unknown as Product

describe('SupplierPickerComponent (plan 536)', () => {
  let fixture: ComponentFixture<SupplierPickerComponent>
  let picked: (string | null)[]

  const setup = (product: Product, value: string | null = null, canEdit = true): void => {
    fixture.componentRef.setInput('product', product)
    fixture.componentRef.setInput('value', value)
    fixture.componentRef.setInput('canEdit', canEdit)
    fixture.detectChanges()
  }
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement
  const btn = (): HTMLButtonElement => el().querySelector('.supplier-picker__btn') as HTMLButtonElement
  const openList = (): void => {
    btn().click()
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
                ['grocery', { _id: 'grocery', nameHebrew: 'מכולת' }],
                ['shuk', { _id: 'shuk', nameHebrew: 'שוק' }]
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
    setup(onion([{ supplierId: 'david', price: 4 }]))
    expect(btn()).toBeNull()
  })

  it('lists automatic first, then three suppliers sorted by price with the cheapest tagged', () => {
    setup(onion())
    openList()
    const r = rows()
    expect(r.length).toBe(4)
    expect(r[0].getAttribute('aria-selected')).toBe('true')
    expect(r.slice(1).map((x) => x.querySelector('.supplier-picker__name')?.textContent)).toEqual([
      'דוד',
      'מכולת',
      'שוק'
    ])
    expect(r[1].textContent).toContain('₪4')
    expect(r[1].textContent).toContain('cheapest_supplier')
    expect(r[2].textContent).not.toContain('cheapest_supplier')
  })

  it('emits the picked supplier and null for automatic', () => {
    setup(onion(), 'david')
    openList()
    rows()[3].click()
    expect(picked).toEqual(['shuk'])
    fixture.detectChanges()
    openList()
    rows()[0].click()
    expect(picked).toEqual(['shuk', null])
  })

  it('checks the chosen supplier', () => {
    setup(onion(), 'grocery')
    openList()
    expect(rows().map((r) => r.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true', 'false'])
  })

  it('a stale value shows automatic checked', () => {
    setup(onion(), 'gone')
    openList()
    expect(rows().map((r) => r.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false'])
  })

  it('shows the current supplier to staff, disables the rows and emits nothing', () => {
    setup(onion(), 'shuk', false)
    expect(btn().getAttribute('title')).toContain('שוק')
    openList()
    expect(rows().every((r) => r.disabled)).toBeTrue()
    rows()[2].click()
    expect(picked).toEqual([])
  })

  it('Escape closes the list, emits nothing, stops propagation and focuses the button', () => {
    setup(onion())
    openList()
    const outer = jasmine.createSpy('outer')
    document.addEventListener('keydown', outer)
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    rows()[0].dispatchEvent(ev)
    document.removeEventListener('keydown', outer)
    fixture.detectChanges()
    expect(el().querySelector('.supplier-picker__list')).toBeNull()
    expect(picked).toEqual([])
    expect(outer).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(btn())
  })

  it('Arrow Down moves to the next row', () => {
    setup(onion())
    openList()
    rows()[0].focus()
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(rows()[1])
  })

  it('placement clamps the list inside a 390x844 viewport', () => {
    setup(onion())
    const viewport = { width: 390, height: 844 }
    const panel = { width: 224, height: 200 }
    const nearEdge = fixture.componentInstance.placement(
      { top: 100, bottom: 124, left: 372, width: 24 },
      panel,
      viewport
    )
    expect(nearEdge.left).toBeGreaterThanOrEqual(8)
    expect(nearEdge.left + panel.width).toBeLessThanOrEqual(viewport.width - 8)
    const nearBottom = fixture.componentInstance.placement(
      { top: 800, bottom: 824, left: 20, width: 24 },
      panel,
      viewport
    )
    expect(nearBottom.top).toBeGreaterThanOrEqual(8)
    expect(nearBottom.top + panel.height).toBeLessThanOrEqual(viewport.height - 8)
    const tall = fixture.componentInstance.placement(
      { top: 100, bottom: 124, left: 20, width: 24 },
      { width: 224, height: 2000 },
      viewport
    )
    expect(tall.maxHeight).not.toBeNull()
  })
})
