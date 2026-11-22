import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { CdkDrag } from '@angular/cdk/drag-drop'
import { Directionality } from '@angular/cdk/bidi'
import { TranslationService } from '@services/translation.service'
import type { FloorTable } from '@models/floor-plan.model'
import { FloorMapComponent, type FloorMapPlan } from './floor-map.component'

const DICT: Record<string, string> = {
  fp_table_label: 'שולחן {number}, {min}–{max} מקומות',
  fp_state_inactive: 'לא פעיל'
}

const table = (over: Partial<FloorTable>): FloorTable => ({
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
  online: true,
  ...over
})

const PLAN: FloorMapPlan = {
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'areaa1', name: 'בפנים', order: 0 },
    { key: 'areab2', name: 'בחוץ', order: 1 }
  ],
  tables: [
    table({ key: 'tab001', number: '1', x: 0, y: 0 }),
    table({ key: 'tab002', number: '2', x: 5, y: 0, shape: 'round', minSeats: 1, maxSeats: 2, w: 2, h: 2 }),
    table({
      key: 'tab003',
      number: '3',
      x: 9,
      y: 4,
      areaKey: 'areab2',
      shape: 'rect',
      minSeats: 4,
      maxSeats: 6,
      w: 4,
      h: 2
    })
  ]
}

describe('FloorMapComponent (plan 665)', () => {
  let fixture: ComponentFixture<FloorMapComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const tableEl = (n: string): HTMLElement => el().querySelector(`[data-testid="floor-table-${n}"]`) as HTMLElement

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorMapComponent],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => DICT[k ?? ''] ?? k ?? '' } },
        { provide: Directionality, useValue: { value: 'rtl', change: { subscribe: () => ({ unsubscribe() {} }) } } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(FloorMapComponent)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.detectChanges()
  })

  it('renders a button per table with its cells and a label', () => {
    expect(el().querySelectorAll('[data-testid^="floor-table-"]').length).toBe(3)
    const second = tableEl('2')
    expect(second.getAttribute('data-x')).toBe('5')
    expect(second.getAttribute('data-y')).toBe('0')
    expect(second.getAttribute('aria-label')).toBe('שולחן 2, 1–2 מקומות')
    expect(second.style.gridColumn).toContain('6 / span 2')
  })

  it('marks a selected key with aria-pressed', () => {
    fixture.componentRef.setInput('selectedKeys', ['tab002'])
    fixture.detectChanges()
    expect(tableEl('2').getAttribute('aria-pressed')).toBe('true')
    expect(tableEl('1').getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the inactive text for a table whose state is not_active', () => {
    fixture.componentRef.setInput('states', { tab001: 'not_active', tab002: 'seated' })
    fixture.detectChanges()
    expect(tableEl('1').textContent).toContain('לא פעיל')
    expect(tableEl('2').textContent).not.toContain('לא פעיל')
    expect(tableEl('2').getAttribute('data-state')).toBe('seated')
    expect(tableEl('3').getAttribute('data-state')).toBe('none')
  })

  it('emits tableTapped with the key on a tap', () => {
    const tapped: string[] = []
    fixture.componentInstance.tableTapped.subscribe((k) => tapped.push(k))
    tableEl('3').click()
    expect(tapped).toEqual(['tab003'])
  })

  it('disables the drag when draggable is false and enables it when true', () => {
    const drags = () =>
      fixture.debugElement.queryAll(By.directive(CdkDrag)).map((d) => d.injector.get(CdkDrag).disabled)
    expect(drags()).toEqual([true, true, true])
    fixture.componentRef.setInput('draggable', true)
    fixture.detectChanges()
    expect(drags()).toEqual([false, false, false])
  })

  it('dims the tables of another area', () => {
    fixture.componentRef.setInput('dimOtherThanArea', 'areab2')
    fixture.detectChanges()
    expect(tableEl('1').classList).toContain('is-dimmed')
    expect(tableEl('3').classList).not.toContain('is-dimmed')
  })
})
