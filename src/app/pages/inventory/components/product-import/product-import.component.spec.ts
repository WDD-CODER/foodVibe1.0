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

const PRODUCTS = [
  { _id: 'p1', nameHebrew: 'עגבנייה', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 5 }] },
  { _id: 'p2', nameHebrew: 'מלפפון', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 4.5 }] },
  { _id: 'p3', nameHebrew: 'פטרוזיליה', baseUnit: 'kg', sources: [{ supplierId: 'sup1', price: 7 }] }
] as unknown as Product[]

describe('ProductImportComponent', () => {
  let fixture: ComponentFixture<ProductImportComponent>
  let parsePriceList: jasmine.Spy
  let apply: jasmine.Spy
  let onSetSuccessMsg: jasmine.Spy
  let allowed: boolean
  let matchNames: jasmine.Spy
  let parseReceiptPhoto: jasmine.Spy

  async function setup(
    parsed: Observable<unknown>,
    can = true,
    aiAnswer: () => Promise<Map<string, NameMatchResult>> = () => Promise.resolve(new Map())
  ): Promise<void> {
    allowed = can
    matchNames = jasmine.createSpy('matchNames').and.callFake((_items: NameMatchItem[]) => aiAnswer())
    parsePriceList = jasmine.createSpy('parsePriceList').and.returnValue(parsed)
    parseReceiptPhoto = jasmine.createSpy('parseReceiptPhoto').and.resolveTo({ rows: [], truncated: false })
    apply = jasmine.createSpy('apply').and.resolveTo({ created: 1, updated: 1, skipped: 1, skippedRows: [] })
    onSetSuccessMsg = jasmine.createSpy('onSetSuccessMsg')
    TestBed.configureTestingModule({
      imports: [ProductImportComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: GeminiService, useValue: { parsePriceList, parseReceiptPhoto } },
        { provide: ProductImportService, useValue: { apply } },
        {
          provide: ProductNameMatcherService,
          useValue: { matchExact: (name: string) => matchProductName(name, PRODUCTS), matchNames }
        },
        { provide: UnitRegistryService, useValue: { allUnitKeys_: signal(['crate']) } },
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
        {
          provide: UserMsgService,
          useValue: {
            onSetSuccessMsg,
            onSetErrorMsg: jasmine.createSpy('onSetErrorMsg'),
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

  describe('receipt photo (plan 465)', () => {
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

    it('shows a camera button (capture) and an upload button (no capture), both for jpg, png and webp', async () => {
      await setup(of({ rows: [], truncated: false }))
      const camera = byId<HTMLInputElement>('import-photo-camera-input')!
      const upload = byId<HTMLInputElement>('import-photo-upload-input')!
      expect(camera.getAttribute('capture')).toBe('environment')
      expect(camera.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
      expect(upload.hasAttribute('capture')).toBeFalse()
      expect(upload.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
      expect(byId('import-photo-camera')?.textContent).toContain('import_photo_camera')
      expect(byId('import-photo-upload')?.textContent).toContain('import_photo_upload')
      expect(byId('import-photo-privacy')?.textContent?.trim()).toBe('import_photo_privacy')
    })

    it('a chosen photo is read once, fills the preview, shows the hint, counts one use and leaves the text box alone', async () => {
      await setup(of({ rows: [], truncated: false }))
      parseReceiptPhoto.and.resolveTo({ rows: [row('בצל', 3.5), row('גזר', 4)], truncated: false })
      const box = byId<HTMLTextAreaElement>('import-text')!
      box.value = 'my pasted text'
      box.dispatchEvent(new Event('input'))
      const before = getGeminiUsage().count

      const file = receiptFile()
      await choosePhoto('import-photo-camera-input', file)

      expect(parseReceiptPhoto).toHaveBeenCalledTimes(1)
      expect(parseReceiptPhoto.calls.mostRecent().args[0]).toBe(file)
      expect(all('import-row').length).toBe(2)
      expect(byId('import-photo-hint')?.textContent?.trim()).toBe('import_photo_check_hint')
      expect(getGeminiUsage().count).toBe(before + 1)
      expect(byId<HTMLTextAreaElement>('import-text')!.value).toBe('my pasted text')
      expect(parsePriceList).not.toHaveBeenCalled()
    })

    it('the hint goes away after the next pasted-text read', async () => {
      await setup(of({ rows: [row('בצל', 3)], truncated: false }))
      parseReceiptPhoto.and.resolveTo({ rows: [row('גזר', 4)], truncated: false })
      await choosePhoto('import-photo-upload-input')
      expect(byId('import-photo-hint')).not.toBeNull()
      await pasteAndParse('בצל 3')
      expect(byId('import-photo-hint')).toBeNull()
    })

    it('photo rows get the same name matching as pasted rows', async () => {
      await setup(of({ rows: [], truncated: false }))
      parseReceiptPhoto.and.resolveTo({ rows: [row('עגבניות', 6.2)], truncated: false })
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
      ['IMAGE_TOO_LARGE', () => Promise.reject(new Error('IMAGE_TOO_LARGE')), 'import_photo_too_big'],
      ['IMAGE_TYPE_UNSUPPORTED', () => Promise.reject(new Error('IMAGE_TYPE_UNSUPPORTED')), 'import_photo_unsupported'],
      ['any other failure', () => Promise.reject(new HttpErrorResponse({ status: 502 })), 'import_photo_failed']
    ]
    for (const [label, fail, messageKey] of failures) {
      it(`${label} shows ${messageKey} and keeps the existing preview rows`, async () => {
        await setup(of({ rows: [row('בצל', 3), row('גזר', 4)], truncated: false }))
        await pasteAndParse('בצל 3')
        expect(all('import-row').length).toBe(2)

        parseReceiptPhoto.and.callFake(fail)
        await choosePhoto('import-photo-camera-input')

        expect(byId('import-error')?.textContent?.trim()).toBe(messageKey)
        expect(all('import-row').length).toBe(2)
        expect(byId('import-photo-hint')).toBeNull()
      })
    }

    it('an empty photo result shows import_nothing_found and the paste box still works', async () => {
      await setup(of({ rows: [row('בצל', 3)], truncated: false }))
      parseReceiptPhoto.and.resolveTo({ rows: [], truncated: false })
      await choosePhoto('import-photo-camera-input')
      expect(byId('import-error')?.textContent?.trim()).toBe('import_nothing_found')
      await pasteAndParse('בצל 3')
      expect(all('import-row').length).toBe(1)
      expect(byId('import-error')).toBeNull()
    })
  })
})
