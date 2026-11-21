import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FileText, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Diagnosis } from '@schemas/entities'
import { BusinessService } from '@services/business.service'
import { DishDataService } from '@services/dish-data.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { TranslationService } from '@services/translation.service'
import { DiagReportComponent } from './diag-report.component'

const DISHES = [
  { _id: 'd1', nameHebrew: 'פסטה', recipeType: 'dish', cost: 35, partial: false, yieldAmount: 1 },
  { _id: 'd2', nameHebrew: 'סלט', recipeType: 'dish', cost: 10, partial: true, yieldAmount: 1 },
  { _id: 'd3', nameHebrew: 'מרק', recipeType: 'dish', cost: 20, partial: false, yieldAmount: 2 }
]

const diagnosis = (extra: Partial<Diagnosis> = {}): Diagnosis =>
  ({
    _id: 'g1',
    name: 'G',
    periodDays: 60,
    menu: [],
    pricesIncludeVat: false,
    vatPct: 18,
    invoiceIds: [],
    status: 'open',
    ...extra
  }) as unknown as Diagnosis

describe('DiagReportComponent', () => {
  let fixture: ComponentFixture<DiagReportComponent>
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const all = (id: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`))

  function setup(d: Diagnosis, volatility: unknown[] = []): void {
    const byDish = (r: { _id: string }) => DISHES.find((x) => x._id === r._id)!
    TestBed.configureTestingModule({
      imports: [DiagReportComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FileText })],
      providers: [
        { provide: DishDataService, useValue: { allDishes_: signal(DISHES) } },
        {
          provide: RecipeCostService,
          useValue: {
            computeRecipeCostStatus: (r: { _id: string }) => ({
              cost: byDish(r).cost,
              partial: byDish(r).partial,
              missing: []
            }),
            getRecipeCostPerUnit: (r: { _id: string }) => byDish(r).cost / byDish(r).yieldAmount
          }
        },
        { provide: BusinessService, useValue: { business_: () => ({ settings: { profitTargetPct: 30 } }) } },
        {
          provide: KitchenStateService,
          useValue: {
            products_: signal([{ _id: 'p1', nameHebrew: 'שמן' }]),
            suppliers_: signal([{ _id: 's1', nameHebrew: 'ספק' }])
          }
        },
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'diag_finding_top_price_move' ? '{name} moved {value}' : k) }
        }
      ]
    })
    fixture = TestBed.createComponent(DiagReportComponent)
    fixture.componentRef.setInput('diagnosis', d)
    fixture.componentRef.setInput('volatility', volatility)
    fixture.detectChanges()
  }

  it('a dish under the target shows the under-target tag', () => {
    setup(diagnosis({ menu: [{ name: 'פסטה', sellPrice: 40, dishId: 'd1' }] }))
    expect(all('diag-under-target').length).toBe(1)
    expect(all('diag-dish-row')[0].textContent).toContain('diag_under_target')
  })

  it('a row without a cost shows no-cost and a dash for the suggested price', () => {
    setup(
      diagnosis({
        menu: [
          { name: 'סלט', sellPrice: 30, dishId: 'd2' },
          { name: 'חופשי', sellPrice: 10 }
        ]
      })
    )
    expect(all('diag-no-cost').length).toBe(2)
    expect(all('diag-suggested').map((c) => c.textContent?.trim())).toEqual(['—', '—'])
  })

  it('the price-without-VAT column and the note follow the switch; the suggested price is the shared function’s', () => {
    setup(diagnosis({ pricesIncludeVat: true, vatPct: 18, menu: [{ name: 'פסטה', sellPrice: 118, dishId: 'd1' }] }))
    expect(byId('diag-col-net')).not.toBeNull()
    expect(byId('diag-vat-note')!.textContent).toContain('diag_vat_note_on')
    // 35 / (1 - 0.30) * 1.18 = 59
    expect(byId('diag-suggested')!.textContent).toContain('59.00')
    fixture.componentRef.setInput(
      'diagnosis',
      diagnosis({ pricesIncludeVat: false, menu: [{ name: 'פסטה', sellPrice: 118, dishId: 'd1' }] })
    )
    fixture.detectChanges()
    expect(byId('diag-col-net')).toBeNull()
    expect(byId('diag-vat-note')!.textContent).toContain('diag_vat_note_off')
    expect(byId('diag-suggested')!.textContent).toContain('50.00')
  })

  it('costByDishId holds the per-portion cost only for a linked dish whose cost is complete', () => {
    setup(
      diagnosis({
        menu: [
          { name: 'פסטה', sellPrice: 40, dishId: 'd1' },
          { name: 'סלט', sellPrice: 30, dishId: 'd2' },
          { name: 'מרק', sellPrice: 30, dishId: 'd3' }
        ]
      })
    )
    expect(fixture.componentInstance.costByDishId()).toEqual({ d1: 35, d3: 10 })
  })

  it('lists the price movements, and the empty line when there are none', () => {
    setup(diagnosis({ menu: [{ name: 'פסטה', sellPrice: 40, dishId: 'd1' }] }), [
      { productId: 'p1', supplierId: 's1', min: 10, max: 12, movePct: 20, points: 3 }
    ])
    expect(all('diag-move-row').length).toBe(1)
    expect(all('diag-move-row')[0].textContent).toContain('שמן')
    expect(byId('diag-findings')!.textContent).toContain('שמן moved 20')
  })

  it('shows the empty line without moves and the empty state without a menu', () => {
    setup(diagnosis({ menu: [{ name: 'פסטה', sellPrice: 40, dishId: 'd1' }] }))
    expect(byId('diag-volatility-empty')).not.toBeNull()
    fixture.componentRef.setInput('diagnosis', diagnosis())
    fixture.detectChanges()
    expect(byId('diag-report-empty')).not.toBeNull()
  })
})
