import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ListChecks, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Product } from '@models/product.model'
import { TranslationService } from '@services/translation.service'
import { StockBelowMinimumComponent } from './stock-below-minimum.component'

const row = (id: string, qty: number) => ({
  product: { _id: id, nameHebrew: `מוצר ${id}`, baseUnit: 'kg' } as unknown as Product,
  baseQuantity: qty,
  minStockLevel: 10,
  countedAt: new Date(2026, 10, 5, 12).getTime()
})

describe('StockBelowMinimumComponent', () => {
  let fixture: ComponentFixture<StockBelowMinimumComponent>
  const el = () => fixture.nativeElement as HTMLElement

  function setup(inputs: { rows: ReturnType<typeof row>[]; uncounted?: number; hasFinalCount?: boolean }): void {
    TestBed.configureTestingModule({
      imports: [StockBelowMinimumComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks })],
      providers: [
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'stk_uncounted_note' ? '{n} ללא ספירה' : k) }
        }
      ]
    })
    fixture = TestBed.createComponent(StockBelowMinimumComponent)
    fixture.componentRef.setInput('rows', inputs.rows)
    fixture.componentRef.setInput('uncounted', inputs.uncounted ?? 0)
    fixture.componentRef.setInput('hasFinalCount', inputs.hasFinalCount ?? true)
    fixture.detectChanges()
  }

  it('lists a row with name, quantities and date', () => {
    setup({ rows: [row('a', 4)] })
    const text = el().querySelector('[data-testid="stk-below-row"]')?.textContent ?? ''
    expect(text).toContain('מוצר a')
    expect(text).toContain('4 kg')
    expect(text).toContain('10 kg')
    expect(text).toContain('05/11/2026')
  })

  it('shows the no-final-count state', () => {
    setup({ rows: [], hasFinalCount: false })
    expect(el().querySelector('[data-testid="stk-no-final"]')).not.toBeNull()
  })

  it('shows the nothing-below state', () => {
    setup({ rows: [] })
    expect(el().querySelector('[data-testid="stk-empty-below"]')).not.toBeNull()
  })

  it('shows the uncounted note only when there are uncounted products', () => {
    setup({ rows: [row('a', 4)], uncounted: 3 })
    expect(el().querySelector('[data-testid="stk-uncounted-note"]')?.textContent).toContain('3 ללא ספירה')
  })
})
