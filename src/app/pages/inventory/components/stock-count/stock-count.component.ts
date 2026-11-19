import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
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
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
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
import { StockCountService } from '../../services/stock-count.service'
import { StockBelowMinimumComponent } from './stock-below-minimum/stock-below-minimum.component'
import {
  StockAiDraftComponent,
  type StockAiConflict,
  type StockAiExtracted,
  type StockAiUnmatched
} from './stock-ai-draft/stock-ai-draft.component'
import type { StockExtractLine } from '@schemas/ai-stock-extract.schema'

interface RowState {
  counted: boolean
  amount: number
  unit: string
}

type SheetView = 'sheet' | 'below'
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
    DateFieldComponent,
    EmptyStateComponent,
    InputClearComponent,
    ListShellComponent,
    LoaderComponent,
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

  protected readonly products_ = computed(() =>
    [...this.kitchen_.products_()].sort((a, b) => a.nameHebrew.localeCompare(b.nameHebrew, 'he'))
  )
  protected readonly countedCount_ = computed(() => Object.values(this.rows_()).filter((r) => r.counted).length)
  protected readonly below_ = computed(() => belowMinimum(this.kitchen_.products_(), this.onHand_()))
  protected readonly dateOk_ = computed(
    () => /^\d{4}-\d{2}-\d{2}$/.test(this.countedDate_()) && this.countedDate_() <= todayIso()
  )
  protected readonly gridTemplate_ = computed(() => (this.view_() === 'sheet' ? '2fr 1.2fr 1.2fr 0.9fr 1fr' : '1fr'))

  protected readonly visibleRows_ = computed(() => {
    const query = normalizeHebrew(this.search_().trim())
    const show = this.show_()
    const rows = this.rows_()
    return this.products_()
      .filter((p) => !query || normalizeHebrew(p.nameHebrew).includes(query))
      .map((product) => ({ product, state: rows[product._id] ?? this.blank_(product) }))
      .filter(({ state }) => show === 'all' || (show === 'counted' ? state.counted : !state.counted))
  })

  constructor() {
    warnBeforeUnload(() => this.hasRealChanges())
  }

  async ngOnInit(): Promise<void> {
    await this.load()
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

  protected unitOptions_(product: Product): { value: string; label: string }[] {
    return unitOptionsFor(product).map((u) => ({ value: u, label: u }))
  }

  /** The amount in the base unit, for display only; the server stores the real value. */
  protected baseText_(product: Product, state: RowState): string | null {
    if (state.unit === product.baseUnit) return null
    const base = toBase(state.amount, state.unit, product, this.units_)
    if (base === null) return null
    const f = formatQty(base, product.baseUnit)
    return `${f.qty} ${f.unit}`
  }

  protected setAmount(product: Product, amount: number): void {
    this.patch_(product, { amount, counted: true })
  }

  protected setUnit(product: Product, unit: string): void {
    this.patch_(product, { unit, counted: true })
  }

  protected toggleCounted(product: Product): void {
    const current = this.rows_()[product._id]
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

  protected draftFromText_(): string {
    const at = this.draftSavedAt_()
    const date = at === null ? '' : new Date(at).toLocaleDateString('en-GB')
    return this.translation_.translate('stk_draft_from').replace('{date}', date)
  }

  protected saveDraft(): Promise<boolean> {
    return this.run(false)
  }

  protected finalize(): Promise<boolean> {
    return this.run(true)
  }

  /** Plan 637: applies a suggestion; it never overwrites a row the person already counted differently. */
  protected onExtracted(e: StockAiExtracted): void {
    const known = new Map(this.kitchen_.products_().map((p) => [p._id, p]))
    const { lines, unmatched, draftId } = e.answer
    let applied = 0
    for (const line of lines) {
      const product = known.get(line.productId)
      if (!product) continue
      const state = this.rows_()[product._id]
      if (!state?.counted) {
        this.suggest_(product._id, line)
        applied++
      } else if (state.amount !== line.quantity || state.unit !== line.unit) {
        const entry: PendingConflict = {
          productId: product._id,
          name: product.nameHebrew,
          onSheet: `${state.amount} ${state.unit}`,
          suggested: `${line.quantity} ${line.unit}`,
          line
        }
        this.conflicts_.update((list) => [...list.filter((c) => c.productId !== product._id), entry])
      }
    }
    if (unmatched.length) {
      const added = unmatched.map((u) => ({
        id: ++this.unmatchedSeq_,
        text: [u.spoken, u.quantity, u.unit].filter((v) => v !== undefined && v !== '').join(' ')
      }))
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
    this.suggest_(productId, entry.line)
    this.keepOnSheet(productId)
  }

  protected keepOnSheet(productId: string): void {
    this.conflicts_.update((list) => list.filter((c) => c.productId !== productId))
  }

  protected dismissUnmatched(id: number): void {
    this.unmatched_.update((list) => list.filter((u) => u.id !== id))
  }

  private suggest_(productId: string, line: StockExtractLine): void {
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

  private countedLines_(): { productId: string; quantity: number; unit: string }[] {
    const rows = this.rows_()
    return this.products_()
      .filter((p) => rows[p._id]?.counted)
      .map((p) => ({ productId: p._id, quantity: rows[p._id].amount, unit: rows[p._id].unit }))
  }

  private snapshot_(): string {
    return JSON.stringify([this.countedDate_(), this.countedLines_()])
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
    this.aiRows_.set(new Set())
    this.conflicts_.set([])
    this.unmatched_.set([])
    this.source_.set(draft?.source ?? 'manual')
    this.draftIds_.set(draft?.draftIds ?? [])
    this.savedSnapshot_.set(this.snapshot_())
  }

  private emptySheet_(): void {
    this.applyDraft_(null)
  }

  /** Save the counted rows as a draft; with `closeIt`, then close the count. Returns true on success. */
  private async run(closeIt: boolean): Promise<boolean> {
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
      } else {
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
      this.errorProductId_.set(sentIds[body.line] ?? null)
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
