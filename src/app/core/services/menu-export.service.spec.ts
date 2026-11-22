import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import type { CellValue, Workbook, Worksheet } from 'exceljs'

import { MenuExportService } from './menu-export.service'
import { KitchenStateService } from './kitchen-state.service'
import { StationRegistryService } from './station-registry.service'
import { TranslationService } from './translation.service'
import { EventPlanService } from '../engine/event-plan.service'
import { computeEventPlan } from '../engine/event-plan.engine'
import { buildFixtureInput } from '../engine/testing/event-plan.fixture'
import { MenuEvent } from '@models/menu-event.model'

/** The dictionary words these exports read (values as in dictionary.json); other keys come back as themselves. */
const HE: Record<string, string> = {
  test: 'אירוע ניסיון',
  buffet_family: 'בופה / משפחתי',
  general_group: 'קבוצה כללית',
  shopping_total: 'סה״כ',
  partial_total: 'חלקי',
  line_status_deleted: 'נמחק',
  line_status_no_conversion: 'לא ניתן לאחד – חסרה המרה',
  line_status_unlinked: 'לא מקושר',
  prep_sheets: 'דפי הכנה',
  prep_sheets_nothing: 'אין מה להדפיס',
  prep_sheets_guests: '{n} סועדים',
  prep_sheets_col_note: 'הערה',
  prep_sheets_col_prep: 'הכנה',
  prep_sheets_col_product: 'מוצר',
  prep_sheets_col_purchase: 'יחידות רכש',
  prep_sheets_col_qty: 'כמות',
  prep_sheets_col_unit: 'יחידה',
  prep_sheets_for_dish: 'למנה',
  prep_sheets_no_preps: 'אין הכנות במנה זו',
  export_shopping_list: 'רשימת קניות',
  export_sheet_menu_info: 'פרטי התפריט',
  export_section_fallback: 'מקטע',
  export_sheet_fallback: 'גיליון',
  export_menu_fallback: 'תפריט'
}

const LATIN = /[A-Za-z]/

function cell(ws: Worksheet, row: number, col: number): CellValue {
  return ws.getRow(row).getCell(col).value
}

function rowTexts(ws: Worksheet, row: number): string[] {
  const values = ws.getRow(row).values as CellValue[]
  return values.filter((v) => v !== undefined && v !== null).map((v) => String(v))
}

