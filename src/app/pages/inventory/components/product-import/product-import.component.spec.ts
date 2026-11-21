import { signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { Observable, of, throwError } from 'rxjs'
import { FileText, LucideAngularModule, TrendingUp } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService } from '@services/business.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { Recipe } from '@models/recipe.model'
import { GeminiService } from '@services/gemini.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { PermissionService } from '@services/permission.service'
import { ImportRow, InvoiceReadResult, ProductImportService } from '@services/product-import.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { NameMatchItem, NameMatchResult, ProductNameMatcherService } from '@services/product-name-matcher.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { matchProductName } from '@utils/product-name-match.util'
import { Product } from '@models/product.model'
import { getGeminiUsage } from '@utils/gemini-usage.util'
import { ProductImportComponent } from './product-import.component'

const row = (name: string, price: number | null, extra: Partial<ImportRow> = {}): ImportRow => ({
  name,
  baseUnit: 'kg',
  price,
  purchaseUnit: null,
  purchaseQty: null,
  category: null,
  needsReview: false,
  duplicate: false,
  ...extra
})

/** A full answer of the invoice read (C-INVREAD) around the given rows. */
const readResult = (rows: ImportRow[], extra: Partial<InvoiceReadResult> = {}): InvoiceReadResult => ({
  header: {},
  supplier: { supplierKey: 'name:ירקן' },
  rows,
  printed: [],
  truncated: false,
  draftId: null,
  fileId: null,
  ...extra
})

const PRODUCTS = [
  { _id: 'p1', nameHebrew: 'עגבנייה', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 5 }] },
  { _id: 'p2', nameHebrew: 'מלפפון', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 4.5 }] },
  { _id: 'p3', nameHebrew: 'פטרוזיליה', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 7 }] },
  { _id: 'p4', nameHebrew: 'לחם', baseUnit: 'kg', sources: [{ supplierId: 'supA', price: 100 }] },
  {
    _id: 'p5',
    nameHebrew: 'חלב',
    baseUnit: 'liter',
    sources: [
      { supplierId: 'supC', price: 120 },
      { supplierId: 'supD', price: 110 }
    ]
  },
  { _id: 'p6', nameHebrew: 'שמן', baseUnit: 'liter', sources: [{ supplierId: 'supB', price: 20 }] },
  { _id: 'p7', nameHebrew: 'קמח', baseUnit: 'kg', sources: [{ supplierId: 'supF', price: 10 }] }
] as unknown as Product[]

