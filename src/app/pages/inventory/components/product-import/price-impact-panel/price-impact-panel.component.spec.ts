import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { PriceImpactPanelComponent, PriceImpactRow } from './price-impact-panel.component'

const row = (n: number, extra: Partial<PriceImpactRow> = {}): PriceImpactRow => ({
  id: `r${n}`,
  name: `מתכון ${n}`,
  isDish: false,
  before: 10,
  after: 10.32,
  changePct: 3.2,
  ...extra
})

describe('PriceImpactPanelComponent', () => {
  let fixture: ComponentFixture<PriceImpactPanelComponent>
  const render = (rows: PriceImpactRow[]) => {
    fixture.componentRef.setInput('rows', rows)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PriceImpactPanelComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (key: string) => key } }]
    })
    fixture = TestBed.createComponent(PriceImpactPanelComponent)
  })

  it('lists name, tag, before, after and the percent', () => {
    const el = render([row(1, { isDish: true })])
    const text = el.querySelector('[data-testid="price-impact-row"]')?.textContent ?? ''
    expect(text).toContain('מתכון 1')
    expect(text).toContain('dish')
    expect(text).toContain('₪10.00')
    expect(text).toContain('₪10.32')
    expect(text).toContain('+3.2%')
  })

  it('shows the first 30 rows and one closing line with the rest', () => {
    const el = render(Array.from({ length: 33 }, (_, n) => row(n)))
    expect(el.querySelectorAll('[data-testid="price-impact-row"]').length).toBe(30)
    expect(el.querySelector('[data-testid="price-impact-more"]')).not.toBeNull()
  })

  it('shows the one line when no recipe got dearer', () => {
    const el = render([])
    expect(el.querySelector('[data-testid="price-impact-none"]')?.textContent).toContain('price_impact_none')
    expect(el.querySelectorAll('[data-testid="price-impact-row"]').length).toBe(0)
  })
})
