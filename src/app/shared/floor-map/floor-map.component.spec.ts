import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { AlertTriangle, Link, LucideAngularModule } from 'lucide-angular'
import { CdkDrag } from '@angular/cdk/drag-drop'
import { Directionality } from '@angular/cdk/bidi'
import { TranslationService } from '@services/translation.service'
import type { FloorTable } from '@models/floor-plan.model'
import { FloorMapComponent, type FloorMapPlan } from './floor-map.component'

const DICT: Record<string, string> = {
  fp_table_label: 'שולחן {number}, {min}–{max} מקומות',
  fp_state_inactive: 'לא פעיל',
  fp_joined_suffix: 'מחובר'
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
      imports: [FloorMapComponent, LucideAngularModule.pick({ AlertTriangle, Link })],
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

  it('marks a key in warnKeys with is-overlap and a warning mark', () => {
    fixture.componentRef.setInput('warnKeys', ['tab002'])
    fixture.detectChanges()
    expect(tableEl('2').classList).toContain('is-overlap')
    expect(tableEl('2').querySelector('.floor-map__warn')).not.toBeNull()
    expect(tableEl('1').classList).not.toContain('is-overlap')
    expect(tableEl('1').querySelector('.floor-map__warn')).toBeNull()
  })

  it('dims the tables of another area', () => {
    fixture.componentRef.setInput('dimOtherThanArea', 'areab2')
    fixture.detectChanges()
    expect(tableEl('1').classList).toContain('is-dimmed')
    expect(tableEl('3').classList).not.toContain('is-dimmed')
  })

  describe('zones and joined tables (plan 699)', () => {
    const ZONED: FloorMapPlan = {
      ...PLAN,
      areas: [
        { key: 'areaa1', name: 'בפנים', order: 0 },
        { key: 'areab2', name: 'בחוץ', order: 1, color: 3, zone: { x: 8, y: 3, w: 8, h: 6 } }
      ]
    }
    const zoneEl = (key: string): HTMLElement | null => el().querySelector(`[data-testid="floor-zone-${key}"]`)

    beforeEach(() => {
      fixture.componentRef.setInput('plan', ZONED)
      fixture.detectChanges()
    })

    it('renders one zone in its cells with the area name and colour', () => {
      expect(el().querySelectorAll('[data-testid^="floor-zone-"]').length).toBe(1)
      const zone = zoneEl('areab2') as HTMLElement
      expect(zone.textContent).toContain('בחוץ')
      expect(zone.style.getPropertyValue('--fm-zone')).toBe('var(--color-zone-3)')
      expect(zone.style.gridColumn).toContain('9 / span 8')
      expect(zone.style.gridRow).toContain('4 / span 6')
      expect(zone.getAttribute('aria-hidden')).toBe('true')
      expect(zone.tagName).toBe('DIV')
    })

    it('renders no zone when showZones is false', () => {
      fixture.componentRef.setInput('showZones', false)
      fixture.detectChanges()
      expect(el().querySelectorAll('[data-testid^="floor-zone-"]').length).toBe(0)
    })

    it('colours a table by its area only with colorTables', () => {
      expect(tableEl('3').style.getPropertyValue('--fm-zone')).toBe('')
      fixture.componentRef.setInput('colorTables', true)
      fixture.detectChanges()
      expect(tableEl('3').style.getPropertyValue('--fm-zone')).toBe('var(--color-zone-3)')
      expect(tableEl('1').style.getPropertyValue('--fm-zone')).toBe('var(--color-zone-0)')
    })

    it('marks a joined table with is-joined, a link mark and "מחובר" at the end of its name', () => {
      fixture.componentRef.setInput('joinedKeys', ['tab002'])
      fixture.detectChanges()
      expect(tableEl('2').classList).toContain('is-joined')
      expect(tableEl('2').querySelector('.floor-map__link')).not.toBeNull()
      expect(tableEl('2').getAttribute('aria-label')?.endsWith('מחובר')).toBeTrue()
      expect(tableEl('1').classList).not.toContain('is-joined')
      expect(tableEl('1').querySelector('.floor-map__link')).toBeNull()
    })

    it('draws a zone: pointer down at (2,2), up at (5,4) emits zoneDrawn', () => {
      const drawn: unknown[] = []
      fixture.componentInstance.zoneDrawn.subscribe((e) => drawn.push(e))
      fixture.componentRef.setInput('zoneEditable', true)
      fixture.componentRef.setInput('drawZoneKey', 'areaa1')
      fixture.detectChanges()
      const grid = el().querySelector('[data-testid="floor-grid"]') as HTMLElement
      expect(grid.classList).toContain('is-drawing')
      const box = grid.getBoundingClientRect()
      const cw = box.width / 24
      const ch = box.height / 16
      // RTL: cell x counts from the right edge.
      const at = (x: number, y: number) => ({
        clientX: box.left + (24 - x - 0.5) * cw,
        clientY: box.top + (y + 0.5) * ch,
        pointerId: 7,
        pointerType: 'mouse',
        button: 0,
        bubbles: true
      })
      grid.dispatchEvent(new PointerEvent('pointerdown', at(2, 2)))
      grid.dispatchEvent(new PointerEvent('pointermove', at(4, 3)))
      fixture.detectChanges()
      expect(el().querySelector('.floor-map__zone--draft')).not.toBeNull()
      grid.dispatchEvent(new PointerEvent('pointerup', at(5, 4)))
      fixture.detectChanges()
      expect(drawn).toEqual([{ areaKey: 'areaa1', rect: { x: 2, y: 2, w: 4, h: 3 } }])
      expect(el().querySelector('.floor-map__zone--draft')).toBeNull()
    })

    it('Escape while drawing cancels the preview and emits nothing', () => {
      const drawn: unknown[] = []
      fixture.componentInstance.zoneDrawn.subscribe((e) => drawn.push(e))
      fixture.componentRef.setInput('zoneEditable', true)
      fixture.componentRef.setInput('drawZoneKey', 'areaa1')
      fixture.detectChanges()
      const grid = el().querySelector('[data-testid="floor-grid"]') as HTMLElement
      const box = grid.getBoundingClientRect()
      const init = { clientX: box.left + 5, clientY: box.top + 5, pointerId: 8, button: 0, bubbles: true }
      grid.dispatchEvent(new PointerEvent('pointerdown', init))
      fixture.detectChanges()
      expect(el().querySelector('.floor-map__zone--draft')).not.toBeNull()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      fixture.detectChanges()
      expect(el().querySelector('.floor-map__zone--draft')).toBeNull()
      grid.dispatchEvent(new PointerEvent('pointerup', init))
      expect(drawn).toEqual([])
    })

    it('a tap on an editable zone emits zoneTapped', () => {
      const tapped: string[] = []
      fixture.componentInstance.zoneTapped.subscribe((k) => tapped.push(k))
      fixture.componentRef.setInput('zoneEditable', true)
      fixture.detectChanges()
      const zone = zoneEl('areab2') as HTMLElement
      expect(zone.tagName).toBe('BUTTON')
      expect(zone.getAttribute('aria-label')).toBe('בחוץ')
      zone.click()
      expect(tapped).toEqual(['areab2'])
    })

    it('shows four handles on the selected zone only when zoneEditable', () => {
      fixture.componentRef.setInput('selectedZoneKey', 'areab2')
      fixture.detectChanges()
      expect(el().querySelectorAll('.floor-map__handle').length).toBe(0)
      fixture.componentRef.setInput('zoneEditable', true)
      fixture.detectChanges()
      expect(el().querySelectorAll('.floor-map__handle').length).toBe(4)
      expect(el().querySelector('.floor-map__handle--start-start')).not.toBeNull()
      expect(zoneEl('areab2')?.classList).toContain('floor-map__zone--selected')
    })
  })
})