describe('MenuExportService (plan 471: house style, Hebrew)', () => {
  let service: MenuExportService
  const fixtureInput = buildFixtureInput()
  const fixturePlan = computeEventPlan(fixtureInput)
  const menu: MenuEvent = fixtureInput.event

  beforeEach(() => {
    const planSpy = jasmine.createSpyObj('EventPlanService', ['planFor'])
    planSpy.planFor.and.returnValue(fixturePlan)
    const translation = { translate: (k: string | undefined) => HE[(k ?? '').trim().toLowerCase()] ?? k ?? '' }

    TestBed.configureTestingModule({
      providers: [
        MenuExportService,
        { provide: KitchenStateService, useValue: { products_: signal(fixtureInput.products) } },
        { provide: EventPlanService, useValue: planSpy },
        { provide: TranslationService, useValue: translation },
        { provide: StationRegistryService, useValue: { stations_: signal(['קר']) } }
      ]
    })
    service = TestBed.inject(MenuExportService)
  })

  const builders: [string, () => Promise<Workbook>][] = [
    ['buildMenuInfoWorkbook', () => service.buildMenuInfoWorkbook(menu, fixtureInput.recipes)],
    [
      'buildMenuShoppingListWorkbook',
      () => service.buildMenuShoppingListWorkbook(menu, fixtureInput.recipes, fixtureInput.products)
    ],
    ['buildChecklistWorkbook by_dish', () => service.buildChecklistWorkbook(menu, fixtureInput.recipes, 'by_dish')],
    [
      'buildChecklistWorkbook by_category',
      () => service.buildChecklistWorkbook(menu, fixtureInput.recipes, 'by_category')
    ],
    [
      'buildChecklistWorkbook by_station',
      () => service.buildChecklistWorkbook(menu, fixtureInput.recipes, 'by_station')
    ],
    [
      'buildAllTogetherMenuWorkbook',
      () => service.buildAllTogetherMenuWorkbook(menu, fixtureInput.recipes, fixtureInput.products)
    ]
  ]

  for (const [label, build] of builders) {
    it(`${label}: Hebrew sheet names, right to left, rows 1–3 are title / meta / header`, async () => {
      const wb = await build()
      expect(wb.worksheets.length).toBeGreaterThan(0)
      for (const ws of wb.worksheets) {
        expect(LATIN.test(ws.name)).withContext(ws.name).toBeFalse()
        expect(ws.views[0])
          .withContext(ws.name)
          .toEqual(jasmine.objectContaining({ rightToLeft: true, state: 'frozen', ySplit: 3 }))
        expect(String(cell(ws, 1, 1)).length)
          .withContext(`${ws.name} title`)
          .toBeGreaterThan(0)
        expect(String(cell(ws, 2, 1)))
          .withContext(`${ws.name} meta`)
          .toContain('100')
        expect(LATIN.test(String(cell(ws, 2, 1))))
          .withContext(`${ws.name} meta`)
          .toBeFalse()
        const header = rowTexts(ws, 3)
        expect(header.length).withContext(`${ws.name} header`).toBeGreaterThan(0)
        for (const text of header) expect(LATIN.test(text)).withContext(`${ws.name}: ${text}`).toBeFalse()
        expect(ws.pageSetup.paperSize).toBe(9)
        expect(ws.pageSetup.fitToWidth).toBe(1)
      }
    })
  }

  it('the cover shows the event type in Hebrew from the dictionary when there is no snapshot', async () => {
    const wb = await service.buildMenuInfoWorkbook(menu, fixtureInput.recipes)
    const cover = wb.worksheets[0]
    expect(cover.name).toBe('פרטי התפריט')
    expect(cell(cover, 5, 2)).toBe('אירוע ניסיון')
    expect(String(cell(cover, 2, 1))).toContain('אירוע ניסיון')
  })

  it('the cover prefers the stored event-type snapshot name', async () => {
    const withSnapshot: MenuEvent = {
      ...menu,
      eventType: 'wedding',
      eventTypeSnapshot: { key: 'wedding', name: 'חתונה', coefficient: 1 }
    }
    const cover = (await service.buildMenuInfoWorkbook(withSnapshot, fixtureInput.recipes)).worksheets[0]
    expect(cell(cover, 5, 2)).toBe('חתונה')
    const preview = service.getMenuInfoPreviewPayload(withSnapshot, fixtureInput.recipes)
    expect(preview.subtitle).toContain('חתונה')
  })

  it('a section without a name gets the Hebrew fallback; two equal names stay unique', async () => {
    const section = menu.sections[0]
    const twoSections: MenuEvent = {
      ...menu,
      sections: [
        { ...section, _id: 'a', name: '', sortOrder: 0 },
        { ...section, _id: 'b', name: 'עיקריות', sortOrder: 1 },
        { ...section, _id: 'c', name: 'עיקריות', sortOrder: 2 }
      ]
    }
    const names = (await service.buildMenuInfoWorkbook(twoSections, fixtureInput.recipes)).worksheets.map((w) => w.name)
    expect(names).toEqual(['פרטי התפריט', 'מקטע', 'עיקריות', 'עיקריות 2'])
  })

  it('the shopping list keeps its bold total row and the preview title is Hebrew', async () => {
    const ws = (await service.buildMenuShoppingListWorkbook(menu, [], fixtureInput.products)).worksheets[0]
    expect(ws.name).toBe('רשימת קניות')
    const rowNumbers = Array.from({ length: ws.rowCount }, (_, i) => i + 1)
    const totalRow = rowNumbers.find((n) => rowTexts(ws, n).includes('סה״כ')) ?? 0
    expect(totalRow).toBeGreaterThan(3)
    expect(ws.getRow(totalRow).font?.bold).toBeTrue()
    const preview = service.getMenuShoppingListPreviewPayload(menu, [], fixtureInput.products)
    expect(preview.title).toBe('אירוע בדיקה — רשימת קניות')
  })
})
