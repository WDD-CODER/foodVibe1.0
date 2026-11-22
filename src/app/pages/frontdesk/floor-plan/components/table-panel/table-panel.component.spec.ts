import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { Copy, LucideAngularModule, Trash2, X } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import type { TablePatch } from '../../floor-plan-edit.util'
import { TablePanelComponent } from './table-panel.component'

const DICT: Record<string, string> = {
  fp_panel_title: 'שולחן {number}',
  fp_err_number_taken: 'המספר כבר בשימוש',
  fp_err_number_required: 'חובה לתת מספר',
  fp_duplicate: 'שכפול',
  fp_delete: 'הסרת השולחן'
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

const PLAN: FloorPlanBody = {
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [table({}), table({ key: 'tab002', number: '2', x: 5 })],
  joins: []
}

describe('TablePanelComponent (plan 684)', () => {
  let fixture: ComponentFixture<TablePanelComponent>
  let patches: TablePatch[]
  const el = (): HTMLElement => fixture.nativeElement
  const numberInput = (): HTMLInputElement => el().querySelector('[data-testid="tp-number"]') as HTMLInputElement
  const type = (value: string) => {
    numberInput().value = value
    numberInput().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablePanelComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Copy, Trash2, X })],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => DICT[k ?? ''] ?? k ?? '' } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(TablePanelComponent)
    fixture.componentRef.setInput('table', PLAN.tables[0])
    fixture.componentRef.setInput('plan', PLAN)
    patches = []
    fixture.componentInstance.tableChange.subscribe((p) => patches.push(p))
    fixture.detectChanges()
  })

  it('shows the title with the table number', () => {
    expect(el().querySelector('.table-panel__title')?.textContent).toContain('שולחן 1')
  })

  it('shows "המספר כבר בשימוש" and emits nothing for a number another table has', () => {
    type('2')
    expect(el().textContent).toContain('המספר כבר בשימוש')
    expect(patches).toEqual([])
  })

  it('emits a free number', () => {
    type('12')
    expect(patches).toEqual([{ number: '12' }])
    expect(el().querySelector('.c-field-error')).toBeNull()
  })

  it('shows the required error for an empty number and emits nothing', () => {
    type('')
    expect(el().textContent).toContain('חובה לתת מספר')
    expect(patches).toEqual([])
  })

  it('bounds the max counter by the min value and 30', () => {
    const counters = fixture.debugElement
      .queryAll(By.directive(CounterComponent))
      .map((d) => d.componentInstance as CounterComponent)
    const [minCounter, maxCounter] = counters
    expect(minCounter.max()).toBe(4)
    expect(maxCounter.min()).toBe(2)
    expect(maxCounter.max()).toBe(30)
  })

  it('emits duplicate, remove and closed from their buttons', () => {
    const events: string[] = []
    fixture.componentInstance.duplicate.subscribe(() => events.push('duplicate'))
    fixture.componentInstance.remove.subscribe(() => events.push('remove'))
    fixture.componentInstance.closed.subscribe(() => events.push('closed'))
    ;(el().querySelector('[data-testid="tp-duplicate"]') as HTMLButtonElement).click()
    ;(el().querySelector('[data-testid="tp-remove"]') as HTMLButtonElement).click()
    ;(el().querySelector('[data-testid="table-panel-close"]') as HTMLButtonElement).click()
    expect(events).toEqual(['duplicate', 'remove', 'closed'])
  })

  it('disables online while the table is not active', () => {
    fixture.componentRef.setInput('table', table({ active: false, online: false }))
    fixture.detectChanges()
    expect((el().querySelector('[data-testid="tp-online"]') as HTMLInputElement).disabled).toBeTrue()
  })

  it('shows four arrow buttons, disables the ones that would leave the room, and emits the arrow pressed', () => {
    const moves: string[] = []
    fixture.componentInstance.move.subscribe((a) => moves.push(a))
    const btn = (a: string) => el().querySelector(`[data-testid="tp-move-${a}"]`) as HTMLButtonElement
    expect(btn('up').disabled).toBeTrue()
    expect(btn('down').disabled).toBeFalse()
    btn('down').click()
    expect(moves).toEqual(['down'])
    expect(btn('up').getAttribute('aria-label')).toBe('fp_move_up')
  })

  it('emits a shape change', () => {
    ;(el().querySelector('[data-testid="tp-shape-round"]') as HTMLInputElement).dispatchEvent(new Event('change'))
    expect(patches).toEqual([{ shape: 'round' }])
  })
})
