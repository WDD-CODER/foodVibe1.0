import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  OnInit,
  signal,
  untracked
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { COLUMN_CAROUSEL } from 'src/app/shared/column-carousel'
import type { Product } from '@models/product.model'
import type { StockCountInput, OnHandRow } from '@schemas/stock/stock-count-input.schema'
import type { StockCount } from '@schemas/entities/stock-count.schema'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { TooltipDirective } from 'src/app/shared/tooltip/tooltip.directive'
import { formatQty } from 'src/app/core/engine/rounding'
import { toBase } from 'src/app/core/engine/units'
import { normalizeHebrew } from 'src/app/core/utils/recipe-match.util'
import { warnBeforeUnload } from 'src/app/core/utils/leave-warning.util'
import { belowMinimum, countedAtFromIso, isoFromCountedAt, unitOptionsFor } from 'src/app/core/utils/stock-count.util'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { UserMsgService } from '@services/user-msg.service'
import { ReturnToService } from '@services/return-to.service'
import { PastCountsService } from './past-counts.service'
import { unitChoicesFor, unitForSpoken } from './spoken-unit'
import { StockCountService } from '../../services/stock-count.service'
import { StockBelowMinimumComponent } from './stock-below-minimum/stock-below-minimum.component'
import {
  StockAiDraftComponent,
  type StockAiPick,
  type StockAiAmount,
  type StockAiProductOption,
  type StockAiConflict,
  type StockAiExtracted,
  type StockAiUnmatched
} from './stock-ai-draft/stock-ai-draft.component'
import type { StockExtractLine } from '@schemas/ai-stock-extract.schema'
import { PHONE_QUERY, TABLET_DOWN_QUERY } from '@utils/breakpoints'

interface RowState {
  counted: boolean
  amount: number
  unit: string
  /** Plan 651: the unit word the person said when the product has no such unit; the row is not counted until a unit is picked. */
  fix?: string
  /** Plan 654: no unit was said or read — the row waits, uncounted, and asks which unit; never the base unit. */
  choose?: boolean
}

/** The value of the add-unit option in the unit dropdown. */
const ADD_UNIT = '__add_unit__'
/** A change saves the draft this long after the last edit (ms). */
const AUTOSAVE_MS = 2000

type SheetView = 'sheet' | 'below' | 'past'
type ShowFilter = 'all' | 'counted' | 'uncounted'
type LoadState = 'loading' | 'ready' | 'failed'
type CountSource = 'manual' | 'voice' | 'text'

/** A suggestion waiting beside a row the person already counted differently. */
interface PendingConflict extends StockAiConflict {
  line: StockExtractLine
}

/** The most drafts one count may carry (C-STOCK). */
const MAX_DRAFT_IDS = 20

const LINE_ERRORS = ['UNIT_NOT_CONVERTIBLE', 'UNKNOWN_PRODUCT', 'DUPLICATE_PRODUCT']

/** Plan 645: rows drawn at first and added per "show more" — a business has thousands of products. */
const PAGE_SIZE = 50

/** Plans 655/656: below desktop (≤ `$break-tablet-max`, 1023px) the row is compact: a small counted mark, the base amount on demand. */
const NARROW_QUERY = TABLET_DOWN_QUERY

/**
 * Plan 657: the counted mark per screen size (box and tap area), by the plan 656 breakpoint names —
 * phone ≤ `$break-phone-max`, tablet up to `$break-tablet-max`, desktop above. Desktop is the largest.
 */
type MarkSize = 'phone' | 'tablet' | 'desktop'
const MARK_SIZES: Record<MarkSize, { box: string; tap: string }> = {
  phone: { box: '0.875rem', tap: '2rem' },
  tablet: { box: '1.125rem', tap: '2.5rem' },
  desktop: { box: '1.5rem', tap: '3rem' }
}

interface UnitOption {
  value: string
  label: string
}

interface SheetRow {
  product: Product
  state: RowState
  options: UnitOption[]
  base: string
  /** Plan 654: the product's own units (and the add-unit option) offered when the row has no unit. */
  choices: UnitOption[]
}

function todayIso(): string {
  return isoFromCountedAt(Date.now())
}