describe('ProductImportComponent', () => {
  let fixture: ComponentFixture<ProductImportComponent>
  let parsePriceList: jasmine.Spy
  let apply: jasmine.Spy
  let onSetSuccessMsg: jasmine.Spy
  let onSetErrorMsg: jasmine.Spy
  let allowed: boolean
  let matchNames: jasmine.Spy
  let readInvoice: jasmine.Spy
  let resolve: jasmine.Spy
  /** Plan 629: the stored settings of the business and the cost the engine stub answers (apply raises it). */
  let storedSettings: Record<string, number> | undefined
  let recipes: Recipe[]
  let cost: number
  /** Plan 645: the big-change confirm; confirms by default so the older cases save as before. */
  let confirmOpen: jasmine.Spy

  async function setup(
    parsed: Observable<unknown>,
    can = true,
    aiAnswer: () => Promise<Map<string, NameMatchResult>> = () => Promise.resolve(new Map())
  ): Promise<void> {
    allowed = can
    storedSettings = undefined
    recipes = []
    cost = 10
    matchNames = jasmine.createSpy('matchNames').and.callFake((_items: NameMatchItem[]) => aiAnswer())
    parsePriceList = jasmine.createSpy('parsePriceList').and.returnValue(parsed)
    readInvoice = jasmine.createSpy('readInvoice').and.resolveTo(readResult([]))
    resolve = jasmine.createSpy('resolve').and.resolveTo([])
    apply = jasmine.createSpy('apply').and.callFake(async () => {
      cost = 10.6
      return { created: 1, updated: 1, skipped: 1, skippedRows: [] }
    })
    onSetSuccessMsg = jasmine.createSpy('onSetSuccessMsg')
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    confirmOpen = jasmine.createSpy('confirmOpen').and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [ProductImportComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FileText, TrendingUp })],
      providers: [
        provideRouter([]),
        { provide: GeminiService, useValue: { parsePriceList, readInvoice } },
        { provide: ProductImportService, useValue: { apply, resolve } },
        {
          provide: ProductNameMatcherService,
          useValue: { matchExact: (name: string) => matchProductName(name, PRODUCTS), matchNames }
        },
        { provide: UnitRegistryService, useValue: { allUnitKeys_: signal(['crate']) } },
        {
          provide: KitchenStateService,
          useValue: {
            products_: signal(PRODUCTS),
            recipes_: () => recipes,
            suppliers_: signal([
              { _id: 'sup1', nameHebrew: 'ירקן' },
              { _id: 'supA', nameHebrew: 'ווילד בייקרי' },
              { _id: 'supB', nameHebrew: 'ווילד בייקרי ' },
              { _id: 'supC', nameHebrew: 'מחלבת ג' },
              { _id: 'supD', nameHebrew: 'מחלבת ד' },
              { _id: 'supE', nameHebrew: 'ספק ה' },
              { _id: 'supF', nameHebrew: 'Fresh Mill' },
              { _id: 'supG', nameHebrew: '  fresh MILL ' }
            ])
          }
        },
        {
          provide: MetadataRegistryService,
          useValue: {
            allCategories_: signal<string[]>([]),
            allAllergens_: signal<string[]>([]),
            resolveCategoryKey: () => Promise.resolve(null),
            registerCategory: () => Promise.resolve()
          }
        },
        { provide: PermissionService, useValue: { can: () => allowed } },
        {
          provide: BusinessService,
          useValue: { business_: () => (storedSettings ? { settings: storedSettings } : { settings: undefined }) }
        },
        { provide: RecipeCostService, useValue: { computeRecipeCost: () => cost } },
        { provide: ConfirmModalService, useValue: { open: confirmOpen } },
        {
          provide: TranslationService,
          useValue: {
            translate: (key: string) =>
              (
                ({
                  import_price_was_at: 'WAS {price} AT {name}',
                  import_update_supplier_price: 'UPDATE {name}',
                  import_add_as_new_supplier: 'ADD {name}',
                  import_confirm_big_change_row: '{name}: {from} <- {to} ({pct})'
                }) as Record<string, string>
              )[key] ?? key
          }
        },
        {
          provide: UserMsgService,
          useValue: {
            onSetSuccessMsg,
            onSetErrorMsg,
            onLineRemoved: jasmine.createSpy('onLineRemoved')
          }
        },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) }
      ]
    })
    fixture = TestBed.createComponent(ProductImportComponent)
    fixture.detectChanges()
    await fixture.whenStable()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const all = (id: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`))

  async function pasteAndParse(text = 'עגבנייה 6.2'): Promise<void> {
    const box = byId<HTMLTextAreaElement>('import-text')!
    box.value = text
    box.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    byId<HTMLButtonElement>('import-parse')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('marks a matching row to update, an unchanged price as same, otherwise new', async () => {
    await setup(of({ rows: [row('עגבנייה', 6.2), row('מלפפון', 4.5), row('בצל', 3)], truncated: false }))
    fixture.componentInstance['supplierId_'].set('sup1')
    await pasteAndParse()
    expect(all('import-status').map((chip) => chip.textContent?.trim())).toEqual([
      'import_status_update',
      'import_status_same',
      'import_status_new'
    ])
  })

  describe('price rise mark and impact panel (plan 629)', () => {
    const USER_RECIPE = {
      _id: 'r1',
      nameHebrew: 'מתכון בדיקה',
      recipeType: 'dish',
      ingredients: [{ _id: 'i1', type: 'product', referenceId: 'p1', amount: 1, unit: 'kg' }]
    } as unknown as Recipe

    it('marks a 5 → 5.3 row at the default threshold 5 and not a 5 → 5.2 row', async () => {
      await setup(of({ rows: [row('עגבנייה', 5.3), row('מלפפון', 4.6)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      expect(all('import-flag-rise').length).toBe(1)
      expect(all('import-row')[0].querySelector('[data-testid="import-flag-rise"]')).not.toBeNull()
    })

    it('with a stored threshold of 10 a 6% row has no mark', async () => {
      await setup(of({ rows: [row('עגבנייה', 5.3)], truncated: false }))
      storedSettings = { priceRiseAlertPct: 10 }
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      expect(all('import-flag-rise').length).toBe(0)
    })

    it('after a save lists the recipe that uses the product with the cost before and after', async () => {
      await setup(of({ rows: [row('עגבנייה', 6.2)], truncated: false }))
      recipes = [USER_RECIPE]
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      await fixture.componentInstance['saveAll']()
      fixture.detectChanges()
      const text = byId('price-impact')?.textContent ?? ''
      expect(text).toContain('מתכון בדיקה')
      expect(text).toContain('₪10.00')
      expect(text).toContain('₪10.60')
    })

    it('shows the panel with its empty line when no recipe uses the product', async () => {
      await setup(of({ rows: [row('עגבנייה', 6.2)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      await fixture.componentInstance['saveAll']()
      fixture.detectChanges()
      expect(byId('price-impact-none')).not.toBeNull()
    })

    it('shows no panel when no price rose', async () => {
      await setup(of({ rows: [row('עגבנייה', 4)], truncated: false }))
      recipes = [USER_RECIPE]
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      await fixture.componentInstance['saveAll']()
      fixture.detectChanges()
      expect(byId('price-impact')).toBeNull()
    })
  })

  describe('a price set by another supplier (plan 641)', () => {
    const choose = (testId: string, index = 0) => {
      all(testId)[index].click()
      fixture.detectChanges()
    }

    it('shows +42.0%, the rise mark and offers the two choices; saving after the impact lists the recipes', async () => {
      await setup(of({ rows: [row('לחם', 142)], truncated: false }))
      recipes = [
        {
          _id: 'r9',
          nameHebrew: 'כריך',
          recipeType: 'dish',
          ingredients: [{ _id: 'i9', type: 'product', referenceId: 'p4', amount: 1, unit: 'kg' }]
        } as unknown as Recipe
      ]
      fixture.componentInstance['supplierId_'].set('supE')
      await pasteAndParse()
      expect(byId('import-change')?.textContent?.trim()).toBe('+42.0%')
      expect(all('import-flag-rise').length).toBe(1)
      expect(byId('import-old-price')?.textContent).toContain('WAS ₪100.00 AT ווילד בייקרי')
      expect(all('import-choice-update').length).toBe(1)
      expect(all('import-choice-add').length).toBe(1)
      await fixture.componentInstance['saveAll']()
      fixture.detectChanges()
      expect(byId('price-impact')?.textContent).toContain('כריך')
    })

    it('defaults to adding the invoice supplier when the names differ, and sends no target', async () => {
      await setup(of({ rows: [row('לחם', 142)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supE')
      await pasteAndParse()
      expect((all('import-choice-add')[0] as HTMLInputElement).checked).toBeTrue()
      await fixture.componentInstance['saveAll']()
      expect(apply.calls.mostRecent().args[1][0].targetSupplierId).toBeUndefined()
    })

    it('offers only update when both suppliers have the same trimmed name, and sends the target (plan 645)', async () => {
      await setup(of({ rows: [row('לחם', 142)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supB')
      await pasteAndParse()
      expect(all('import-choice-update').length).toBe(1)
      expect((all('import-choice-update')[0] as HTMLInputElement).checked).toBeTrue()
      expect(all('import-choice-add').length).toBe(0)
      await fixture.componentInstance['saveAll']()
      expect(apply.calls.mostRecent().args[1][0].targetSupplierId).toBe('supA')
    })

    it('the same name in another case is the same supplier too; an old "add" pick cannot win (plan 645)', async () => {
      await setup(of({ rows: [row('קמח', 10.2)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supG')
      await pasteAndParse()
      expect(all('import-choice-update').length).toBe(1)
      expect(all('import-choice-add').length).toBe(0)
      fixture.componentInstance['setChoice'](fixture.componentInstance['rows_']()[0].id, 'add')
      fixture.detectChanges()
      expect(all('import-choice-add').length).toBe(0)
      await fixture.componentInstance['saveAll']()
      expect(apply.calls.mostRecent().args[1][0].targetSupplierId).toBe('supF')
    })

    it('different names still offer both choices (plan 645)', async () => {
      await setup(of({ rows: [row('קמח', 10.2)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supE')
      await pasteAndParse()
      expect(all('import-choice-update').length).toBe(1)
      expect(all('import-choice-add').length).toBe(1)
    })

    it('choosing update sends the target, choosing add sends none, and the pick survives editing the row', async () => {
      await setup(of({ rows: [row('לחם', 142)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supE')
      await pasteAndParse()
      choose('import-choice-update')
      fixture.componentInstance['setPrice'](fixture.componentInstance['rows_']()[0].id, 150)
      fixture.detectChanges()
      expect((all('import-choice-update')[0] as HTMLInputElement).checked).toBeTrue()
      await fixture.componentInstance['saveAll']()
      expect(apply.calls.mostRecent().args[1][0].targetSupplierId).toBe('supA')

      await pasteAndParse()
      choose('import-choice-add')
      await fixture.componentInstance['saveAll']()
      expect(apply.calls.mostRecent().args[1][0].targetSupplierId).toBeUndefined()
    })

    it('a product priced by the invoice supplier itself shows no choice', async () => {
      await setup(of({ rows: [row('שמן', 25)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supB')
      await pasteAndParse()
      expect(byId('import-change')?.textContent?.trim()).toBe('+25.0%')
      expect(byId('import-choice')).toBeNull()
    })

    it('compares with the lowest of two other suppliers and names it', async () => {
      await setup(of({ rows: [row('חלב', 121)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('supE')
      await pasteAndParse()
      expect(byId('import-change')?.textContent?.trim()).toBe('+10.0%')
      expect(byId('import-old-price')?.textContent).toContain('WAS ₪110.00 AT מחלבת ד')
      expect(byId('import-choice')?.textContent).toContain('מחלבת ד')
      expect(byId('import-choice')?.textContent).not.toContain('מחלבת ג')
    })
  })

  describe('a change beyond the threshold asks first (plan 645)', () => {
    const bigRows = () => [row('עגבנייה', 5.3), row('מלפפון', 4.23), row('פטרוזיליה', 7.2)]

    it('one confirm lists the rise and the drop with old price, new price and percent; cancel sends nothing', async () => {
      await setup(of({ rows: bigRows(), truncated: false }))
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      confirmOpen.and.resolveTo(false)
      await fixture.componentInstance['saveAll']()
      expect(confirmOpen).toHaveBeenCalledTimes(1)
      const [message, options] = confirmOpen.calls.mostRecent().args as [string, Record<string, string>]
      expect(message.split('\n')).toEqual(['עגבנייה: ₪5.00 <- ₪5.30 (+6.0%)', 'מלפפון: ₪4.50 <- ₪4.23 (-6.0%)'])
      expect(options['headerKey']).toBe('import_confirm_big_change_title')
      expect(options['saveLabel']).toBe('import_confirm_big_change_ok')
      expect(apply).not.toHaveBeenCalled()
      expect(fixture.componentInstance['rows_']().length).toBe(3)
    })

    it('confirm sends the apply', async () => {
      await setup(of({ rows: bigRows(), truncated: false }))
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      await fixture.componentInstance['saveAll']()
      expect(confirmOpen).toHaveBeenCalledTimes(1)
      expect(apply).toHaveBeenCalledTimes(1)
    })

    it('rows within the threshold save without a confirm', async () => {
      await setup(of({ rows: [row('עגבנייה', 5.2), row('מלפפון', 4.4)], truncated: false }))
      fixture.componentInstance['supplierId_'].set('sup1')
      await pasteAndParse()
      await fixture.componentInstance['saveAll']()
      expect(confirmOpen).not.toHaveBeenCalled()
      expect(apply).toHaveBeenCalledTimes(1)
    })
  })

  it('compares the price with the chosen supplier only', async () => {
    await setup(of({ rows: [row('מלפפון', 4.5)], truncated: false }))
    fixture.componentInstance['supplierId_'].set('other-supplier')
    await pasteAndParse()
    expect(all('import-status').map((chip) => chip.textContent?.trim())).toEqual(['import_status_update'])
  })

  it('deleting a row adds one to skipped, and save sends one request with the kept rows', async () => {
    await setup(of({ rows: [row('עגבנייה', 6.2), row('מלפפון', 4.5), row('בצל', 3)], truncated: false }))
    await pasteAndParse()
    all('import-delete')[1].click()
    fixture.detectChanges()
    expect(all('import-row').length).toBe(2)

    byId<HTMLButtonElement>('import-save')!.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(apply).toHaveBeenCalledTimes(1)
    const [supplierId, sent] = apply.calls.mostRecent().args
    expect(supplierId).toBeNull()
    expect(sent.map((r: { name: string }) => r.name)).toEqual(['עגבנייה', 'בצל'])
    // the server's 1 skipped + the 1 row deleted in the preview
    expect(byId('import-summary')?.textContent).toContain('1 import_created, 1 import_updated, 2 import_skipped')
    expect(onSetSuccessMsg).toHaveBeenCalledWith('1 import_created, 1 import_updated, 2 import_skipped')
  })

  it('sends the chosen supplier and the edited unit of a new row', async () => {
    await setup(of({ rows: [row('בצל', 3)], truncated: false }))
    fixture.componentInstance['supplierId_'].set('sup1')
    await pasteAndParse()
    const id = fixture.componentInstance['rows_']()[0].id
    fixture.componentInstance['updateRow'](id, { baseUnit: 'liter' })
    fixture.detectChanges()
    byId<HTMLButtonElement>('import-save')!.click()
    await fixture.whenStable()
    const [supplierId, sent] = apply.calls.mostRecent().args
    expect(supplierId).toBe('sup1')
    expect(sent[0]).toEqual(jasmine.objectContaining({ name: 'בצל', baseUnit: 'liter', price: 3, category: null }))
  })

  it('on an AI 429 the pasted text stays and the daily-limit message is shown', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 429, error: { error: 'daily_limit_reached' } })))
    await pasteAndParse('עגבנייה 6.2')
    expect(byId<HTMLTextAreaElement>('import-text')!.value).toBe('עגבנייה 6.2')
    expect(byId('import-error')?.textContent?.trim()).toBe('ai_daily_limit_reached_all')
    expect(byId('import-preview')).toBeNull()
  })

  it('on the monthly cap refusal the monthly cap message is shown (plan 620)', async () => {
    await setup(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' }
          })
      )
    )
    await pasteAndParse('עגבנייה 6.2')
    expect(byId('import-error')?.textContent?.trim()).toBe('ai_monthly_cap_reached')
  })

  it('any other AI failure shows import_ai_failed and keeps the text', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 502 })))
    await pasteAndParse('x')
    expect(byId('import-error')?.textContent?.trim()).toBe('import_ai_failed')
    expect(byId<HTMLTextAreaElement>('import-text')!.value).toBe('x')
  })

  it('shows import_nothing_found for zero rows and import_truncated for a cut list', async () => {
    await setup(of({ rows: [], truncated: false }))
    await pasteAndParse()
    expect(byId('import-error')?.textContent?.trim()).toBe('import_nothing_found')
    TestBed.resetTestingModule()

    await setup(of({ rows: [row('בצל', 3)], truncated: true }))
    await pasteAndParse()
    expect(byId('import-truncated')).not.toBeNull()
  })

  it('shows the row flags', async () => {
    await setup(of({ rows: [row('בצל', 3, { needsReview: true, duplicate: true })], truncated: false }))
    await pasteAndParse()
    expect(byId('import-flag-review')).not.toBeNull()
    expect(byId('import-flag-duplicate')).not.toBeNull()
  })

  it('shows the old price next to the new one and keeps the name an input', async () => {
    await setup(of({ rows: [row('עגבניות', 6.2)], truncated: false }))
    fixture.componentInstance['supplierId_'].set('sup1')
    await pasteAndParse()
    expect(all('import-status').map((chip) => chip.textContent?.trim())).toEqual(['import_status_update'])
    expect(byId('import-old-price')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('import_old_price ₪5.00')
    expect(byId('import-name')?.tagName).toBe('INPUT')
    expect(byId('import-matches')?.textContent).toContain('עגבנייה')
  })

  it('re-matches while typing in the same input, and a nonsense name goes back to new', async () => {
    await setup(of({ rows: [row('פטרוזליה', 7)], truncated: false }))
    fixture.componentInstance['supplierId_'].set('sup1')
    await pasteAndParse()
    const input = byId<HTMLInputElement>('import-name')!
    const type = (value: string) => {
      input.value = value
      input.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    // the misspelling is a spelling variant of the stored name: matched at once (same price -> same)
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_same')
    type('גבגדכשדגכ')
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_new')
    type('פטרוזיליה')
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_same')
    expect(byId<HTMLInputElement>('import-name')).toBe(input)
    fixture.componentInstance['setPrice'](fixture.componentInstance['rows_']()[0].id, 8)
    fixture.detectChanges()
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_update')
    expect(byId('import-old-price')?.textContent).toContain('₪7.00')
  })

  it('marks a row the AI matched, and editing the name drops the AI link', async () => {
    await setup(of({ rows: [row('xyz', 6)], truncated: false }), true, () =>
      Promise.resolve(new Map([['1', { product: PRODUCTS[1], via: 'ai' as const }]]))
    )
    fixture.componentInstance['supplierId_'].set('sup1')
    await pasteAndParse()
    expect(matchNames).toHaveBeenCalledTimes(1)
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_update')
    expect(byId('import-matches')?.textContent).toContain('מלפפון')
    fixture.componentInstance['updateRow'](fixture.componentInstance['rows_']()[0].id, { name: 'xyzw' })
    fixture.detectChanges()
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_new')
    expect(byId('import-matches')).toBeNull()
  })

  it('saves the matched product own name for a variant row and the typed name for a new row', async () => {
    await setup(of({ rows: [row('עגבניות', 6.2), row('בצל', 3)], truncated: false }))
    await pasteAndParse()
    byId<HTMLButtonElement>('import-save')!.click()
    await fixture.whenStable()
    const sent = apply.calls.mostRecent().args[1] as { name: string }[]
    expect(sent.map((r) => r.name)).toEqual(['עגבנייה', 'בצל'])
  })

  it('disables save and shows import_matching while the AI step runs', async () => {
    let release: (m: Map<string, NameMatchResult>) => void = () => undefined
    await setup(
      of({ rows: [row('בצל', 3)], truncated: false }),
      true,
      () => new Promise((resolve) => (release = resolve))
    )
    await pasteAndParse()
    expect(byId('import-matching')?.textContent?.trim()).toBe('import_matching')
    expect(byId<HTMLButtonElement>('import-save')!.disabled).toBeTrue()
    release(new Map())
    await fixture.whenStable()
    fixture.detectChanges()
    expect(byId('import-matching')).toBeNull()
    expect(byId<HTMLButtonElement>('import-save')!.disabled).toBeFalse()
  })

  it('plan 478: unsettled rows show matching until the AI answers, then their final status, never new first', async () => {
    let release: (m: Map<string, NameMatchResult>) => void = () => undefined
    await setup(
      of({ rows: [row('xyz', 6), row('qqq', 3), row('מלפפון', 4.5)], truncated: false }),
      true,
      () => new Promise((resolve) => (release = resolve))
    )
    fixture.componentInstance['supplierId_'].set('sup1')
    const seen: string[][] = []
    const snap = () => seen.push(all('import-status').map((chip) => chip.textContent?.trim() ?? ''))
    await pasteAndParse()
    snap()
    expect(seen[0]).toEqual(['import_status_matching', 'import_status_matching', 'import_status_same'])
    expect(all('import-unit').length).toBe(0)
    expect(all('import-category').length).toBe(0)
    expect(all('import-purchase-unit').length).toBe(0)
    release(new Map([['1', { product: PRODUCTS[0], via: 'ai' as const }]]))
    await fixture.whenStable()
    fixture.detectChanges()
    snap()
    expect(seen[1]).toEqual(['import_status_update', 'import_status_new', 'import_status_same'])
    expect(seen[0]).not.toContain('import_status_new')
    expect(all('import-unit').length).toBe(1)
  })

  it('plan 478: a failed AI call turns matching rows into new and shows the failure hint', async () => {
    await setup(of({ rows: [row('בצל', 3)], truncated: false }))
    matchNames.and.callFake(async (_items: NameMatchItem[], options?: { onAiFailure?: (e: unknown) => void }) => {
      await Promise.resolve()
      options?.onAiFailure?.(new Error('x'))
      return new Map()
    })
    await pasteAndParse()
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_new')
    expect(byId('import-match-failed')?.textContent?.trim()).toBe('import_match_failed')
  })

  it('shows import_match_failed and keeps the rows new when the AI step fails', async () => {
    await setup(of({ rows: [row('בצל', 3)], truncated: false }))
    matchNames.and.callFake(async (_items: NameMatchItem[], options?: { onAiFailure?: (e: unknown) => void }) => {
      options?.onAiFailure?.(new Error('x'))
      return new Map()
    })
    await pasteAndParse()
    expect(byId('import-match-failed')?.textContent?.trim()).toBe('import_match_failed')
    expect(all('import-status')[0].textContent?.trim()).toBe('import_status_new')
  })

  it('flags an unknown pack word on a new row only', async () => {
    await setup(
      of({
        rows: [
          row('בצל', 3, { purchaseUnit: 'עוהל', purchaseQty: 1 }),
          row('חסה', 2, { purchaseUnit: 'crate', purchaseQty: 10 })
        ],
        truncated: false
      })
    )
    await pasteAndParse()
    expect(all('import-flag-unknown-unit').length).toBe(1)
    expect(all('import-row')[0].querySelector('[data-testid="import-flag-unknown-unit"]')).not.toBeNull()
  })

  it('plan 489: a row trashed while the AI step runs never reaches the save request', async () => {
    let release: (m: Map<string, NameMatchResult>) => void = () => undefined
    await setup(
      of({ rows: [row('גזר', 3), row('כרפס', 2, { baseUnit: 'unit' })], truncated: false }),
      true,
      () => new Promise((resolve) => (release = resolve))
    )
    await pasteAndParse('גזר 3\nכרפס 2')
    expect(byId('import-matching')).not.toBeNull()
    all('import-delete')[0].click()
    fixture.detectChanges()
    release(new Map())
    await fixture.whenStable()
    fixture.detectChanges()
    const comp = fixture.componentInstance as unknown as {
      updateRow: (id: number, patch: { baseUnit: string }) => void
      view_: () => { row: { id: number } }[]
    }
    comp.updateRow(comp.view_()[0].row.id, { baseUnit: 'gram' })
    fixture.detectChanges()
    byId<HTMLButtonElement>('import-save')!.click()
    await fixture.whenStable()
    expect(apply).toHaveBeenCalledTimes(1)
    const sent = apply.calls.mostRecent().args[1] as { name: string; baseUnit: string }[]
    expect(sent.length).toBe(1)
    expect(sent[0].name).toBe('כרפס')
    expect(sent[0].baseUnit).toBe('gram')
    expect(onSetSuccessMsg).toHaveBeenCalled()
    expect(fixture.componentInstance['summary_']()?.skipped).toBe(2)
  })

  it('plan 489: while saving, row controls are disabled and removeRow changes nothing', async () => {
    await setup(of({ rows: [row('גזר', 3), row('כרפס', 2)], truncated: false }))
    let finish: (v: unknown) => void = () => undefined
    apply.and.returnValue(new Promise((resolve) => (finish = resolve)))
    await pasteAndParse('גזר 3\nכרפס 2')
    byId<HTMLButtonElement>('import-save')!.click()
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(all('import-delete').every((b) => (b as HTMLButtonElement).disabled)).toBeTrue()
    expect(all('import-name').every((b) => (b as HTMLInputElement).disabled)).toBeTrue()
    expect(all('import-price').every((b) => (b as HTMLInputElement).disabled)).toBeTrue()
    const comp = fixture.componentInstance as unknown as {
      removeRow: (id: number) => void
      rows_: () => { id: number }[]
      deleted_: () => number
    }
    comp.removeRow(comp.rows_()[0].id)
    expect(comp.rows_().length).toBe(2)
    expect(comp.deleted_()).toBe(0)
    finish({ created: 2, updated: 0, skipped: 0, skippedRows: [] })
    await fixture.whenStable()
  })

  it('plan 489: the header delete label uses visually-hidden, not a page-local class', async () => {
    await setup(of({ rows: [row('גזר', 3)], truncated: false }))
    await pasteAndParse('גזר 3')
    expect(el().querySelector('th .visually-hidden')).not.toBeNull()
    expect(el().querySelector('[class*="sr-only"]')).toBeNull()
  })

  it('hasRealChanges: false when empty, true with text or rows, false after a save', async () => {
    await setup(of({ rows: [row('בצל', 3)], truncated: false }))
    const cmp = fixture.componentInstance
    expect(cmp.hasRealChanges()).toBeFalse()
    const box = byId<HTMLTextAreaElement>('import-text')!
    box.value = 'בצל 3'
    box.dispatchEvent(new Event('input'))
    expect(cmp.hasRealChanges()).toBeTrue()
    fixture.detectChanges()
    byId<HTMLButtonElement>('import-parse')!.click()
    await fixture.whenStable()
    cmp['text_'].set('')
    expect(cmp.hasRealChanges()).toBeTrue()
    fixture.detectChanges()
    byId<HTMLButtonElement>('import-save')!.click()
    await fixture.whenStable()
    expect(cmp.hasRealChanges()).toBeFalse()
  })

  it('for a user without editMoney shows only the no-permission message', async () => {
    await setup(of({ rows: [], truncated: false }), false)
    expect(byId('import-forbidden')?.textContent).toContain('no_permission')
    expect(byId('import-text')).toBeNull()
  })

  describe('invoice file (plan 628)', () => {
    const receiptFile = () => new File(['x'], 'receipt.jpg', { type: 'image/jpeg' })

    async function choosePhoto(
      testId: 'import-photo-camera-input' | 'import-photo-upload-input',
      file = receiptFile()
    ) {
      const input = byId<HTMLInputElement>(testId)!
      const transfer = new DataTransfer()
      transfer.items.add(file)
      input.files = transfer.files
      input.dispatchEvent(new Event('change'))
      await fixture.whenStable()
      fixture.detectChanges()
    }

    it('shows a camera button (capture) and an upload button (no capture), the upload one takes a PDF too', async () => {
      await setup(of({ rows: [], truncated: false }))
      const camera = byId<HTMLInputElement>('import-photo-camera-input')!
      const upload = byId<HTMLInputElement>('import-photo-upload-input')!
      expect(camera.getAttribute('capture')).toBe('environment')
      expect(camera.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
      expect(upload.hasAttribute('capture')).toBeFalse()
      expect(upload.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp,application/pdf')
      expect(byId('import-photo-camera')?.textContent).toContain('import_photo_camera')
      expect(byId('import-photo-upload')?.textContent).toContain('import_file_upload')
      expect(byId('import-photo-privacy')?.textContent?.trim()).toBe('invoice_file_privacy')
    })

    it('a chosen photo is read once, fills the preview, shows the hint, counts one use and leaves the text box alone', async () => {
      await setup(of({ rows: [], truncated: false }))
      readInvoice.and.resolveTo(readResult([row('בצל', 3.5), row('גזר', 4)]))
      const box = byId<HTMLTextAreaElement>('import-text')!
      box.value = 'my pasted text'
      box.dispatchEvent(new Event('input'))
      const before = getGeminiUsage().count

      const file = receiptFile()
      await choosePhoto('import-photo-camera-input', file)

      expect(readInvoice).toHaveBeenCalledTimes(1)
      expect(readInvoice.calls.mostRecent().args[0]).toBe(file)
      expect(all('import-row').length).toBe(2)
      expect(byId('import-photo-hint')?.textContent?.trim()).toBe('import_file_check_hint')
      expect(getGeminiUsage().count).toBe(before + 1)
      expect(byId<HTMLTextAreaElement>('import-text')!.value).toBe('my pasted text')
      expect(parsePriceList).not.toHaveBeenCalled()
    })

    it('the hint goes away after the next pasted-text read', async () => {
      await setup(of({ rows: [row('בצל', 3)], truncated: false }))
      readInvoice.and.resolveTo(readResult([row('גזר', 4)]))
      await choosePhoto('import-photo-upload-input')
      expect(byId('import-photo-hint')).not.toBeNull()
      await pasteAndParse('בצל 3')
      expect(byId('import-photo-hint')).toBeNull()
    })

    it('photo rows get the same name matching as pasted rows', async () => {
      await setup(of({ rows: [], truncated: false }))
      readInvoice.and.resolveTo(readResult([row('עגבניות', 6.2)]))
      await choosePhoto('import-photo-upload-input')
      expect(all('import-status').map((chip) => chip.textContent?.trim())).toEqual(['import_status_update'])
    })

    const failures: [string, () => Promise<never>, string][] = [
      ['HTTP 429', () => Promise.reject(new HttpErrorResponse({ status: 429 })), 'ai_daily_limit_reached_all'],
      [
        'daily_limit_reached',
        () => Promise.reject(new HttpErrorResponse({ status: 400, error: { error: 'daily_limit_reached' } })),
        'ai_daily_limit_reached_all'
      ],
      ['FILE_TOO_LARGE', () => Promise.reject(new Error('FILE_TOO_LARGE')), 'import_file_too_big'],
      ['HTTP 413', () => Promise.reject(new HttpErrorResponse({ status: 413 })), 'import_file_too_big'],
      ['FILE_TYPE_UNSUPPORTED', () => Promise.reject(new Error('FILE_TYPE_UNSUPPORTED')), 'import_file_unsupported'],
      [
        'UNSUPPORTED_FILE_TYPE',
        () => Promise.reject(new HttpErrorResponse({ status: 400, error: { error: 'UNSUPPORTED_FILE_TYPE' } })),
        'import_file_unsupported'
      ],
      [
        'ai_monthly_cap_reached',
        () => Promise.reject(new HttpErrorResponse({ status: 429, error: { error: 'ai_monthly_cap_reached' } })),
        'ai_monthly_cap_reached'
      ],
      ['any other failure', () => Promise.reject(new HttpErrorResponse({ status: 502 })), 'import_file_failed']
    ]
    for (const [label, fail, messageKey] of failures) {
      it(`${label} shows ${messageKey} and keeps the existing preview rows`, async () => {
        await setup(of({ rows: [row('בצל', 3), row('גזר', 4)], truncated: false }))
        await pasteAndParse('בצל 3')
        expect(all('import-row').length).toBe(2)

        readInvoice.and.callFake(fail)
        await choosePhoto('import-photo-camera-input')

        expect(byId('import-error')?.textContent?.trim()).toBe(messageKey)
        expect(all('import-row').length).toBe(2)
        expect(byId('import-photo-hint')).toBeNull()
      })
    }

    it('an empty photo result shows import_nothing_found and the paste box still works', async () => {
      await setup(of({ rows: [row('בצל', 3)], truncated: false }))
      readInvoice.and.resolveTo(readResult([]))
      await choosePhoto('import-photo-camera-input')
      expect(byId('import-error')?.textContent?.trim()).toBe('import_nothing_found')
      await pasteAndParse('בצל 3')
      expect(all('import-row').length).toBe(1)
      expect(byId('import-error')).toBeNull()
    })

    describe('header, memory and the invoice save', () => {
      const withRead = (rows: ImportRow[], extra: Partial<InvoiceReadResult> = {}) =>
        readInvoice.and.resolveTo(readResult(rows, extra))

      async function readFile(file = receiptFile()) {
        await choosePhoto('import-photo-upload-input', file)
      }

      const clickSave = async () => {
        byId<HTMLButtonElement>('import-save')!.click()
        await fixture.whenStable()
        fixture.detectChanges()
      }

      it('a PDF chosen in the upload input calls readInvoice once and fills the preview', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('בצל', 3)])
        const pdf = new File(['%PDF'], 'i.pdf', { type: 'application/pdf' })
        await readFile(pdf)
        expect(readInvoice).toHaveBeenCalledTimes(1)
        expect(readInvoice.calls.mostRecent().args[0]).toBe(pdf)
        expect(all('import-row').length).toBe(1)
        expect(byId('invoice-strip')).not.toBeNull()
        expect(byId('import-supplier')).toBeNull()
      })

      it('asks memory once with the supplier key and every name, and the model only for the rest', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('שם מודפס א', 3), row('שם מודפס ב', 4), row('שם מודפס ג', 5)], {
          supplier: { supplierKey: 'tax:123456789' }
        })
        resolve.and.resolveTo([{ i: 1, productId: 'p2', source: 'own' }])
        await readFile()
        expect(resolve).toHaveBeenCalledTimes(1)
        expect(resolve).toHaveBeenCalledWith('tax:123456789', ['שם מודפס א', 'שם מודפס ב', 'שם מודפס ג'])
        expect(matchNames).toHaveBeenCalledTimes(1)
        expect((matchNames.calls.mostRecent().args[0] as NameMatchItem[]).map((i) => i.name)).toEqual([
          'שם מודפס א',
          'שם מודפס ג'
        ])
        expect(all('import-matches').map((m) => m.textContent?.trim())).toEqual(['import_matches_existing מלפפון'])
      })

      it('makes no model call when memory settled every name', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('שם א', 3), row('שם ב', 4)])
        resolve.and.resolveTo([
          { i: 0, productId: 'p1', source: 'own' },
          { i: 1, productId: 'p2', source: 'shared' }
        ])
        await readFile()
        expect(matchNames).not.toHaveBeenCalled()
      })

      it('a failed resolve still asks the model for every unmatched name and shows no error', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('שם א', 3), row('שם ב', 4)])
        resolve.and.rejectWith(new HttpErrorResponse({ status: 500 }))
        await readFile()
        expect(matchNames).toHaveBeenCalledTimes(1)
        expect((matchNames.calls.mostRecent().args[0] as NameMatchItem[]).length).toBe(2)
        expect(byId('import-error')).toBeNull()
      })

      it('shows +6.0% for 5 → 5.3, -4.0% for 5 → 4.8 and nothing for a new row', async () => {
        await setup(of({ rows: [row('עגבנייה', 5.3), row('מלפפון', 4.32), row('בצל', 3)], truncated: false }))
        fixture.componentInstance['supplierId_'].set('sup1')
        await pasteAndParse()
        expect(all('import-change').map((c) => c.textContent?.trim())).toEqual(['+6.0%', '-4.0%'])
        // Plan 645: the change sits in a chip — red when the price rises, green when it drops.
        expect(all('import-change')[0].classList).toContain('c-chip')
        expect(all('import-change')[0].classList).toContain('c-chip--red')
        expect(all('import-change')[1].classList).toContain('c-chip')
        expect(all('import-change')[1].classList).toContain('c-chip--green')
      })

      it('a row with old price 5 and new price 4.8 shows -4.0%', async () => {
        await setup(of({ rows: [row('עגבנייה', 4.8)], truncated: false }))
        fixture.componentInstance['supplierId_'].set('sup1')
        await pasteAndParse()
        expect(byId('import-change')?.textContent?.trim()).toBe('-4.0%')
      })

      it('the save after a file read sends the invoice with the edited header and one line per kept row', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('שם א', 3), row('שם ב', 4), row('שם ג', 5)], {
          header: {
            supplierName: 'ירקות בע״מ',
            supplierTaxId: '123456789',
            invoiceDate: '2026-11-01',
            vatIncluded: true
          },
          supplier: { supplierId: 'sup1', matchedBy: 'taxId', supplierKey: 'tax:123456789' },
          printed: [{ name: 'שם ג', quantity: 2, unit: 'kg', unitPrice: 5, lineTotal: 10 }],
          draftId: 'd1',
          fileId: 'f1'
        })
        await readFile(new File(['%PDF'], 'i.pdf', { type: 'application/pdf' }))
        fixture.componentInstance['invoiceNumber_'].set('  INV-1 ')
        fixture.componentInstance['invoiceDate_'].set('2026-11-02')
        byId<HTMLButtonElement>('import-delete')!.click() // the first row
        fixture.detectChanges()
        await clickSave()
        const [supplierId, rows, invoice] = apply.calls.mostRecent().args
        expect(supplierId).toBe('sup1')
        expect(rows.length).toBe(2)
        expect(invoice).toEqual({
          supplierName: 'ירקן',
          supplierTaxId: '123456789',
          invoiceNumber: 'INV-1',
          invoiceDate: '2026-11-02',
          vatIncluded: true,
          source: 'pdf',
          fileId: 'f1',
          draftId: 'd1',
          supplierKey: 'tax:123456789',
          lines: [
            { printedName: 'שם ב', needsReview: false, row: 0 },
            { printedName: 'שם ג', needsReview: false, row: 1, quantity: 2, unit: 'kg', unitPrice: 5, lineTotal: 10 }
          ]
        })
      })

      it('a row deleted before saving after a file read has no invoice line', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('שם א', 3), row('שם ב', 4), row('שם ג', 5)], {
          supplier: { supplierId: 'sup1', supplierKey: 'name:ירקן' }
        })
        await readFile()
        byId<HTMLButtonElement>('import-delete')!.click() // the first row
        fixture.detectChanges()
        await clickSave()
        const [, rows, invoice] = apply.calls.mostRecent().args
        expect(rows.length).toBe(2)
        const names = invoice.lines.map((l: { printedName: string }) => l.printedName)
        expect(names).toEqual(['שם ב', 'שם ג'])
        expect(names).not.toContain('שם א')
        expect(invoice.lines.map((l: { row: number }) => l.row)).toEqual([0, 1])
      })

      it('the save after a pasted list sends no invoice', async () => {
        await setup(of({ rows: [row('בצל', 3)], truncated: false }))
        await pasteAndParse('בצל 3')
        await clickSave()
        expect(apply.calls.mostRecent().args[2]).toBeUndefined()
        expect(resolve).not.toHaveBeenCalled()
      })

      it('a paste after a file read clears the strip', async () => {
        await setup(of({ rows: [row('בצל', 3)], truncated: false }))
        withRead([row('גזר', 4)])
        await readFile()
        expect(byId('invoice-strip')).not.toBeNull()
        await pasteAndParse('בצל 3')
        expect(byId('invoice-strip')).toBeNull()
        expect(byId('import-supplier')).not.toBeNull()
      })

      it('with no supplier chosen and none printed the save is disabled and the message shows', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('בצל', 3)])
        await readFile()
        expect(byId<HTMLButtonElement>('import-save')!.disabled).toBeTrue()
        expect(byId('invoice-supplier-required')).not.toBeNull()
        expect(byId('invoice-supplier-required')!.textContent).toContain('invoice_supplier_required')
      })

      it('a printed supplier name is enough to save', async () => {
        await setup(of({ rows: [], truncated: false }))
        withRead([row('בצל', 3)], { header: { supplierName: 'ספק מודפס' } })
        await readFile()
        expect(byId<HTMLButtonElement>('import-save')!.disabled).toBeFalse()
        await clickSave()
        expect(apply.calls.mostRecent().args[2].supplierName).toBe('ספק מודפס')
      })

      it('a save answered with invoiceId null shows the summary and the invoice_trail_failed message', async () => {
        await setup(of({ rows: [], truncated: false }))
        apply.and.resolveTo({ created: 1, updated: 0, skipped: 0, skippedRows: [], invoiceId: null })
        withRead([row('בצל', 3)], { supplier: { supplierId: 'sup1', supplierKey: 'name:ירקן' } })
        await readFile()
        await clickSave()
        expect(onSetSuccessMsg).toHaveBeenCalledTimes(1)
        expect(onSetErrorMsg).toHaveBeenCalledWith('invoice_trail_failed')
        expect(byId('invoice-strip')).toBeNull()
      })
    })
  })

  describe('embedded mode (plan 634)', () => {
    const invoiceFile = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' })
    const setInput = async (name: 'embedded' | 'file', value: unknown) => {
      fixture.componentRef.setInput(name, value)
      fixture.detectChanges()
      await fixture.whenStable()
      fixture.detectChanges()
    }

    it('embedded hides the page header and the paste box; the routed page keeps them', async () => {
      await setup(of({ rows: [], truncated: false }))
      expect(el().querySelector('app-page-header')).not.toBeNull()
      expect(byId('import-text')).not.toBeNull()
      await setInput('embedded', true)
      expect(el().querySelector('app-page-header')).toBeNull()
      expect(byId('import-text')).toBeNull()
    })

    it('a file input is read once per file object, and null drops the preview', async () => {
      await setup(of({ rows: [], truncated: false }))
      readInvoice.and.resolveTo(readResult([row('בצל', 3)]))
      const file = invoiceFile()
      await setInput('embedded', true)
      await setInput('file', file)
      expect(readInvoice).toHaveBeenCalledTimes(1)
      expect(readInvoice.calls.mostRecent().args[0]).toBe(file)
      expect(all('import-row').length).toBe(1)
      await setInput('file', file)
      expect(readInvoice).toHaveBeenCalledTimes(1)
      await setInput('file', null)
      expect(all('import-row').length).toBe(0)
    })

    it('applied is emitted after a save, with the invoice id (null when no invoice was recorded)', async () => {
      await setup(of({ rows: [], truncated: false }))
      apply.and.resolveTo({ created: 1, updated: 0, skipped: 0, skippedRows: [], invoiceId: 'inv1' })
      readInvoice.and.resolveTo(
        readResult([row('בצל', 3)], { supplier: { supplierId: 'sup1', supplierKey: 'name:ירקן' } })
      )
      const emitted: Array<{ invoiceId: string | null }> = []
      fixture.componentInstance.applied.subscribe((value) => emitted.push(value))
      await setInput('embedded', true)
      await setInput('file', invoiceFile())
      byId<HTMLButtonElement>('import-save')!.click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(emitted).toEqual([{ invoiceId: 'inv1' }])
    })
  })
})
