import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { ChevronDown, ChevronUp, LucideAngularModule, SquareDashed, Trash2 } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { TipDirective } from 'src/app/shared/tip/tip.directive'
import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import { ZonePanelComponent } from './zone-panel.component'

const DICT: Record<string, string> = {
  fp_zone_none: 'האזור עוד לא מסומן על המפה',
  fp_zone_draw: 'סימון על המפה',
  fp_zone_clear: 'הסרת הסימון',
  fp_area_has_tables: 'יש שולחנות באזור הזה',
  fp_zone_count: '{count} שולחנות באזור'
}

const table: FloorTable = {
  key: 'tab001',
  number: '1',
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x: 0,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
}

const PLAN: FloorPlanBody = {
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'areaa1', name: 'בפנים', order: 0, color: 0 },
    { key: 'areab2', name: 'בחוץ', order: 1, color: 1 }
  ],
  tables: [table],
  joins: []
}

const ZONED: FloorPlanBody = {
  ...PLAN,
  areas: [PLAN.areas[0], { ...PLAN.areas[1], zone: { x: 2, y: 2, w: 6, h: 4 } }]
}

describe('ZonePanelComponent (plan 700)', () => {
  let fixture: ComponentFixture<ZonePanelComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const q = <T extends HTMLElement>(sel: string): T[] => Array.from(el().querySelectorAll<T>(sel))

  function open(plan: FloorPlanBody, areaKey: string): void {
    fixture.componentRef.setInput('plan', plan)
    fixture.componentRef.setInput('areaKey', areaKey)
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ZonePanelComponent,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ChevronDown, ChevronUp, SquareDashed, Trash2 })
      ],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => DICT[k ?? ''] ?? k ?? '' } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(ZonePanelComponent)
  })

  it('shows fp_err_area_name for a name another area has and emits nothing; a valid name emits renamed', () => {
    open(PLAN, 'areab2')
    const renamed: { key: string; name: string }[] = []
    fixture.componentInstance.renamed.subscribe((r) => renamed.push(r))
    const input = q<HTMLInputElement>('[data-testid="zone-name"]')[0]
    input.value = 'בפנים'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(el().textContent).toContain('fp_err_area_name')
    expect(renamed).toEqual([])
    input.value = ' גינה '
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(renamed).toEqual([{ key: 'areab2', name: 'גינה' }])
    expect(el().textContent).not.toContain('fp_err_area_name')
  })

  it('pressing the third swatch emits colorChange 2', () => {
    open(PLAN, 'areab2')
    const changes: { key: string; color: number }[] = []
    fixture.componentInstance.colorChange.subscribe((c) => changes.push(c))
    expect(q('[data-testid^="zone-color-"]').length).toBe(8)
    expect(q<HTMLInputElement>('[data-testid="zone-color-1"]')[0].checked).toBeTrue()
    q<HTMLInputElement>('[data-testid="zone-color-2"]')[0].click()
    expect(changes).toEqual([{ key: 'areab2', color: 2 }])
  })

  it('an area without a zone says so and offers "סימון על המפה", which emits drawRequested', () => {
    open(PLAN, 'areab2')
    const drawn: string[] = []
    fixture.componentInstance.drawRequested.subscribe((k) => drawn.push(k))
    expect(el().textContent).toContain('האזור עוד לא מסומן על המפה')
    expect(q('[data-testid="zone-w"]').length).toBe(0)
    const draw = q<HTMLButtonElement>('[data-testid="zone-draw"]')[0]
    expect(draw.textContent).toContain('סימון על המפה')
    draw.click()
    expect(drawn).toEqual(['areab2'])
  })

  it('an area with a zone shows four counters; zone-w emits rectChange; "הסרת הסימון" emits cleared', () => {
    open(ZONED, 'areab2')
    const rects: { key: string; rect: unknown }[] = []
    const cleared: string[] = []
    fixture.componentInstance.rectChange.subscribe((r) => rects.push(r))
    fixture.componentInstance.cleared.subscribe((k) => cleared.push(k))
    for (const id of ['zone-col', 'zone-row', 'zone-w', 'zone-d']) expect(q(`[data-testid="${id}"]`).length).toBe(1)
    const counter = (id: string) =>
      fixture.debugElement.query(By.css(`[data-testid="${id}"]`)).componentInstance as CounterComponent
    expect(counter('zone-col').value()).toBe(3)
    counter('zone-w').valueChange.emit(9)
    expect(rects).toEqual([{ key: 'areab2', rect: { x: 2, y: 2, w: 9, h: 4 } }])
    counter('zone-col').valueChange.emit(5)
    expect(rects[1].rect).toEqual({ x: 4, y: 2, w: 6, h: 4 })
    const clear = q<HTMLButtonElement>('[data-testid="zone-clear"]')[0]
    expect(clear.textContent).toContain('הסרת הסימון')
    clear.click()
    expect(cleared).toEqual(['areab2'])
  })

  it('while drawing, shows the hint and a cancel button instead of the shape block', () => {
    fixture.componentRef.setInput('drawing', true)
    open(ZONED, 'areab2')
    const cancelled: number[] = []
    fixture.componentInstance.drawCancelled.subscribe(() => cancelled.push(1))
    expect(q('[data-testid="zone-draw-hint"]').length).toBe(1)
    expect(q('[data-testid="zone-w"]').length).toBe(0)
    q<HTMLButtonElement>('[data-testid="zone-draw-cancel"]')[0].click()
    expect(cancelled).toEqual([1])
  })

  it('the remove button of an area with tables carries appTip with the reason and emits nothing', () => {
    open(PLAN, 'areaa1')
    const removed: string[] = []
    fixture.componentInstance.removed.subscribe((k) => removed.push(k))
    const btn = fixture.debugElement.query(By.css('[data-testid="zone-remove"]'))
    expect(btn.injector.get(TipDirective).appTip()).toBe('יש שולחנות באזור הזה')
    expect(btn.nativeElement.getAttribute('aria-disabled')).toBe('true')
    btn.nativeElement.click()
    expect(removed).toEqual([])
    expect(el().textContent).toContain('1 שולחנות באזור')
  })

  it('removes an empty area and emits moved for the order buttons', () => {
    open(PLAN, 'areab2')
    const removed: string[] = []
    const moved: { key: string; dir: string }[] = []
    fixture.componentInstance.removed.subscribe((k) => removed.push(k))
    fixture.componentInstance.moved.subscribe((m) => moved.push(m))
    expect((q('[data-testid="zone-down"]')[0] as HTMLButtonElement).disabled).toBeTrue()
    q<HTMLButtonElement>('[data-testid="zone-up"]')[0].click()
    q<HTMLButtonElement>('[data-testid="zone-remove"]')[0].click()
    expect(moved).toEqual([{ key: 'areab2', dir: 'up' }])
    expect(removed).toEqual(['areab2'])
  })
})
