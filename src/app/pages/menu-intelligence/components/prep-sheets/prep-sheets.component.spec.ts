import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { EventPlanService } from 'src/app/core/engine/event-plan.service'
import { computeEventPlan } from 'src/app/core/engine/event-plan.engine'
import { FIXTURE_SUPPLIERS, buildFixtureInput } from 'src/app/core/engine/testing/event-plan.fixture'
import type { EventPlan, EventPlanInput } from 'src/app/core/engine/event-plan.types'
import { buildPrepSheetGroups, prepSheetTableRows } from 'src/app/core/utils/prep-sheet-groups.util'
import { ExportService } from '@services/export.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { StationRegistryService } from '@services/station-registry.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { PrepSheetsComponent } from './prep-sheets.component'

const TEXTS: Record<string, string> = {
  general_group: 'כללי',
  prep_sheets_no_preps: 'אין הכנות במנה זו',
  prep_sheets_page_footer: 'עמוד {x} מתוך {y} · {group}',
  prep_sheets_guests: '{n} סועדים',
  prep_sheets_for_dish: 'למנה',
  kg: 'ק"ג',
  no_supplier: 'ללא ספק'
}

describe('PrepSheetsComponent', () => {
  let fixture: ComponentFixture<PrepSheetsComponent>
  let component: PrepSheetsComponent
  let input: EventPlanInput
  let plan: EventPlan
  let exportService: jasmine.SpyObj<ExportService>
  let printSpy: jasmine.Spy

  const t = (key: string): string => TEXTS[key] ?? key
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement
  const pages = (): HTMLElement[] => Array.from(el().querySelectorAll<HTMLElement>('.prep-page'))
  const styleText = (): string =>
    Array.from(document.head.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .filter((text) => text.includes('@page pg-'))
      .join('\n')

  function create(mode: 'by_dish' | 'by_category' | 'by_station' | 'by_supplier' = 'by_station'): void {
    input = buildFixtureInput()
    for (const r of input.recipes) r.defaultStation = r._id === 'r-salad' ? 'קר' : ''
    plan = computeEventPlan(input)
    const planService = jasmine.createSpyObj<EventPlanService>('EventPlanService', ['planFor'])
    planService.planFor.and.callFake(() => plan)
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => TEXTS[k ?? ''] ?? k ?? '')
    exportService = jasmine.createSpyObj<ExportService>('ExportService', ['exportChecklist'])
    exportService.exportChecklist.and.resolveTo()
    const kitchenState = {
      recipes_: signal(input.recipes),
      recipesById_: signal(new Map(input.recipes.map((r) => [r._id, r]))),
      productsById_: signal(new Map(input.products.map((p) => [p._id, p]))),
      suppliersById_: signal(new Map(FIXTURE_SUPPLIERS.map((s) => [s._id, s])))
    }
    TestBed.configureTestingModule({
      imports: [PrepSheetsComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: EventPlanService, useValue: planService },
        { provide: KitchenStateService, useValue: kitchenState },
        { provide: StationRegistryService, useValue: { stations_: signal(['חם', 'קר']) } },
        { provide: TranslationService, useValue: translation },
        { provide: ExportService, useValue: exportService },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) }
      ]
    })
    fixture = TestBed.createComponent(PrepSheetsComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('event', input.event)
    fixture.componentRef.setInput('mode', mode)
    fixture.detectChanges()
  }

  beforeEach(() => {
    printSpy = spyOn(window, 'print')
  })

  it('shows one page per group with the title, event line and a printed box per row', () => {
    create()
    expect(pages().length).toBe(1)
    const page = pages()[0]
    expect(page.querySelector('.prep-title')?.textContent).toBe('קר')
    expect(page.querySelector('.prep-meta')?.textContent).toContain('אירוע בדיקה · 20.11.2026 · 100 סועדים')
    expect(page.querySelectorAll('tbody .prep-box').length).toBe(1)
  })

  it('renders the same cells as prepSheetTableRows', () => {
    create()
    const [group] = buildPrepSheetGroups(
      plan,
      input.event,
      new Map(input.recipes.map((r) => [r._id, r])),
      'by_station',
      t,
      ['חם', 'קר']
    )
    const expected = prepSheetTableRows(group, t)
    const header = Array.from(pages()[0].querySelectorAll('thead th:not(.prep-box-cell)')).map((c) => c.textContent)
    const body = Array.from(pages()[0].querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td:not(.prep-box-cell)')).map((c) => c.textContent)
    )
    expect(header).toEqual(expected[0].map(String))
    expect(body).toEqual(expected.slice(1).map((r) => r.map(String)))
  })

  it('by dish: the dish without preps shows its empty text', () => {
    create('by_dish')
    expect(pages().length).toBe(2)
    expect(pages()[1].querySelector('.prep-empty')?.textContent).toBe('אין הכנות במנה זו')
  })

  it('unchecking a group marks its page is-excluded and drops its @page rule', () => {
    create('by_dish')
    const boxes = el().querySelectorAll<HTMLInputElement>('.prep-choose-item input')
    expect(boxes.length).toBe(2)
    expect(pages().every((p) => !p.classList.contains('is-excluded'))).toBeTrue()
    boxes[1].click()
    fixture.detectChanges()
    expect(pages()[0].classList.contains('is-excluded')).toBeFalse()
    expect(pages()[1].classList.contains('is-excluded')).toBeTrue()
    expect(styleText()).toContain('@page pg-0')
    expect(styleText()).not.toContain('@page pg-1')
  })

  it('"הדפס" calls window.print and is disabled when nothing is chosen', () => {
    create()
    const print = el().querySelector<HTMLButtonElement>('.prep-print') as HTMLButtonElement
    print.click()
    expect(printSpy).toHaveBeenCalledTimes(1)
    el().querySelector<HTMLInputElement>('.prep-choose-item input')?.click()
    fixture.detectChanges()
    expect(print.disabled).toBeTrue()
  })

  it('adds the body class and one @page rule per printed group with the footer text, and removes both on destroy', () => {
    create('by_dish')
    expect(document.body.classList.contains('prep-sheets-open')).toBeTrue()
    const css = styleText()
    expect(css).toContain('@page pg-0 { size: A4 portrait; margin: 12mm;')
    expect(css).toContain('@page pg-1')
    expect(css).toContain('content: "עמוד " counter(page) " מתוך " counter(pages) " · " "סלט"')
    expect(css).toContain('" · " "פסטה"')
    fixture.destroy()
    expect(document.body.classList.contains('prep-sheets-open')).toBeFalse()
    expect(styleText()).toBe('')
  })

  it('escapes quotes and backslashes of a group name in the @page footer', () => {
    create('by_station')
    input.recipes[0].defaultStation = 'ק"ר\\x'
    plan = computeEventPlan(input)
    fixture.componentRef.setInput('event', { ...input.event })
    fixture.detectChanges()
    expect(styleText()).toContain('"ק\\"ר\\\\x"')
  })

  it('switching tab shows the supplier pages without an export button, and prints no prices', () => {
    create('by_station')
    const tabs = Array.from(el().querySelectorAll<HTMLButtonElement>('.prep-tabs button'))
    tabs[3].click()
    fixture.detectChanges()
    expect(pages().map((p) => p.querySelector('.prep-title')?.textContent)).toEqual(['ירקן', 'ללא ספק'])
    expect(el().querySelector('.prep-export')).toBeNull()
    expect(el().querySelector('.prep-papers')?.textContent).not.toContain('₪')
  })

  it('exports the active mode through the export service', async () => {
    create('by_category')
    el().querySelector<HTMLButtonElement>('.prep-export')?.click()
    await fixture.whenStable()
    expect(exportService.exportChecklist).toHaveBeenCalledWith(input.event, input.recipes, 'by_category')
  })

  it('emits close on Escape, on the close button and on a backdrop click', () => {
    create()
    let closed = 0
    component.close.subscribe(() => closed++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    ;(el().querySelector('.prep-bar .c-icon-btn') as HTMLElement).click()
    ;(el().querySelector('.prep-overlay') as HTMLElement).click()
    expect(closed).toBe(3)
  })

  it('says there is nothing to print when the plan has no groups', () => {
    create('by_station')
    plan = { ...plan, prepLines: [] }
    fixture.componentRef.setInput('event', { ...input.event })
    fixture.detectChanges()
    expect(pages().length).toBe(0)
    expect(el().querySelector('.prep-nothing')?.textContent).toContain('prep_sheets_nothing')
  })
})