/** Plan 636: the stock count sheet (walk the shelves, save a draft, close the count) and the below-minimum view. */
@Component({
  selector: 'app-stock-count',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    LucideAngularModule,
    TranslatePipe,
    CounterComponent,
    CustomSelectComponent,
    ...COLUMN_CAROUSEL,
    DateFieldComponent,
    EmptyStateComponent,
    InputClearComponent,
    ListShellComponent,
    ListRowCheckboxComponent,
    LoaderComponent,
    TooltipDirective,
    StockBelowMinimumComponent,
    StockAiDraftComponent
  ],
  templateUrl: './stock-count.component.html',
  styleUrl: './stock-count.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockCountComponent implements OnInit {
  private readonly kitchen_ = inject(KitchenStateService)
  private readonly service_ = inject(StockCountService)
  private readonly units_ = inject(UnitRegistryService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)
  private readonly route_ = inject(ActivatedRoute)
  private readonly returnTo_ = inject(ReturnToService)
  private readonly past_ = inject(PastCountsService)
  private readonly destroyRef_ = inject(DestroyRef)
  private autosaveTimer_: ReturnType<typeof setTimeout> | null = null

  /** Plan 651: products moved to the top of the list (AI-filled rows, or the counted rows by the button). */
  protected readonly topIds_ = signal<string[]>([])
  protected readonly pastCounts_ = signal<StockCount[]>([])
  protected readonly pastState_ = signal<LoadState>('loading')
  protected readonly rows_ = signal<Record<string, RowState>>({})
  protected readonly draftId_ = signal<string | null>(null)
  protected readonly draftSavedAt_ = signal<number | null>(null)
  protected readonly countedDate_ = signal<string>(todayIso())
  protected readonly view_ = signal<SheetView>('sheet')
  protected readonly show_ = signal<ShowFilter>('all')
  protected readonly search_ = signal('')
  protected readonly isPanelOpen_ = signal(false)
  protected readonly saving_ = signal(false)
  protected readonly errorProductId_ = signal<string | null>(null)
  protected readonly loadState_ = signal<LoadState>('loading')
  protected readonly onHand_ = signal<OnHandRow[]>([])
  private readonly savedSnapshot_ = signal('')
  /** Plan 637: rows that carry the "AI suggestion" mark until the person changes them. */
  protected readonly aiRows_ = signal<ReadonlySet<string>>(new Set())
  protected readonly conflicts_ = signal<PendingConflict[]>([])
  protected readonly unmatched_ = signal<StockAiUnmatched[]>([])
  protected readonly aiBusy_ = signal(false)
  private readonly source_ = signal<CountSource>('manual')
  private readonly draftIds_ = signal<string[]>([])
  private unmatchedSeq_ = 0
  private readonly router_ = inject(Router)
  /** The amount each spoken line carried, kept for when the person picks its product. */
  private readonly amounts_ = new Map<
    number,
    { quantity?: number; unit?: string; spokenUnit?: string; spoken: string; productId?: string }
  >()
  protected readonly productOptions_ = computed<StockAiProductOption[]>(() =>
    this.products_().map((p) => ({ productId: p._id, name: p.nameHebrew }))
  )

  protected readonly products_ = computed(() =>
    [...this.kitchen_.products_()].sort((a, b) => a.nameHebrew.localeCompare(b.nameHebrew, 'he'))
  )
  protected readonly countedCount_ = computed(() => Object.values(this.rows_()).filter((r) => r.counted).length)
  protected readonly below_ = computed(() => belowMinimum(this.kitchen_.products_(), this.onHand_()))
  protected readonly dateOk_ = computed(
    () => /^\d{4}-\d{2}-\d{2}$/.test(this.countedDate_()) && this.countedDate_() <= todayIso()
  )
  /** Plan 655: true below the desktop breakpoint; set from the media query and kept in step with it. */
  protected readonly narrow_ = signal(typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches)
  /** Plan 657: true on a phone (≤ 767px); sizes the counted mark. */
  protected readonly phone_ = signal(typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches)
  /** Plan 657: the counted mark's size tokens for the current width. */
  protected readonly mark_ = computed(() => {
    const size: MarkSize = this.phone_() ? 'phone' : this.narrow_() ? 'tablet' : 'desktop'
    return MARK_SIZES[size]
  })
  /** Plan 654: the base-amount column is drawn only when one of the drawn rows has something in it. */
  protected readonly showBase_ = computed(() => this.shownRows_().some((r) => r.base !== ''))
  /** Plan 655: below desktop the base amount is no column — a small control opens it instead. */
  protected readonly baseColumn_ = computed(() => this.showBase_() && !this.narrow_())
  protected readonly addUnitValue = ADD_UNIT
  protected readonly gridTemplate_ = computed(() => {
    if (this.view_() !== 'sheet') return '1fr'
    return this.baseColumn_() ? '2fr 1.2fr 1.2fr 0.9fr 1fr' : '2fr 1.2fr 1.2fr 0.9fr'
  })
  protected readonly mobileGridTemplate_ = computed(() => {
    if (this.view_() !== 'sheet') return '1fr'
    // The unit column keeps room for the unit and the fixed slot beside it (plan 747): never under 6rem, which
    // leaves the unit select the width it had before the slot.
    const cols = 'minmax(0, 1.5fr) auto minmax(6rem, 1fr) auto'
    return this.baseColumn_() ? cols + ' minmax(3.5rem, auto)' : cols
  })

  /** Plan 645: built once per product list, not per row per check. */
  private readonly searchNames_ = computed(
    () => new Map(this.products_().map((p) => [p._id, normalizeHebrew(p.nameHebrew)]))
  )
  protected readonly unitOptionsById_ = computed<Record<string, UnitOption[]>>(() =>
    Object.fromEntries(
      this.products_().map((p) => [
        p._id,
        // Plan 651 (unit-dropdown-add): every dropdown ends with the add-unit option.
        [...unitOptionsFor(p).map((u) => ({ value: u, label: u })), { value: ADD_UNIT, label: 'add_new_unit' }]
      ])
    )
  )
  /** The amount in the base unit, only for rows typed in another unit (every other row shows nothing). */
  protected readonly baseTextById_ = computed<Record<string, string>>(() => {
    const byId = new Map(this.products_().map((p) => [p._id, p]))
    const out: Record<string, string> = {}
    for (const [id, state] of Object.entries(this.rows_())) {
      const product = byId.get(id)
      if (!product) continue
      const text = this.baseText_(product, state)
      if (text !== null) out[id] = text
    }
    return out
  })

  /** Every product that matches the search and the filter; counted values live in `rows_`, not in the DOM. */
  private readonly choicesById_ = computed<Record<string, UnitOption[]>>(() =>
    Object.fromEntries(
      this.products_().map((p) => [
        p._id,
        [...unitChoicesFor(p).map((u) => ({ value: u, label: u })), { value: ADD_UNIT, label: 'add_new_unit' }]
      ])
    )
  )

  protected readonly visibleRows_ = computed<SheetRow[]>(() => {
    const query = normalizeHebrew(this.search_().trim())
    const show = this.show_()
    const rows = this.rows_()
    const names = this.searchNames_()
    const options = this.unitOptionsById_()
    const choices = this.choicesById_()
    const base = this.baseTextById_()
    const top = new Map(this.topIds_().map((id, n) => [id, n]))
    const list = this.products_()
      .filter((p) => !query || (names.get(p._id) ?? '').includes(query))
      .map((product) => ({
        product,
        state: rows[product._id] ?? this.blank_(product),
        options: options[product._id] ?? [],
        choices: choices[product._id] ?? [],
        base: base[product._id] ?? ''
      }))
      .filter(({ state }) => show === 'all' || (show === 'counted' ? state.counted : !state.counted))
    if (top.size === 0) return list
    // Plan 651: the moved rows first, in the order they were moved; the rest keep the name order.
    const pinned = list
      .filter((r) => top.has(r.product._id))
      .sort((a, b) => top.get(a.product._id)! - top.get(b.product._id)!)
    return [...pinned, ...list.filter((r) => !top.has(r.product._id))]
  })

  /** Plan 645: how many matching rows are drawn; a new search or filter starts again at one page. */
  protected readonly limit_ = linkedSignal({
    source: () => `${this.search_()}\u0000${this.show_()}`,
    computation: () => PAGE_SIZE
  })
  protected readonly shownRows_ = computed(() => this.visibleRows_().slice(0, this.limit_()))
  protected readonly hiddenCount_ = computed(() => Math.max(0, this.visibleRows_().length - this.limit_()))

  protected showMore(): void {
    this.limit_.update((n) => n + PAGE_SIZE)
  }

  /** What would be saved right now; a change to it starts the autosave clock. */
  private readonly snapshotSig_ = computed(() => JSON.stringify([this.countedDate_(), this.countedLinesSig_()]))

  constructor() {
    warnBeforeUnload(() => this.hasRealChanges())
    effect(() => {
      const snap = this.snapshotSig_()
      untracked(() => this.scheduleAutosave_(snap))
    })
    this.destroyRef_.onDestroy(() => this.clearAutosave_())
  }

  private readonly narrowWatch_ = afterNextRender(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia(NARROW_QUERY)
    const onChange = (e: MediaQueryListEvent): void => {
      this.narrow_.set(e.matches)
    }
    query.addEventListener('change', onChange)
    const phoneQuery = window.matchMedia(PHONE_QUERY)
    const onPhoneChange = (e: MediaQueryListEvent): void => this.phone_.set(e.matches)
    phoneQuery.addEventListener('change', onPhoneChange)
    this.destroyRef_.onDestroy(() => {
      query.removeEventListener('change', onChange)
      phoneQuery.removeEventListener('change', onPhoneChange)
    })
  })

  /** Plan 655: the base amount of a row, as the hover text and the tooltip show it. */
  protected baseLabel_(base: string): string {
    return `${this.translation_.translate('stk_base_amount')}: ${base}`
  }

  async ngOnInit(): Promise<void> {
    await this.load()
    this.finishAddedProduct_()
  }

  /** Plan 651: back from «הוספת מוצר חדש» — the new product fills the line the person came from. */
  private finishAddedProduct_(): void {
    const id = this.route_.snapshot?.queryParamMap?.get('addedProduct')
    const pending = this.returnTo_.takePending()
    if (!id) return
    const product = this.kitchen_.products_().find((p) => p._id === id)
    if (!product || !pending || pending.quantity === undefined) return
    const line = this.lineFor_(product, pending.quantity, pending.unit)
    if (this.place_(product, line)) this.moveToTop_([product._id])
  }

  private clearAutosave_(): void {
    if (this.autosaveTimer_ !== null) clearTimeout(this.autosaveTimer_)
    this.autosaveTimer_ = null
  }

  /** Plan 651: the draft saves itself 2 s after the last change (no button). */
  private scheduleAutosave_(snap: string): void {
    this.clearAutosave_()
    if (this.loadState_() !== 'ready' || snap === this.savedSnapshot_()) return
    this.autosaveTimer_ = setTimeout(() => {
      this.autosaveTimer_ = null
      void this.autosave_()
    }, AUTOSAVE_MS)
  }

  private async autosave_(): Promise<void> {
    if (this.saving_() || this.aiBusy_()) return
    if (!this.dateOk_() || (this.countedCount_() === 0 && !this.draftId_())) return
    await this.run(false, true)
  }

  /** `pendingChangesGuard`: unsaved typed rows since the last save. */
  hasRealChanges(): boolean {
    return this.snapshot_() !== this.savedSnapshot_()
  }

  /** `pendingChangesGuard`: "save and leave". */
  saveAndWait(): Promise<boolean> {
    if (this.countedCount_() === 0 && !this.draftId_()) return Promise.resolve(true)
    return this.run(false)
  }

  protected async load(): Promise<void> {
    this.loadState_.set('loading')
    try {
      const [onHand, draft] = await Promise.all([this.service_.loadOnHand(), this.service_.loadOpenDraft()])
      this.onHand_.set(onHand)
      this.applyDraft_(draft)
      this.loadState_.set('ready')
    } catch (err) {
      this.logging_.error({
        event: 'stock.count.load_failed',
        message: 'Stock count load failed',
        context: { status: err instanceof HttpErrorResponse ? err.status : 0 }
      })
      this.loadState_.set('failed')
    }
  }

  protected blank_(product: Product): RowState {
    return { counted: false, amount: 0, unit: product.baseUnit }
  }

  /** The amount in the base unit, for display only; the server stores the real value. */
  private baseText_(product: Product, state: RowState): string | null {
    if (state.unit === product.baseUnit) return null
    const base = toBase(state.amount, state.unit, product, this.units_)
    if (base === null) return null
    const f = formatQty(base, product.baseUnit)
    return `${f.qty} ${this.unitName_(f.unit)}`
  }

  /** Plan 658: a unit key as the cook named it (the saved Hebrew name), the key itself when it has none. */
  protected unitName_(key: string | undefined): string {
    return key ? this.translation_.translate(key) : ''
  }

  protected setAmount(product: Product, amount: number): void {
    const row = this.rows_()[product._id]
    this.patch_(product, { amount, counted: !row?.fix && !row?.choose })
  }

  protected setUnit(product: Product, unit: string): void {
    if (unit === ADD_UNIT) {
      void this.addUnitFor_(product)
      return
    }
    this.patch_(product, { unit, counted: true, fix: undefined, choose: undefined })
  }

  /** Plan 651 (unit-dropdown-add): the add-unit window, as the product form opens it; the new unit is selected. */
  private async addUnitFor_(product: Product): Promise<void> {
    const forProduct = { name: product.nameHebrew, baseUnit: product.baseUnit }
    const existingUnitSymbols = (product.purchaseOptions ?? []).map((o) => o.unitSymbol)
    setTimeout(() => this.units_.openUnitCreator({ existingUnitSymbols, forProduct }), 0)
    const added = await this.units_.awaitProductUnitAdded()
    if (!added) return
    const { key, amount, basis } = added
    if (!product.purchaseOptions?.some((o) => o.unitSymbol === key)) {
      const updated: Product = {
        ...product,
        purchaseOptions: [
          ...(product.purchaseOptions ?? []),
          { unitSymbol: key, conversionRate: amount, uom: basis, priceOverride: 0 }
        ]
      }
      await this.kitchen_.saveProduct(updated).catch(() => undefined)
    }
    this.setUnit(product, key)
  }

  /** Plan 651: the counted rows go to the top of the list. */
  protected moveCountedToTop(): void {
    const rows = this.rows_()
    this.topIds_.set(
      this.products_()
        .filter((p) => rows[p._id]?.counted)
        .map((p) => p._id)
    )
  }

  private moveToTop_(ids: string[]): void {
    this.topIds_.update((old) => [...ids, ...old.filter((id) => !ids.includes(id))])
  }

  /** Plan 651: the autosave line — «נשמר אוטומטית · HH:mm». */
  protected autosavedText_(): string {
    const at = this.draftSavedAt_()
    if (at === null) return ''
    const d = new Date(at)
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return this.translation_.translate('stk_autosaved').replace('{time}', time)
  }

  protected unitNoteText_(fix: string): string {
    return this.translation_.translate('stk_unit_needs_fix').replace('{unit}', fix)
  }

  protected countStatusKey_(c: StockCount): string {
    return c.status === 'final' ? 'stk_count_status_final' : 'stk_count_status_draft'
  }

  protected async openPast(): Promise<void> {
    this.view_.set('past')
    this.pastState_.set('loading')
    try {
      this.pastCounts_.set(await this.past_.list())
      this.pastState_.set('ready')
    } catch {
      this.pastState_.set('failed')
    }
  }

  /** Plan 651: a past draft opens on the sheet (the count in hand is saved first). */
  protected async openPastDraft(count: StockCount): Promise<void> {
    if (count.status !== 'draft') return
    if (this.hasRealChanges() && !(await this.run(false, true))) return
    this.applyDraft_(count)
    this.view_.set('sheet')
  }

  protected toggleCounted(product: Product): void {
    const current = this.rows_()[product._id]
    if (current?.fix || current?.choose) return
    this.unmark_(product._id)
    if (current?.counted) {
      this.rows_.update((rows) => Object.fromEntries(Object.entries(rows).filter(([id]) => id !== product._id)))
    } else {
      this.patch_(product, { counted: true })
    }
  }

  protected setDate(iso: string): void {
    const clamped = iso && iso > todayIso() ? todayIso() : iso
    this.countedDate_.set(clamped)
  }

  protected finalize(): Promise<boolean> {
    return this.run(true)
  }

  /** Plan 637: applies a suggestion; it never overwrites a row the person already counted differently. */
  protected onExtracted(e: StockAiExtracted): void {
    const known = new Map(this.kitchen_.products_().map((p) => [p._id, p]))
    const { lines, unmatched, draftId } = e.answer
    let applied = 0
    const filled: string[] = []
    for (const line of lines) {
      const product = known.get(line.productId)
      if (product && this.place_(product, line)) {
        applied++
        filled.push(product._id)
      }
    }
    // Plan 651: what the AI filled comes to the top, so it is seen at once.
    if (filled.length) this.moveToTop_(filled)
    if (unmatched.length) {
      const added = unmatched.map((u): StockAiUnmatched => {
        const id = ++this.unmatchedSeq_
        this.amounts_.set(id, {
          quantity: u.quantity,
          unit: u.unit,
          spokenUnit: u.spokenUnit,
          spoken: u.spoken,
          productId: u.productId
        })
        return {
          id,
          text: [u.spoken, u.quantity, this.unitName_(u.unit ?? u.spokenUnit)]
            .filter((v) => v !== undefined && v !== '')
            .join(' '),
          status: u.status === 'choose' ? 'choose' : 'unmatched',
          candidates: (u.candidates ?? []).map((c) => ({ productId: c.productId, name: c.nameHebrew })),
          hasAmount: u.quantity !== undefined,
          // Plan 655: the server's check is the authority; an older answer without it falls back to what is absent.
          missing: u.missing ?? [
            ...(u.productId === undefined ? (['product'] as const) : []),
            ...(u.quantity === undefined ? (['amount'] as const) : []),
            ...(u.unit === undefined ? (['unit'] as const) : [])
          ]
        }
      })
      this.unmatched_.update((list) => [...list, ...added])
    }
    if (draftId && !this.draftIds_().includes(draftId) && this.draftIds_().length < MAX_DRAFT_IDS) {
      this.draftIds_.update((ids) => [...ids, draftId])
    }
    if (e.source === 'voice') this.source_.set('voice')
    else if (this.source_() === 'manual') this.source_.set('text')
    if (lines.length === 0 && unmatched.length === 0) {
      this.userMsg_.onSetWarningMsg(this.translation_.translate('stk_ai_nothing_found'))
    } else if (applied > 0) {
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('stk_ai_applied').replace('{n}', String(applied)))
    }
  }

  protected replaceWithSuggestion(productId: string): void {
    const entry = this.conflicts_().find((c) => c.productId === productId)
    if (!entry) return
    if (entry.line.unit === null) return
    this.suggest_(productId, { ...entry.line, unit: entry.line.unit })
    this.keepOnSheet(productId)
  }

  protected keepOnSheet(productId: string): void {
    this.conflicts_.update((list) => list.filter((c) => c.productId !== productId))
  }

  protected dismissUnmatched(id: number): void {
    this.amounts_.delete(id)
    this.unmatched_.update((list) => list.filter((u) => u.id !== id))
  }

  /** Plan 650: the person picked the product for a spoken line; its amount fills that product's row. */
  protected pickForSpoken(pick: StockAiPick): void {
    const amount = this.amounts_.get(pick.id)
    const product = this.kitchen_.products_().find((p) => p._id === pick.productId)
    if (!amount || !product) return
    if (amount.quantity === undefined) {
      // Plan 655: the product is answered; the amount is still asked — the line stays, without the product question.
      this.amounts_.set(pick.id, { ...amount, productId: product._id })
      this.updateUnmatched_(pick.id, (u) => ({
        ...u,
        candidates: [],
        missing: u.missing.filter((m) => m !== 'product')
      }))
      return
    }
    // Plan 651: only a unit the product has is used; any other said unit is flagged for a fix, never guessed.
    const line = this.lineFor_(product, amount.quantity, amount.unit ?? amount.spokenUnit)
    if (this.place_(product, line)) {
      this.moveToTop_([product._id])
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('stk_ai_applied').replace('{n}', '1'))
    }
    this.dismissUnmatched(pick.id)
  }

  private updateUnmatched_(id: number, change: (u: StockAiUnmatched) => StockAiUnmatched): void {
    this.unmatched_.update((list) => list.map((u) => (u.id === id ? change(u) : u)))
  }

  /** Plan 655: the person answered «כמה?» for a spoken line; with its product known the row is filled now. */
  protected answerAmount(answer: StockAiAmount): void {
    const amount = this.amounts_.get(answer.id)
    if (!amount || !Number.isFinite(answer.quantity) || answer.quantity < 0) return
    this.amounts_.set(answer.id, { ...amount, quantity: answer.quantity })
    const product = amount.productId ? this.kitchen_.products_().find((p) => p._id === amount.productId) : undefined
    if (product) {
      this.pickForSpoken({ id: answer.id, productId: product._id })
      return
    }
    this.updateUnmatched_(answer.id, (u) => ({
      ...u,
      hasAmount: true,
      text: [u.text, answer.quantity].join(' '),
      missing: u.missing.filter((m) => m !== 'amount')
    }))
  }

  /** Plan 654: the line for a picked product — the said unit the product has, the unit note, or the unit choice. */
  private lineFor_(product: Product, quantity: number, said: string | undefined): StockExtractLine {
    if (!said) return { productId: product._id, quantity, unit: null, unitMissing: true }
    const unit = unitForSpoken(said, product)
    return unit === null
      ? { productId: product._id, quantity, unit: null, unitNeedsFix: true, spokenUnit: said }
      : { productId: product._id, quantity, unit }
  }

  /** Plan 650: «הוספת מוצר חדש» — the only way a spoken line leads to a new item; it opens the add-product page. */
  protected async addNewForSpoken(id: number): Promise<void> {
    const amount = this.amounts_.get(id)
    // Plan 651 (leave-and-return): the count is saved first, with no confirm, so the numbers are there on return.
    if (this.hasRealChanges() && !(await this.run(false, true))) return
    const spoken = amount?.spoken ?? ''
    const said = amount?.unit ?? amount?.spokenUnit
    this.returnTo_.setPending({
      spoken,
      ...(amount?.quantity !== undefined && { quantity: amount.quantity }),
      ...(said && { unit: said })
    })
    void this.router_.navigate(['/inventory/add'], { queryParams: { name: spoken, returnUrl: '/inventory/count' } })
  }

  /**
   * Fills the product's row with the suggestion, or lists a conflict when the person already counted it differently.
   * Returns true when the row was filled.
   */
  private place_(product: Product, line: StockExtractLine): boolean {
    const state = this.rows_()[product._id]
    if (line.unit === null) {
      // Plan 651: the product has no such unit — the amount waits, uncounted, with a note to pick a unit.
      if (state?.counted) return false
      this.errorProductId_.update((id) => (id === product._id ? null : id))
      this.rows_.update((rows) => ({
        ...rows,
        [product._id]: line.unitMissing
          ? { counted: false, amount: line.quantity, unit: '', choose: true }
          : { counted: false, amount: line.quantity, unit: '', fix: line.spokenUnit ?? '' }
      }))
      this.aiRows_.update((set) => new Set(set).add(product._id))
      return true
    }
    if (!state?.counted) {
      this.suggest_(product._id, { ...line, unit: line.unit })
      return true
    }
    if (state.amount !== line.quantity || state.unit !== line.unit) {
      const entry: PendingConflict = {
        productId: product._id,
        name: product.nameHebrew,
        onSheet: `${state.amount} ${this.unitName_(state.unit)}`,
        suggested: `${line.quantity} ${this.unitName_(line.unit)}`,
        line
      }
      this.conflicts_.update((list) => [...list.filter((c) => c.productId !== product._id), entry])
    }
    return false
  }

  private suggest_(productId: string, line: StockExtractLine & { unit: string }): void {
    this.errorProductId_.update((id) => (id === productId ? null : id))
    this.rows_.update((rows) => ({ ...rows, [productId]: { counted: true, amount: line.quantity, unit: line.unit } }))
    this.aiRows_.update((set) => new Set(set).add(productId))
  }

  private unmark_(productId: string): void {
    if (!this.aiRows_().has(productId)) return
    this.aiRows_.update((set) => new Set([...set].filter((id) => id !== productId)))
  }

  private patch_(product: Product, change: Partial<RowState>): void {
    this.unmark_(product._id)
    this.errorProductId_.update((id) => (id === product._id ? null : id))
    this.rows_.update((rows) => ({
      ...rows,
      [product._id]: { ...(rows[product._id] ?? this.blank_(product)), ...change }
    }))
  }

  private readonly countedLinesSig_ = computed(() => {
    const rows = this.rows_()
    return this.products_()
      .filter((p) => rows[p._id]?.counted)
      .map((p) => ({ productId: p._id, quantity: rows[p._id].amount, unit: rows[p._id].unit }))
  })

  private countedLines_(): { productId: string; quantity: number; unit: string }[] {
    return this.countedLinesSig_()
  }

  private snapshot_(): string {
    return this.snapshotSig_()
  }

  private applyDraft_(draft: StockCount | null): void {
    const known = new Map(this.kitchen_.products_().map((p) => [p._id, p]))
    const rows: Record<string, RowState> = {}
    for (const line of draft?.lines ?? []) {
      if (known.has(line.productId)) rows[line.productId] = { counted: true, amount: line.quantity, unit: line.unit }
    }
    this.rows_.set(rows)
    this.draftId_.set(draft?._id ?? null)
    this.draftSavedAt_.set(draft ? (draft.updatedAt ?? null) : null)
    this.countedDate_.set(draft ? isoFromCountedAt(draft.countedAt) : todayIso())
    this.errorProductId_.set(null)
    this.topIds_.set([])
    this.aiRows_.set(new Set())
    this.conflicts_.set([])
    this.unmatched_.set([])
    this.amounts_.clear()
    this.source_.set(draft?.source ?? 'manual')
    this.draftIds_.set(draft?.draftIds ?? [])
    this.savedSnapshot_.set(this.snapshot_())
  }

  private emptySheet_(): void {
    this.applyDraft_(null)
  }

  /** Save the counted rows as a draft; with `closeIt`, then close the count. Returns true on success. */
  private async run(closeIt: boolean, silent = false): Promise<boolean> {
    if (this.saving_()) return false
    this.saving_.set(true)
    this.errorProductId_.set(null)
    const lines = this.countedLines_()
    const input: StockCountInput = {
      countedAt: countedAtFromIso(this.countedDate_(), Date.now()),
      source: this.source_(),
      ...(this.draftIds_().length > 0 && { draftIds: this.draftIds_() }),
      lines
    }
    try {
      const saved = await this.service_.saveDraft(input, this.draftId_() ?? undefined)
      this.draftId_.set(saved._id)
      this.draftSavedAt_.set(saved.updatedAt ?? Date.now())
      this.savedSnapshot_.set(this.snapshot_())
      if (closeIt) {
        await this.service_.finalize(saved._id)
        this.userMsg_.onSetSuccessMsg(this.translation_.translate('stk_finalized'))
        this.emptySheet_()
        try {
          this.onHand_.set(await this.service_.loadOnHand())
        } catch {
          // The count is closed; the below-minimum view simply keeps the previous on-hand list.
        }
        this.view_.set('below')
      } else if (!silent) {
        this.userMsg_.onSetSuccessMsg(this.translation_.translate('stk_draft_saved'))
      }
      return true
    } catch (err) {
      await this.onSaveError_(
        err,
        lines.map((l) => l.productId)
      )
      return false
    } finally {
      this.saving_.set(false)
    }
  }

  private async onSaveError_(err: unknown, sentIds: string[]): Promise<void> {
    const status = err instanceof HttpErrorResponse ? err.status : 0
    const body = err instanceof HttpErrorResponse ? (err.error as { error?: string; line?: number } | null) : null
    this.logging_.error({
      event: 'stock.count.save_failed',
      message: 'Stock count save failed',
      context: { status, code: body?.error }
    })
    if (status === 400 && body?.error && LINE_ERRORS.includes(body.error) && typeof body.line === 'number') {
      const errorId = sentIds[body.line] ?? null
      this.errorProductId_.set(errorId)
      // Plan 645: a refused row beyond the drawn page is drawn too, so its mark is visible.
      const at = errorId === null ? -1 : this.visibleRows_().findIndex((r) => r.product._id === errorId)
      if (at >= this.limit_()) this.limit_.set(at + 1)
      this.userMsg_.onSetErrorMsg(this.translation_.translate('stk_line_refused'))
    } else if (status === 409 && body?.error === 'COUNT_FINAL') {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('stk_count_final'))
      this.emptySheet_()
      try {
        this.applyDraft_(await this.service_.loadOpenDraft())
      } catch {
        // Stay on the empty sheet; a reload of the page looks the draft up again.
      }
    } else {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('stk_save_failed'))
    }
  }
}
