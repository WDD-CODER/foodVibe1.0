import { signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { Observable, of, throwError } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { GeminiService } from '@services/gemini.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { PermissionService } from '@services/permission.service'
import { ImportRow, ProductImportService } from '@services/product-import.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
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

const PRODUCTS = [
  { _id: 'p1', nameHebrew: 'עגבנייה', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 5 }] },
  { _id: 'p2', nameHebrew: 'מלפפון', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 4.5 }] }
]

describe('ProductImportComponent', () => {
  let fixture: ComponentFixture<ProductImportComponent>
  let parsePriceList: jasmine.Spy
  let apply: jasmine.Spy
  let onSetSuccessMsg: jasmine.Spy
  let allowed: boolean

  async function setup(parsed: Observable<unknown>, can = true): Promise<void> {
    allowed = can
    parsePriceList = jasmine.createSpy('parsePriceList').and.returnValue(parsed)
    apply = jasmine.createSpy('apply').and.resolveTo({ created: 1, updated: 1, skipped: 1, skippedRows: [] })
    onSetSuccessMsg = jasmine.createSpy('onSetSuccessMsg')
    TestBed.configureTestingModule({
      imports: [ProductImportComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: GeminiService, useValue: { parsePriceList } },
        { provide: ProductImportService, useValue: { apply } },
        {
          provide: KitchenStateService,
          useValue: {
            products_: signal(PRODUCTS),
            suppliers_: signal([{ _id: 'sup1', nameHebrew: 'ירקן' }])
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
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: UserMsgService, useValue: { onSetSuccessMsg, onSetErrorMsg: jasmine.createSpy('onSetErrorMsg') } },
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

  it('for a user without editMoney shows only the no-permission message', async () => {
    await setup(of({ rows: [], truncated: false }), false)
    expect(byId('import-forbidden')?.textContent).toContain('no_permission')
    expect(byId('import-text')).toBeNull()
  })
})
