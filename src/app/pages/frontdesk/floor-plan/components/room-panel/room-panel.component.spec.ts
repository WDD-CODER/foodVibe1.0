import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { ChevronDown, ChevronUp, LucideAngularModule, Pencil, Plus, Trash2 } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import { RoomPanelComponent } from './room-panel.component'

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
    { key: 'areaa1', name: 'בפנים', order: 0, color: 0 },
    { key: 'areab2', name: 'בחוץ', order: 1, color: 3 }
  ],
  tables: [table],
  joins: []
}

describe('RoomPanelComponent (plan 684, 700)', () => {
  let fixture: ComponentFixture<RoomPanelComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const q = <T extends HTMLElement>(sel: string): T[] => Array.from(el().querySelectorAll<T>(sel))

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RoomPanelComponent,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ChevronDown, ChevronUp, Pencil, Plus, Trash2 })
      ],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } }]
    }).compileComponents()
    fixture = TestBed.createComponent(RoomPanelComponent)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.detectChanges()
  })

  it('shows each area row with its colour dot, name and table count, and emits areaSelected when pressed', () => {
    const selected: string[] = []
    fixture.componentInstance.areaSelected.subscribe((k) => selected.push(k))
    const rows = q<HTMLButtonElement>('[data-testid="room-zone-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('בפנים')
    expect(rows[0].querySelector('.c-chip__count')?.textContent?.trim()).toBe('1')
    expect(rows[1].querySelector('.c-chip__count')?.textContent?.trim()).toBe('0')
    expect(rows[1].querySelector<HTMLElement>('.c-chip__dot')?.style.background).toContain('--color-zone-3')
    expect(q('[data-testid="room-area-name"]').length).toBe(0)
    rows[1].click()
    expect(selected).toEqual(['areab2'])
  })

  it('up / down emit areaMoved, disabled on the first and the last', () => {
    const moved: { key: string; dir: string }[] = []
    fixture.componentInstance.areaMoved.subscribe((m) => moved.push(m))
    expect((q('[data-testid="room-area-up"]')[0] as HTMLButtonElement).disabled).toBeTrue()
    expect((q('[data-testid="room-area-down"]')[1] as HTMLButtonElement).disabled).toBeTrue()
    q<HTMLButtonElement>('[data-testid="room-area-up"]')[1].click()
    expect(moved).toEqual([{ key: 'areab2', dir: 'up' }])
  })

  it('"הוספת אזור" emits areaAddRequested', () => {
    let count = 0
    fixture.componentInstance.areaAddRequested.subscribe(() => count++)
    q<HTMLButtonElement>('[data-testid="room-area-add"]')[0].click()
    expect(count).toBe(1)
  })

  it('bounds the room size by the furthest table; the two size counters stay', () => {
    const counters = fixture.debugElement
      .queryAll(By.directive(CounterComponent))
      .map((d) => d.componentInstance as CounterComponent)
    expect(q('[data-testid="room-cols"]').length).toBe(1)
    expect(q('[data-testid="room-rows"]').length).toBe(1)
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
