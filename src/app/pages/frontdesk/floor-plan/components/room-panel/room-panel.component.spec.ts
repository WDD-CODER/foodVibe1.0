import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { ChevronDown, ChevronUp, LucideAngularModule, Plus, Trash2 } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import { RoomPanelComponent } from './room-panel.component'
import { TipDirective } from 'src/app/shared/tip/tip.directive'

const DICT: Record<string, string> = {
  fp_area_has_tables: 'יש שולחנות באזור הזה',
  fp_area_last: 'חייב להישאר אזור אחד'
}

const table: FloorTable = {
  key: 'tab001',
  number: '1',
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x: 9,
  y: 2,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
}

const PLAN: FloorPlanBody = {
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'areaa1', name: 'בפנים', order: 0 },
    { key: 'areab2', name: 'בחוץ', order: 1 }
  ],
  tables: [table],
  joins: []
}

describe('RoomPanelComponent (plan 684)', () => {
  let fixture: ComponentFixture<RoomPanelComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const q = <T extends HTMLElement>(sel: string): T[] => Array.from(el().querySelectorAll<T>(sel))

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RoomPanelComponent,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ChevronDown, ChevronUp, Plus, Trash2 })
      ],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => DICT[k ?? ''] ?? k ?? '' } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(RoomPanelComponent)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.detectChanges()
  })

  it('lists the areas with the up button disabled on the first and down on the last', () => {
    expect(q('[data-testid="room-area-name"]').length).toBe(2)
    expect((q('[data-testid="room-area-up"]')[0] as HTMLButtonElement).disabled).toBeTrue()
    expect((q('[data-testid="room-area-down"]')[1] as HTMLButtonElement).disabled).toBeTrue()
  })

  it('explains with appTip (no title) why an area with tables cannot be removed, and emits nothing (plan 699)', () => {
    const removed: string[] = []
    fixture.componentInstance.areaRemoved.subscribe((k) => removed.push(k))
    const btns = fixture.debugElement.queryAll(By.css('[data-testid="room-area-remove"]'))
    const btn = btns[0].nativeElement as HTMLButtonElement
    expect(btns[0].injector.get(TipDirective).appTip()).toBe('יש שולחנות באזור הזה')
    expect(btn.getAttribute('title')).toBeNull()
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    btn.click()
    expect(removed).toEqual([])
    const tip = document.querySelector<HTMLElement>('.c-tip[popover]')
    expect(tip?.matches(':popover-open')).toBeTrue()
    expect(tip?.textContent).toBe('יש שולחנות באזור הזה')
    const free = btns[1].nativeElement as HTMLButtonElement
    expect(btns[1].injector.get(TipDirective).appTip()).toBeNull()
    expect(free.getAttribute('title')).toBeNull()
    free.click()
    expect(removed).toEqual(['areab2'])
    fixture.destroy()
    expect(document.querySelector('.c-tip[popover]')).toBeNull()
  })

  it('adds a row with an empty name and joins the draft only once the name is valid', () => {
    const added: { key: string; name: string }[] = []
    fixture.componentInstance.areaAdded.subscribe((a) => added.push(a))
    ;(q('[data-testid="room-area-add"]')[0] as HTMLButtonElement).click()
    fixture.detectChanges()
    const inputs = q<HTMLInputElement>('[data-testid="room-area-name"]')
    expect(inputs.length).toBe(3)
    const fresh = inputs[2]
    fresh.value = 'בפנים'
    fresh.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(added).toEqual([])
    expect(el().textContent).toContain('fp_err_area_name')
    fresh.value = 'גינה'
    fresh.dispatchEvent(new Event('input'))
    expect(added.length).toBe(1)
    expect(added[0].name).toBe('גינה')
  })

  it('bounds the room size by the furthest table', () => {
    const counters = fixture.debugElement
      .queryAll(By.directive(CounterComponent))
      .map((d) => d.componentInstance as CounterComponent)
    expect(counters[0].min()).toBe(12)
    expect(counters[1].min()).toBe(10)
    expect(counters[0].max()).toBe(80)
  })

  it('disables "add area" at ten areas', () => {
    const areas = Array.from({ length: 10 }, (_, i) => ({ key: `area${i}aa`, name: `א${i}`, order: i }))
    fixture.componentRef.setInput('plan', { ...PLAN, areas, tables: [] })
    fixture.detectChanges()
    expect((q('[data-testid="room-area-add"]')[0] as HTMLButtonElement).disabled).toBeTrue()
  })
})
