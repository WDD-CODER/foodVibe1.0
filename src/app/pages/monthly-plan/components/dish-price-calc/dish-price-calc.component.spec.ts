import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { DishPriceCalcComponent } from './dish-price-calc.component'

describe('DishPriceCalcComponent (plan 728)', () => {
  let fixture: ComponentFixture<DishPriceCalcComponent>
  const byId = (id: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`)

  async function setup(dealerType: 'murshe' | 'patur'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [DishPriceCalcComponent],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translate: (k: string) =>
              ({
                mp_dish_net: '{{net}} ₪ לפני מע״מ',
                mp_dish_gross: '{{gross}} ₪ כולל מע״מ',
                mp_dish_rule: 'יעד {{pct}}%'
              })[k] ?? k
          }
        }
      ]
    })
    fixture = TestBed.createComponent(DishPriceCalcComponent)
    fixture.componentRef.setInput('foodTargetPct', 30)
    fixture.componentRef.setInput('vatRatePct', 18)
    fixture.componentRef.setInput('dealerType', dealerType)
    fixture.detectChanges()
    await fixture.whenStable()
    const input = byId('dpc-cost') as HTMLInputElement
    input.value = '5'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  it('murshe: shows net and with VAT', async () => {
    await setup('murshe')
    expect(byId('dpc-net')!.textContent).toContain('16.67 ₪ לפני מע״מ')
    expect(byId('dpc-gross')!.textContent).toContain('19.67 ₪ כולל מע״מ')
    expect(byId('dpc-rule')!.textContent).toContain('30')
  })

  it('patur: shows net only', async () => {
    await setup('patur')
    expect(byId('dpc-net')!.textContent).toContain('16.67')
    expect(byId('dpc-gross')).toBeNull()
  })
})
