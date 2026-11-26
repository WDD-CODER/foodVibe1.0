import { signal } from '@angular/core'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ListChecks, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Product } from '@models/product.model'
import { By } from '@angular/platform-browser'
import { GeminiService } from '@services/gemini.service'
import { StockAiDraftComponent } from './stock-ai-draft/stock-ai-draft.component'
import type { StockExtractResponse } from '@schemas/ai-stock-extract.schema'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { UserMsgService } from '@services/user-msg.service'
import { StockCountService } from '../../services/stock-count.service'
import { StockCountComponent } from './stock-count.component'
import { PastCountsService } from './past-counts.service'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { ReturnToService } from '@services/return-to.service'

const product = (id: string, name: string, min = 0): Product =>
  ({ _id: id, nameHebrew: name, baseUnit: 'kg', purchaseOptions: [], minStockLevel: min }) as unknown as Product

describe('StockCountComponent', () => {
  let fixture: ComponentFixture<StockCountComponent>
  let service: jasmine.SpyObj<StockCountService>
  let onSetErrorMsg: jasmine.Spy
  let onSetSuccessMsg: jasmine.Spy
  let onSetWarningMsg: jasmine.Spy
  let logError: jasmine.Spy
  let navigate: jasmine.Spy
  let past: jasmine.SpyObj<PastCountsService>
  let saveProduct: jasmine.Spy
  let openUnitCreator: jasmine.Spy
  let unitAdded: Promise<unknown>
  let query: Record<string, string> = {}
  let returnTo = new ReturnToService()

  async function setup(
    products: Product[] = [product('a', 'אורז'), product('b', 'קמח')],
    draft: unknown = null
  ): Promise<void> {
    // Plan 651: the autosave waits 2 s; a mocked clock keeps it from firing while a test waits for the page to settle.
    jasmine.clock().install()
    service = jasmine.createSpyObj<StockCountService>('StockCountService', [
      'loadOnHand',
      'loadOpenDraft',
      'saveDraft',
      'finalize'
    ])
    service.loadOnHand.and.resolveTo([])
    service.loadOpenDraft.and.resolveTo(draft as never)
    service.saveDraft.and.resolveTo({ _id: 'c1', updatedAt: 5 } as never)
    service.finalize.and.resolveTo({ _id: 'c1' } as never)
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    onSetSuccessMsg = jasmine.createSpy('onSetSuccessMsg')
    onSetWarningMsg = jasmine.createSpy('onSetWarningMsg')
    logError = jasmine.createSpy('error')
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    past = jasmine.createSpyObj<PastCountsService>('PastCountsService', ['list'])
    past.list.and.resolveTo([])
    saveProduct = jasmine.createSpy('saveProduct').and.resolveTo(null)
    openUnitCreator = jasmine.createSpy('openUnitCreator')
    unitAdded = Promise.resolve(null)
    TestBed.configureTestingModule({
      imports: [StockCountComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks })],
      providers: [
        { provide: KitchenStateService, useValue: { products_: signal(products), saveProduct } },
        { provide: StockCountService, useValue: service },
        {
          provide: UnitRegistryService,
          useValue: { getConversion: () => 1, openUnitCreator, awaitProductUnitAdded: () => unitAdded }
        },
        { provide: UserMsgService, useValue: { onSetErrorMsg, onSetSuccessMsg, onSetWarningMsg } },
        { provide: GeminiService, useValue: jasmine.createSpyObj('GeminiService', ['extractStockCount']) },
        { provide: LoggingService, useValue: { error: logError } },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
        { provide: PastCountsService, useValue: past },
        { provide: ReturnToService, useValue: returnTo },
        { provide: TranslationService, useValue: { translate: (k: string) => unitNames[k] ?? k } }
      ]
    })
    fixture = TestBed.createComponent(StockCountComponent)
    // Plan 655: the width is the test's choice, not the test browser's window: desktop unless a case asks for narrow.
    ;(fixture.componentInstance as unknown as { narrow_: { set(v: boolean): void } }).narrow_.set(narrowMode)
    ;(fixture.componentInstance as unknown as { phone_: { set(v: boolean): void } }).phone_.set(false)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  let narrowMode = false
  /** Plan 658: the saved Hebrew names of units, by key (a key with none reads as itself). */
  let unitNames: Record<string, string> = {}

  afterEach(() => {
    narrowMode = false
    unitNames = {}
    jasmine.clock().uninstall()
    returnTo = new ReturnToService()
  })

  const el = () => fixture.nativeElement as HTMLElement
  const rows = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="stk-row"]'))
  const btn = (id: string) => el().querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!
  const chipOf = (row: HTMLElement) => row.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  const comp = () => fixture.componentInstance as unknown as { setAmount(p: Product, n: number): void }

  const save = () => (fixture.componentInstance as unknown as { autosave_(): Promise<void> }).autosave_()

  async function settle(): Promise<void> {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  /**
   * Waits two frames. The shared tooltip closes on any scroll, and opening it makes `whenStable` wait for a frame:
   * a scroll event the test page still owes (another spec left the window scrolled, and this spec's own page changed
   * its height) is sent in that frame and closes the tooltip the moment it opens. Let it go before the click.
   */
  async function pendingScrollSent(): Promise<void> {
    for (let i = 0; i < 2; i++) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  it('marks a row counted when its amount changes and counts it in the header', async () => {
    await setup()
    expect(chipOf(rows()[0]).checked).toBeFalse()
    comp().setAmount(product('a', 'אורז'), 3)
    await settle()
    expect(chipOf(rows()[0]).checked).toBeTrue()
  })

  it('plan 651 (h): sits on app-list-shell with app-page-header; the header has one action, no draft button', async () => {
    await setup()
    expect(el().querySelector('app-list-shell app-page-header')).not.toBeNull()
    const end = el().querySelector<HTMLElement>('app-page-header .ph-end')!
    expect(end.querySelectorAll('button.c-btn-primary').length).toBe(1)
    expect(end.contains(btn('stk-finalize'))).toBeTrue()
    expect(end.querySelector('app-date-field')).not.toBeNull()
    expect(el().querySelector('[data-testid="stk-save-draft"]')).toBeNull()
  })

  describe('plan 653 — narrow screens, compact date, unit after a pick', () => {
    const child = () =>
      fixture.debugElement.query(By.directive(StockAiDraftComponent)).componentInstance as StockAiDraftComponent
    const withCrates = (id: string, name: string): Product =>
      ({
        ...product(id, name),
        purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10 }]
      }) as unknown as Product
    const emitChoose = (): void => {
      child().extracted.emit({
        answer: {
          draftId: null,
          lines: [],
          unmatched: [
            {
              spoken: 'עגבניות',
              status: 'choose',
              quantity: 3,
              spokenUnit: 'ארגזים',
              candidates: [
                { productId: 'a', nameHebrew: 'עגבניות שרי' },
                { productId: 'b', nameHebrew: 'עגבניות רגילות' }
              ]
            }
          ]
        },
        source: 'voice'
      })
    }

    it('(a) the base-amount column sits in the column carousel in the header and in every row', async () => {
      await setup([{ ...product('a', 'אורז'), baseUnit: 'gram' } as Product, product('b', 'קמח')])
      ;(fixture.componentInstance as unknown as { setUnit(p: Product, u: string): void }).setUnit(
        product('a', 'אורז'),
        'kg'
      )
      await settle()
      expect(el().querySelector('app-column-carousel-header')).not.toBeNull()
      expect(rows().every((r) => r.querySelector('app-column-carousel-cell') !== null)).toBeTrue()
    })

    it('(b) no cell of a list row is hidden with display: none', async () => {
      await setup()
      const hidden = rows().flatMap((r) =>
        Array.from(r.querySelectorAll<HTMLElement>('.c-list-body-cell')).filter(
          (c) => getComputedStyle(c).display === 'none'
        )
      )
      expect(hidden.length).toBe(0)
    })

    it('(c) the date is in the header actions area, in a box of at most 12rem', async () => {
      await setup()
      const end = el().querySelector<HTMLElement>('app-page-header .ph-end')!
      const date = end.querySelector<HTMLElement>('[data-testid="stk-date"]')!
      expect(date.querySelector('app-date-field')).not.toBeNull()
      expect(date.classList.contains('stock-count__date')).toBeTrue()
    })

    it('(d) the header strip carries the headings in one row; the old second band is gone', async () => {
      await setup()
      expect(el().querySelectorAll('.c-grid-header-cell').length).toBeGreaterThanOrEqual(4)
      expect(el().querySelector('.stock-count__base-head')).toBeNull()
    })

    it('a picked product gets the spoken unit mapped to its own units (ארגזים → ארגז)', async () => {
      await setup([withCrates('a', 'עגבניות שרי'), product('b', 'עגבניות רגילות')])
      emitChoose()
      await settle()
      el().querySelectorAll<HTMLInputElement>('[data-testid="stk-ai-candidates"] .c-chip--toggle input')[0].click()
      await settle()
      expect(chipOf(rows()[0]).checked).toBeTrue()
      expect(el().querySelector('[data-testid="stk-unit-note"]')).toBeNull()
      const state = (
        fixture.componentInstance as unknown as { rows_(): Record<string, { amount: number; unit: string }> }
      ).rows_()['a']
      expect(state).toEqual(jasmine.objectContaining({ amount: 3, unit: 'ארגז' }))
    })

    it('a picked product without that unit shows the unit note and is not counted', async () => {
      await setup([withCrates('a', 'עגבניות שרי'), product('b', 'עגבניות רגילות')])
      emitChoose()
      await settle()
      el().querySelectorAll<HTMLInputElement>('[data-testid="stk-ai-candidates"] .c-chip--toggle input')[1].click()
      await settle()
      expect(el().querySelector('[data-testid="stk-unit-note"]')).not.toBeNull()
      expect(chipOf(rows()[1]).checked).toBeFalse()
    })

    it('plan 654 (a,b): a line with no unit leaves the row uncounted, with the product units as chips and add-unit', async () => {
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      child().extracted.emit({
        answer: {
          draftId: null,
          lines: [{ productId: 'a', quantity: 3, unit: null, unitMissing: true }],
          unmatched: []
        },
        source: 'text'
      })
      await settle()
      const choice = el().querySelector('[data-testid="stk-unit-choice"]')!
      expect(choice).not.toBeNull()
      expect(choice.querySelectorAll('.c-chip--toggle').length).toBeGreaterThanOrEqual(2)
      expect(choice.querySelector('[data-testid="stk-unit-add"]')).not.toBeNull()
      expect(chipOf(rows()[0]).checked).toBeFalse()
      expect(chipOf(rows()[0]).disabled).toBeTrue()
      choice.querySelector<HTMLInputElement>('input[value="ארגז"]')!.click()
      await settle()
      expect(el().querySelector('[data-testid="stk-unit-choice"]')).toBeNull()
      expect(chipOf(rows()[0]).checked).toBeTrue()
      const state = (
        fixture.componentInstance as unknown as { rows_(): Record<string, { amount: number; unit: string }> }
      ).rows_()['a']
      expect(state).toEqual(jasmine.objectContaining({ amount: 3, unit: 'ארגז' }))
    })

    it('plan 654 (d): after a pick from choose, no unit shows the unit choice', async () => {
      await setup([withCrates('a', 'עגבניות שרי'), product('b', 'עגבניות רגילות')])
      child().extracted.emit({
        answer: {
          draftId: null,
          lines: [],
          unmatched: [
            {
              spoken: 'עגבניות',
              status: 'choose',
              quantity: 3,
              candidates: [{ productId: 'a', nameHebrew: 'עגבניות שרי' }]
            }
          ]
        },
        source: 'voice'
      })
      await settle()
      el().querySelectorAll<HTMLInputElement>('[data-testid="stk-ai-candidates"] .c-chip--toggle input')[0].click()
      await settle()
      expect(el().querySelector('[data-testid="stk-unit-choice"]')).not.toBeNull()
      expect(el().querySelector('[data-testid="stk-unit-note"]')).toBeNull()
      expect(chipOf(rows()[0]).checked).toBeFalse()
    })

    it('plan 654 (e): the base-amount column is not drawn while all its cells are empty, and is drawn once one has a value', async () => {
      await setup()
      expect(el().querySelector('app-column-carousel-header')).toBeNull()
      expect(el().querySelector('app-column-carousel-cell')).toBeNull()
      ;(fixture.componentInstance as unknown as { setUnit(p: Product, u: string): void }).setUnit(
        product('a', 'אורז'),
        'gram'
      )
      await settle()
      expect(el().querySelector('app-column-carousel-header')).not.toBeNull()
      expect(rows().every((r) => r.querySelector('app-column-carousel-cell') !== null)).toBeTrue()
    })

    it('plan 654 (f): the name cell wraps and stays visible', async () => {
      await setup([product('a', 'שם מוצר ארוך מאוד מאוד מאוד מאוד מאוד מאוד מאוד מאוד מאוד')])
      const name = rows()[0].querySelector<HTMLElement>('.stock-count__name')!
      const style = getComputedStyle(name)
      expect(style.whiteSpace).toBe('normal')
      expect(style.textOverflow).not.toBe('ellipsis')
      expect(name.textContent).toContain('שם מוצר ארוך')
    })
  })

  describe('plan 651', () => {
    const comp2 = () =>
      fixture.componentInstance as unknown as {
        setUnit(p: Product, u: string): void
        setAmount(p: Product, n: number): void
      }
    const child = () =>
      fixture.debugElement.query(By.directive(StockAiDraftComponent)).componentInstance as StockAiDraftComponent
    const names = () => rows().map((r) => r.querySelector('.stock-count__name')!.textContent!.trim())

    it('(a) after an AI fill the filled rows are first', async () => {
      await setup([product('a', 'אורז'), product('b', 'קמח'), product('c', 'תפוח')])
      child().extracted.emit({
        answer: { draftId: null, lines: [{ productId: 'c', quantity: 2, unit: 'kg' }], unmatched: [] },
        source: 'text'
      })
      await settle()
      expect(names()[0]).toContain('תפוח')
    })

    it('(b) «העברת המסומנים לראש הרשימה» moves the counted rows first', async () => {
      await setup([product('a', 'אורז'), product('b', 'קמח'), product('c', 'תפוח')])
      comp().setAmount(product('c', 'תפוח'), 1)
      await settle()
      btn('stk-move-counted').click()
      await settle()
      expect(names()[0]).toContain('תפוח')
      expect(btn('stk-move-counted').textContent).toContain('stk_move_counted_top')
    })

    it('(c) a unitNeedsFix row shows the note and is not counted until a unit is picked', async () => {
      await setup()
      child().extracted.emit({
        answer: {
          draftId: null,
          lines: [{ productId: 'b', quantity: 3, unit: null, unitNeedsFix: true, spokenUnit: 'ארגזים' }],
          unmatched: []
        },
        source: 'text'
      })
      await settle()
      const note = el().querySelector('[data-testid="stk-unit-note"]')!
      expect(note.textContent).toContain('stk_unit_needs_fix')
      expect(chipOf(rows()[0]).checked).toBeFalse()
      await save()
      expect(service.saveDraft).not.toHaveBeenCalled()
      comp2().setUnit(product('b', 'קמח'), 'kg')
      await settle()
      expect(el().querySelector('[data-testid="stk-unit-note"]')).toBeNull()
      expect(chipOf(rows()[0]).checked).toBeTrue()
    })

    it('(d) the unit dropdown ends with the add-unit option, which opens the creator and selects the new unit', async () => {
      await setup()
      const options = (
        fixture.componentInstance as unknown as { unitOptionsById_(): Record<string, { value: string }[]> }
      ).unitOptionsById_()['a']
      expect(options[options.length - 1].value).toBe('__add_unit__')
      unitAdded = Promise.resolve({ key: 'crate', amount: 10, basis: 'kg' })
      comp2().setUnit(product('a', 'אורז'), '__add_unit__')
      jasmine.clock().tick(1)
      await settle()
      expect(openUnitCreator).toHaveBeenCalled()
      expect(saveProduct).toHaveBeenCalled()
      expect(saveProduct.calls.mostRecent().args[0].purchaseOptions[0].unitSymbol).toBe('crate')
      expect(chipOf(rows()[0]).checked).toBeTrue()
    })

    it('(e) no save-draft button; a change saves after 2 s and says «נשמר אוטומטית · HH:mm»', async () => {
      await setup()
      expect(el().querySelector('[data-testid="stk-save-draft"]')).toBeNull()
      comp().setAmount(product('a', 'אורז'), 3)
      fixture.detectChanges()
      jasmine.clock().tick(1999)
      expect(service.saveDraft).not.toHaveBeenCalled()
      jasmine.clock().tick(2)
      await settle()
      expect(service.saveDraft).toHaveBeenCalledTimes(1)
      expect(onSetSuccessMsg).not.toHaveBeenCalledWith('stk_draft_saved')
      expect(el().querySelector('[data-testid="stk-draft-note"]')!.textContent).toContain('stk_autosaved')
    })

    it('(f) «ספירות קודמות» lists drafts and finished counts and opens a draft', async () => {
      await setup()
      past.list.and.resolveTo([
        {
          _id: 'p1',
          status: 'draft',
          countedAt: 1_700_000_000_000,
          lines: [{ productId: 'b', quantity: 4, unit: 'kg' }]
        },
        { _id: 'p2', status: 'final', countedAt: 1_690_000_000_000, lines: [] }
      ] as never)
      btn('stk-tab-past').click()
      await settle()
      const listed = Array.from(el().querySelectorAll<HTMLButtonElement>('[data-testid="stk-past-row"]'))
      expect(listed.length).toBe(2)
      expect(listed[0].textContent).toContain('stk_count_status_draft')
      expect(listed[1].textContent).toContain('stk_count_status_final')
      expect(listed[1].disabled).toBeTrue()
      listed[0].click()
      await settle()
      expect(btn('stk-tab-sheet').classList).toContain('active')
      expect(chipOf(rows()[1]).checked).toBeTrue()
    })

    it('(g) «הוספת מוצר חדש» saves the draft and opens the form with the name, no confirm', async () => {
      await setup()
      comp().setAmount(product('a', 'אורז'), 1)
      await settle()
      child().extracted.emit({
        answer: { draftId: null, lines: [], unmatched: [{ spoken: 'אבוקדו', status: 'unmatched', quantity: 2 }] },
        source: 'text'
      })
      await settle()
      btn('stk-ai-add-new').click()
      await settle()
      expect(service.saveDraft).toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith(['/inventory/add'], {
        queryParams: { name: 'אבוקדו', returnUrl: '/inventory/count' }
      })
    })

    it('comes back with ?addedProduct= and the new product fills the line it came from', async () => {
      query = { addedProduct: 'b' }
      returnTo = new ReturnToService()
      returnTo.setPending({ spoken: 'קמח', quantity: 5, unit: 'kg' })
      try {
        await setup()
      } finally {
        query = {}
      }
      expect(chipOf(rows()[0]).checked).toBeTrue()
      expect(names()[0]).toContain('קמח')
    })

    it('(i) the counter is 2rem high whatever the width (no phone-only 44px rule)', async () => {
      TestBed.configureTestingModule({
        imports: [CounterComponent],
        providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k } }]
      })
      const counterFixture = TestBed.createComponent(CounterComponent)
      counterFixture.componentRef.setInput('value', 1)
      counterFixture.detectChanges()
      const grid = (counterFixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.counter-grid')!
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
      expect(grid.getBoundingClientRect().height).toBeCloseTo(2 * remPx, 0)
      expect(getComputedStyle(grid).minHeight).not.toBe('44px')
    })
  })

  it('saves only counted rows, then uses PUT (same id) for the second save', async () => {
    await setup()
    comp().setAmount(product('a', 'אורז'), 3)
    await settle()
    await save()
    await settle()
    const [input, id] = service.saveDraft.calls.argsFor(0)
    expect(id).toBeUndefined()
    expect(input.lines).toEqual([{ productId: 'a', quantity: 3, unit: 'kg' }])
    expect(onSetSuccessMsg).not.toHaveBeenCalledWith('stk_draft_saved')
    await save()
    await settle()
    expect(service.saveDraft.calls.argsFor(1)[1]).toBe('c1')
  })

  it('marks the row of a UNIT_NOT_CONVERTIBLE answer with line 1', async () => {
    await setup()
    comp().setAmount(product('a', 'אורז'), 3)
    comp().setAmount(product('b', 'קמח'), 2)
    await settle()
    service.saveDraft.and.rejectWith(
      new HttpErrorResponse({ status: 400, error: { error: 'UNIT_NOT_CONVERTIBLE', line: 1 } })
    )
    await save()
    await settle()
    expect(rows()[1].classList).toContain('stock-count__row--error')
    expect(rows()[0].classList).not.toContain('stock-count__row--error')
    expect(onSetErrorMsg).toHaveBeenCalledWith('stk_line_refused')
    expect(logError).toHaveBeenCalled()
    expect(rows().length).toBe(2)
  })

  it('disables finalise while no row is counted', async () => {
    await setup()
    expect(btn('stk-finalize').disabled).toBeTrue()
    comp().setAmount(product('a', 'אורז'), 1)
    await settle()
    expect(btn('stk-finalize').disabled).toBeFalse()
  })

  it('finalises: saves, closes, empties the sheet and switches to below minimum', async () => {
    await setup()
    comp().setAmount(product('a', 'אורז'), 1)
    await settle()
    btn('stk-finalize').click()
    await settle()
    expect(service.finalize).toHaveBeenCalledWith('c1')
    expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_finalized')
    expect(service.loadOnHand).toHaveBeenCalledTimes(2)
    expect(btn('stk-tab-below').classList).toContain('active')
  })

  it('continues the open draft: its lines fill the rows and the next save is a PUT', async () => {
    await setup(undefined, {
      _id: 'd9',
      updatedAt: 7,
      countedAt: new Date(2026, 10, 10, 12).getTime(),
      lines: [{ productId: 'b', quantity: 4, unit: 'kg', baseQuantity: 4 }]
    })
    expect(chipOf(rows()[1]).checked).toBeTrue()
    expect(chipOf(rows()[0]).checked).toBeFalse()
    expect(el().querySelector('[data-testid="stk-draft-note"]')).not.toBeNull()
    comp().setAmount(product('a', 'אורז'), 1)
    await settle()
    await save()
    await settle()
    expect(service.saveDraft.calls.argsFor(0)[1]).toBe('d9')
  })

  describe('AI suggestion (plan 637)', () => {
    const child = () =>
      fixture.debugElement.query(By.directive(StockAiDraftComponent)).componentInstance as StockAiDraftComponent
    const answer = (over: Partial<StockExtractResponse> = {}): StockExtractResponse => ({
      draftId: 'dr1',
      lines: [],
      unmatched: [],
      ...over
    })
    const tag = (row: HTMLElement) => row.querySelector('[data-testid="stk-ai-tag"]')
    const amountOf = (row: HTMLElement) => row.querySelector('app-counter')

    it('fills an uncounted row, marks it, and the mark goes when the person changes the row', async () => {
      await setup()
      child().extracted.emit({
        answer: answer({ lines: [{ productId: 'b', quantity: 4, unit: 'kg' }] }),
        source: 'text'
      })
      await settle()
      expect(chipOf(rows()[0]).checked).toBeTrue()
      expect(tag(rows()[0])).not.toBeNull()
      expect(tag(rows()[1])).toBeNull()
      expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_ai_applied')
      expect(amountOf(rows()[0])).not.toBeNull()
      comp().setAmount(product('b', 'קמח'), 5)
      await settle()
      expect(tag(rows()[0])).toBeNull()
    })

    it('leaves a counted row alone: the same figure is ignored, another goes to "already counted"', async () => {
      await setup()
      comp().setAmount(product('a', 'אורז'), 2)
      comp().setAmount(product('b', 'קמח'), 4)
      await settle()
      child().extracted.emit({
        answer: answer({
          lines: [
            { productId: 'a', quantity: 2, unit: 'kg' },
            { productId: 'b', quantity: 9, unit: 'kg' },
            { productId: 'ghost', quantity: 1, unit: 'kg' }
          ]
        }),
        source: 'text'
      })
      await settle()
      expect(el().querySelector('[data-testid="stk-ai-conflicts"]')!.textContent).toContain('קמח')
      expect(tag(rows()[0])).toBeNull()
      expect(tag(rows()[1])).toBeNull()
      child().replace.emit('b')
      await settle()
      expect(tag(rows()[1])).not.toBeNull()
      expect(el().querySelector('[data-testid="stk-ai-conflicts"]')).toBeNull()
      await save()
      await settle()
      expect(service.saveDraft.calls.argsFor(0)[0].lines).toContain({ productId: 'b', quantity: 9, unit: 'kg' })
    })

    it('keeps the sheet figure on "keep" and lists unmatched words until removed', async () => {
      await setup()
      comp().setAmount(product('b', 'קמח'), 4)
      await settle()
      child().extracted.emit({
        answer: answer({
          lines: [{ productId: 'b', quantity: 9, unit: 'kg' }],
          unmatched: [{ spoken: 'בננות', quantity: 3, unit: 'kg' }]
        }),
        source: 'text'
      })
      await settle()
      expect(el().querySelector('[data-testid="stk-ai-unmatched"]')!.textContent).toContain('בננות 3 kg')
      child().keep.emit('b')
      child().dismiss.emit(1)
      await settle()
      expect(el().querySelector('[data-testid="stk-ai-conflicts"]')).toBeNull()
      expect(el().querySelector('[data-testid="stk-ai-unmatched"]')).toBeNull()
      expect(tag(rows()[1])).toBeNull()
    })

    it('plan 650: a choose line shows its candidates and the pick fills that row; no row is added by itself', async () => {
      await setup([product('a', 'בצל צהוב'), product('b', 'בצל סגול')])
      child().extracted.emit({
        answer: answer({
          unmatched: [
            {
              spoken: 'בצל',
              status: 'choose',
              quantity: 2,
              unit: 'kg',
              candidates: [
                { productId: 'a', nameHebrew: 'בצל צהוב' },
                { productId: 'b', nameHebrew: 'בצל סגול' }
              ]
            }
          ]
        }),
        source: 'voice'
      })
      await settle()
      expect(rows().length).toBe(2)
      expect(chipOf(rows()[0]).checked).toBeFalse()
      const chips = el().querySelectorAll<HTMLInputElement>('[data-testid="stk-ai-candidates"] .c-chip--toggle input')
      expect(chips.length).toBe(2)
      chips[0].click()
      await settle()
      expect(chipOf(rows()[0]).checked).toBeTrue()
      expect(tag(rows()[0])).not.toBeNull()
      expect(rows().length).toBe(2)
      expect(el().querySelector('[data-testid="stk-ai-unmatched"]')).toBeNull()
      expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_ai_applied')
    })

    it('plan 650: an unmatched line adds nothing; «הוספת מוצר חדש» opens the add page only when pressed', async () => {
      await setup()
      child().extracted.emit({
        answer: answer({ unmatched: [{ spoken: 'בננות', status: 'unmatched', quantity: 3 }] }),
        source: 'text'
      })
      await settle()
      expect(rows().length).toBe(2)
      expect(onSetSuccessMsg).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
      expect(el().querySelector('[data-testid="stk-ai-search"]')).not.toBeNull()
      btn('stk-ai-add-new').click()
      expect(navigate).toHaveBeenCalledWith(['/inventory/add'], {
        queryParams: { name: 'בננות', returnUrl: '/inventory/count' }
      })
    })

    it('says so when nothing was found', async () => {
      await setup()
      child().extracted.emit({ answer: answer({ draftId: null }), source: 'text' })
      expect(onSetWarningMsg).toHaveBeenCalledWith('stk_ai_nothing_found')
    })

    it('sends source and draftIds with the save, voice sticking once used; manual with none otherwise', async () => {
      await setup()
      comp().setAmount(product('a', 'אורז'), 1)
      await settle()
      await save()
      await settle()
      const plain = service.saveDraft.calls.argsFor(0)[0]
      expect(plain.source).toBe('manual')
      expect(plain.draftIds).toBeUndefined()
      child().extracted.emit({ answer: answer({ draftId: 'dr1' }), source: 'voice' })
      child().extracted.emit({ answer: answer({ draftId: 'dr2' }), source: 'text' })
      child().extracted.emit({ answer: answer({ draftId: 'dr2' }), source: 'text' })
      await settle()
      await save()
      await settle()
      const second = service.saveDraft.calls.argsFor(1)[0]
      expect(second.source).toBe('voice')
      expect(second.draftIds).toEqual(['dr1', 'dr2'])
    })

    it('adds at most 20 draft ids and a continued draft keeps its own', async () => {
      await setup(undefined, {
        _id: 'd9',
        updatedAt: 7,
        countedAt: new Date(2026, 10, 10, 12).getTime(),
        source: 'voice',
        draftIds: ['old'],
        lines: [{ productId: 'b', quantity: 4, unit: 'kg', baseQuantity: 4 }]
      })
      for (let i = 0; i < 25; i++) child().extracted.emit({ answer: answer({ draftId: `n${i}` }), source: 'text' })
      await save()
      await settle()
      const sent = service.saveDraft.calls.argsFor(0)[0]
      expect(sent.source).toBe('voice')
      expect(sent.draftIds!.length).toBe(20)
      expect(sent.draftIds![0]).toBe('old')
    })
  })

  describe('thousands of products (plan 645)', () => {
    const many = Array.from({ length: 3000 }, (_, i) => product(`p${i}`, `מוצר ${String(i).padStart(4, '0')}`))
    const search = async (text: string) => {
      const input = el().querySelector<HTMLInputElement>('#stock-count-search')!
      input.value = text
      input.dispatchEvent(new Event('input'))
      await settle()
    }
    const rowOf = (name: string) => rows().find((r) => r.textContent!.includes(name))
    const amountIn = (row: HTMLElement) => row.querySelector<HTMLInputElement>('app-counter input')!.value

    it('draws fewer than 100 rows at first, more on "show more"', async () => {
      await setup(many)
      expect(rows().length).toBeLessThan(100)
      expect(rows().length).toBeGreaterThan(0)
      btn('stk-show-more').click()
      await settle()
      expect(rows().length).toBe(100)
      expect(btn('stk-show-more').textContent).toContain('2900')
    })

    it('search filters the whole list, not only the drawn rows', async () => {
      await setup(many)
      await search('מוצר 2999')
      expect(rows().length).toBe(1)
      expect(rows()[0].textContent).toContain('מוצר 2999')
      expect(el().querySelector('[data-testid="stk-show-more"]')).toBeNull()
    })

    it('keeps a counted value after it leaves the drawn rows and comes back', async () => {
      await setup(many)
      btn('stk-show-more').click()
      btn('stk-show-more').click()
      await settle()
      comp().setAmount(many[120], 7)
      await settle()
      expect(amountIn(rowOf('מוצר 0120')!)).toBe('7')
      await search('מוצר 0001')
      expect(rowOf('מוצר 0120')).toBeUndefined()
      await search('')
      expect(rowOf('מוצר 0120')).toBeUndefined()
      btn('stk-show-more').click()
      btn('stk-show-more').click()
      await settle()
      expect(amountIn(rowOf('מוצר 0120')!)).toBe('7')
      expect(chipOf(rowOf('מוצר 0120')!).checked).toBeTrue()
    })

    it('unit options are a computed map by product id, not a template method', async () => {
      await setup(many)
      const c = fixture.componentInstance as unknown as Record<string, unknown> & {
        unitOptionsById_: () => Record<string, unknown[]>
      }
      expect(c['unitOptions_']).toBeUndefined()
      const map = c.unitOptionsById_()
      expect(Object.keys(map).length).toBe(3000)
      expect(c.unitOptionsById_()).toBe(map)
    })
  })

  describe('plan 657 — the counted mark sizes per width', () => {
    const instance = () => fixture.componentInstance as unknown as { phone_: { set(v: boolean): void } }
    const markSize = (): number => {
      const cell = rows()[0].querySelector<HTMLElement>('.stock-count__counted')!
      return parseFloat(cell.style.getPropertyValue('--stock-count-mark-size'))
    }

    it('(a) the counted checkbox gets a different size per width, desktop the largest', async () => {
      await setup()
      const desktop = markSize()
      instance().phone_.set(false)
      ;(fixture.componentInstance as unknown as { narrow_: { set(v: boolean): void } }).narrow_.set(true)
      await settle()
      const tablet = markSize()
      instance().phone_.set(true)
      await settle()
      const phone = markSize()
      expect(new Set([phone, tablet, desktop]).size).toBe(3)
      expect(desktop).toBeGreaterThan(tablet)
      expect(tablet).toBeGreaterThan(phone)
    })
  })

  describe('plan 658 — unit names, the base amount beside its row', () => {
    const withCrates = (id: string, name: string): Product =>
      ({
        ...product(id, name),
        baseUnit: 'gram',
        purchaseOptions: [{ unitSymbol: 'crate', conversionRate: 10000 }]
      }) as unknown as Product
    const child = () =>
      fixture.debugElement.query(By.directive(StockAiDraftComponent)).componentInstance as StockAiDraftComponent
    const instance = () =>
      fixture.componentInstance as unknown as {
        setAmount(p: Product, n: number): void
        setUnit(p: Product, u: string): void
        phone_: { set(v: boolean): void }
        narrow_: { set(v: boolean): void }
      }
    const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`)
    const emit = (answer: Partial<StockExtractResponse>): void => {
      child().extracted.emit({ answer: { draftId: null, lines: [], unmatched: [], ...answer }, source: 'text' })
    }
    const tip = (): HTMLElement | null => document.body.querySelector<HTMLElement>('.c-tooltip')
    afterEach(() => document.body.querySelectorAll('.c-tooltip').forEach((n) => n.remove()))
    /** Plan 747: the base hint is the shared tooltip; a click on its control pins it open. */
    const openBase = async (width: 'phone' | 'tablet' | 'desktop'): Promise<HTMLElement> => {
      narrowMode = width !== 'desktop'
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      instance().phone_.set(width === 'phone')
      instance().narrow_.set(width !== 'desktop')
      instance().setAmount(withCrates('a', 'עגבניות'), 2)
      instance().setUnit(withCrates('a', 'עגבניות'), 'crate')
      await settle()
      await pendingScrollSent()
      const control = rows()[0].querySelector<HTMLButtonElement>('[data-testid="stk-base-btn"]')!
      control.click()
      await settle()
      return control
    }

    it('(a) an unmatched line reads the unit by its saved name, and by its key when it has none', async () => {
      unitNames = { crate: 'ארגז' }
      await setup()
      emit({ unmatched: [{ spoken: 'עגבניות', quantity: 1, unit: 'crate' }] })
      await settle()
      expect(q('stk-ai-unmatched')!.textContent).toContain('עגבניות 1 ארגז')
      expect(q('stk-ai-unmatched')!.textContent).not.toContain('crate')
    })

    it('(a) a unit with no saved name falls back to its key', async () => {
      await setup()
      emit({ unmatched: [{ spoken: 'עגבניות', quantity: 1, unit: 'crate' }] })
      await settle()
      expect(q('stk-ai-unmatched')!.textContent).toContain('עגבניות 1 crate')
    })

    it('(b) the conflict texts show the unit name', async () => {
      unitNames = { kg: 'קילו' }
      await setup()
      comp().setAmount(product('b', 'קמח'), 4)
      await settle()
      emit({ lines: [{ productId: 'b', quantity: 9, unit: 'kg' }] })
      await settle()
      const text = q('stk-ai-conflicts')!.textContent ?? ''
      expect(text).toContain('4 קילו')
      expect(text).toContain('9 קילו')
    })

    it('(b) the base amount shows the unit name', async () => {
      unitNames = { gram: 'גרם', kg: 'קילו' }
      await openBase('tablet')
      expect(tip()!.textContent).toMatch(/20\s*קילו/)
    })

    for (const width of ['phone', 'tablet', 'desktop'] as const) {
      it(`(c) at ${width} width the base amount is the shared tooltip of the info button (none at desktop)`, async () => {
        // Below desktop the control is the info button; at desktop the column is printed and the control is absent.
        if (width === 'desktop') {
          await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
          expect(rows()[0].querySelector('[data-testid="stk-base-btn"]')).toBeNull()
          return
        }
        const control = await openBase(width)
        expect(tip()!.textContent).toContain('20')
        expect(tip()!.getAttribute('role')).toBe('tooltip')
        expect(control.getAttribute('aria-describedby')).toBe(tip()!.id)
        expect(fixture.debugElement.query(By.css('app-modal-shell'))).toBeNull()
      })
    }

    it('(747) a row with no base amount has no info button', async () => {
      narrowMode = true
      await setup([product('b', 'קמח')])
      expect(rows()[0].querySelector('[data-testid="stk-base-btn"]')).toBeNull()
    })

    it('(659d) the control has no title attribute, its aria-label stays', async () => {
      await openBase('tablet')
      const control = rows()[0].querySelector<HTMLButtonElement>('[data-testid="stk-base-btn"]')!
      expect(control.hasAttribute('title')).toBeFalse()
      expect(control.getAttribute('aria-label')).toContain('stk_base_amount')
    })

    it('the counted checkbox box size comes from --row-checkbox-size on its cell', async () => {
      narrowMode = true
      await setup()
      const cell = rows()[0].querySelector<HTMLElement>('.stock-count__counted')!
      expect(cell.style.getPropertyValue('--row-checkbox-size')).toBe(
        cell.style.getPropertyValue('--stock-count-mark-size')
      )
    })
  })

  describe('plan 655 — a question per missing part, a compact row below desktop', () => {
    const withCrates = (id: string, name: string): Product =>
      ({
        ...product(id, name),
        baseUnit: 'gram',
        purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10000 }]
      }) as unknown as Product
    const child = () =>
      fixture.debugElement.query(By.directive(StockAiDraftComponent)).componentInstance as StockAiDraftComponent
    const instance = () =>
      fixture.componentInstance as unknown as {
        setAmount(p: Product, n: number): void
        setUnit(p: Product, u: string): void
      }
    const emit = (unmatched: NonNullable<StockExtractResponse['unmatched']>): void => {
      child().extracted.emit({ answer: { draftId: null, lines: [], unmatched }, source: 'text' })
    }
    const q = (id: string) => el().querySelector(`[data-testid="${id}"]`)

    it('(a) a line with no product, amount or unit asks all three; a counted row waits for all of them', async () => {
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      emit([{ spoken: 'משהו', status: 'unmatched', missing: ['product', 'amount', 'unit'] }])
      await settle()
      expect(q('stk-ai-q-product')).not.toBeNull()
      expect(q('stk-ai-q-amount')).not.toBeNull()
      expect(q('stk-ai-q-unit')).not.toBeNull()
      expect(rows().every((r) => !chipOf(r).checked)).toBeTrue()
    })

    it('(a) a known product with no amount and no unit asks only how much, then which unit; counts when all are set', async () => {
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      emit([{ spoken: 'ארגז עגבניות', status: 'unmatched', productId: 'a', missing: ['amount', 'unit'] }])
      await settle()
      expect(q('stk-ai-q-product')).toBeNull()
      expect(q('stk-ai-q-amount')).not.toBeNull()
      expect(q('stk-ai-q-unit')).not.toBeNull()
      const counter = fixture.debugElement.query(By.css('[data-testid="stk-ai-q-amount"] app-counter'))
      ;(counter.componentInstance as CounterComponent).valueChange.emit(3)
      await settle()
      q('stk-ai-confirm-amount')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await settle()
      // The amount is in; the row waits for the unit and is not counted.
      expect(q('stk-ai-q-amount')).toBeNull()
      expect(chipOf(rows()[0]).checked).toBeFalse()
      el().querySelector<HTMLInputElement>('[data-testid="stk-unit-choice"] input[value="ארגז"]')!.click()
      await settle()
      expect(chipOf(rows()[0]).checked).toBeTrue()
    })

    it('(b) below 1200px the counted cell is the compact row checkbox, and toggling it counts the row', async () => {
      narrowMode = true
      await setup()
      expect(rows()[0].querySelector('app-list-row-checkbox')).not.toBeNull()
      expect(rows()[0].querySelector('.c-chip--toggle')).toBeNull()
      expect(chipOf(rows()[0]).checked).toBeFalse()
      chipOf(rows()[0]).click()
      await settle()
      expect(chipOf(rows()[0]).checked).toBeTrue()
    })

    it('(c) below 1200px the base amount is not printed; its control has the label and no title, and a click opens the tooltip', async () => {
      narrowMode = true
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      instance().setAmount(withCrates('a', 'עגבניות'), 2)
      instance().setUnit(withCrates('a', 'עגבניות'), 'ארגז')
      await settle()
      expect(el().querySelector('app-column-carousel-cell')).toBeNull()
      expect(rows()[0].querySelector('.stock-count__base')).toBeNull()
      const control = rows()[0].querySelector<HTMLButtonElement>('[data-testid="stk-base-btn"]')!
      expect(control.hasAttribute('title')).toBeFalse()
      expect(control.getAttribute('aria-label')).toContain('stk_base_amount')
      expect(control.getAttribute('aria-label')).toContain('20')
      expect(document.body.querySelector('.c-tooltip')).toBeNull()
      await pendingScrollSent()
      control.click()
      await settle()
      const box = document.body.querySelector<HTMLElement>('.c-tooltip')!
      expect(box.textContent).toContain('20')
      const rect = box.getBoundingClientRect()
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth)
      box.remove()
    })

    it('(c2) below 1200px every row has the fixed slot beside the unit, with or without the "i" button (plan 747)', async () => {
      narrowMode = true
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      instance().setAmount(withCrates('a', 'עגבניות'), 2)
      instance().setUnit(withCrates('a', 'עגבניות'), 'ארגז')
      await settle()
      const slots = rows().map((row) => row.querySelector<HTMLElement>('[data-testid="stk-base-slot"]'))
      expect(slots.every((slot) => slot !== null)).toBeTrue()
      expect(slots.filter((slot) => slot?.querySelector('[data-testid="stk-base-btn"]')).length).toBe(1)
      expect(new Set(slots.map((slot) => Math.round(slot!.getBoundingClientRect().width))).size).toBe(1)
    })

    it('(d) at 1200px and above the row is as today: the counted chip and the base column, no base control', async () => {
      await setup([withCrates('a', 'עגבניות'), product('b', 'קמח')])
      instance().setUnit(withCrates('a', 'עגבניות'), 'ארגז')
      await settle()
      expect(rows()[0].querySelector('app-list-row-checkbox')).toBeNull()
      expect(rows()[0].querySelector('.c-chip--toggle')).not.toBeNull()
      expect(rows()[0].querySelector('[data-testid="stk-base-btn"]')).toBeNull()
      expect(rows()[0].querySelector('app-column-carousel-cell')).not.toBeNull()
    })
  })
})
