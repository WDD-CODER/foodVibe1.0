import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, FormsModule } from '@angular/forms'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { MenuDishDataService } from '@services/menu-dish-data.service'
import { DishSalesMonthDataService } from '@services/dish-sales-month-data.service'
import { PermissionService } from '@services/permission.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import type { MenuDish } from '@models/menu-dish.model'
import type { DishReturnReasonLine, DishSalesRow } from '@models/dish-sales-month.model'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { currentMonthKey, isMonthKey, monthKeyLabel, shiftMonthKey } from 'src/app/core/utils/month-key.util'
import { useUnsavedChanges } from 'src/app/core/utils/unsaved-changes'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ReturnReasonsDialogComponent } from './components/return-reasons-dialog/return-reasons-dialog.component'

/** What the owner typed for one dish: `null` = not entered, 0 = a real zero (N-M2). */
interface Draft {
  sold: number | null
  returned: number | null
  reasons: DishReturnReasonLine[]
}

const EMPTY_DRAFT: Draft = { sold: null, returned: null, reasons: [] }

/** Plan 726: type a month's dish sales and returns, with a reason for every return. Owner only. */
@Component({
  selector: 'app-dish-sales-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    LucideAngularModule,
    NumberBoxDirective,
    TranslatePipe,
    ListShellComponent,
    EmptyStateComponent,
    LoaderComponent,
    ReturnReasonsDialogComponent
  ],
  templateUrl: './dish-sales.page.html',
  styleUrl: './dish-sales.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DishSalesPage {
  private readonly dishData = inject(MenuDishDataService)
  private readonly months = inject(DishSalesMonthDataService)
  private readonly permission = inject(PermissionService)
  private readonly metadata = inject(MetadataRegistryService)
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly translation = inject(TranslationService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly query_ = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap })

  protected readonly isStaff_ = this.permission.isStaff_
  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = computed(() => this.dishData.loadFailed_() || this.months.loadFailed_())
  protected readonly isSaving_ = signal(false)
  protected readonly drafts_ = signal<Record<string, Draft>>({})
  protected readonly dialogDishId_ = signal<string | null>(null)
  protected readonly showSkipped_ = signal(false)

  /** `?month=` when it is a real month not after this one, else this month. */
  protected readonly month_ = computed(() => {
    const now = currentMonthKey()
    const asked = this.query_().get('month')
    return isMonthKey(asked) && asked <= now ? asked : now
  })
  protected readonly monthLabel_ = computed(() => monthKeyLabel(this.month_()))
  protected readonly isCurrentMonth_ = computed(() => this.month_() >= currentMonthKey())
  protected readonly stored_ = computed(() => this.months.monthOf(this.month_()))
  protected readonly isClosed_ = computed(() => !!this.stored_()?.closedAt)
  protected readonly closedDate_ = computed(() => {
    const at = this.stored_()?.closedAt
    return at ? new Date(at).toLocaleDateString('he-IL') : ''
  })
  protected readonly skipped_ = computed(() => this.stored_()?.skipped ?? [])

  private readonly courseOrder_ = computed(() => this.metadata.courses_().map((c) => c.key))

  /** Every active dish, plus an inactive one that has a row in this month. */
  protected readonly rows_ = computed(() => {
    const stored = new Set((this.stored_()?.rows ?? []).map((r) => r.menuDishId))
    const order = this.courseOrder_()
    const rank = (c?: string) => {
      const i = c ? order.indexOf(c) : -1
      return i < 0 ? order.length : i
    }
    return this.dishData
      .allDishes_()
      .filter((d) => !d.deletedAt && (d.active !== false || stored.has(d._id)))
      .sort((a, b) => rank(a.course) - rank(b.course) || a.name.localeCompare(b.name, 'he'))
      .map((dish) => ({ dish, removed: dish.active === false }))
  })

  protected readonly progress_ = computed(() => {
    const drafts = this.drafts_()
    const ids = this.rows_().map((r) => r.dish._id)
    let done = 0
    let sold = 0
    let returned = 0
    for (const id of ids) {
      const d = drafts[id]
      if (!d) continue
      if (d.sold !== null || d.returned !== null) done++
      sold += d.sold ?? 0
      returned += d.returned ?? 0
    }
    return { done, total: ids.length, sold, returned }
  })

  protected readonly progressText_ = computed(() => {
    const p = this.progress_()
    return this.translation
      .translate('dish_sales_progress')
      .replace('{{done}}', String(p.done))
      .replace('{{total}}', String(p.total))
      .replace('{{sold}}', String(p.sold))
      .replace('{{returned}}', String(p.returned))
  })

  protected readonly emptySoldCount_ = computed(
    () => this.rows_().filter((r) => (this.drafts_()[r.dish._id]?.sold ?? null) === null).length
  )

  /** A dish whose reasons add up to more than what came back blocks the save. */
  protected readonly hasOverReasons_ = computed(() =>
    this.rows_().some((r) => this.given(r.dish._id) > (this.drafts_()[r.dish._id]?.returned ?? 0))
  )

  protected readonly canSave_ = computed(
    () => !this.isClosed_() && !this.isSaving_() && !this.hasOverReasons_() && !this.isLoading_()
  )

  protected readonly dialogDish_ = computed(
    () => this.rows_().find((r) => r.dish._id === this.dialogDishId_())?.dish ?? null
  )

  private readonly anchor_ = new FormControl(null)
  private readonly unsaved_ = useUnsavedChanges({ form: () => this.anchor_, snapshot: () => this.snapshot_() })

  constructor() {
    effect(() => {
      const stored = this.stored_()
      const loading = this.isLoading_()
      this.month_()
      untracked(() => {
        if (!loading) this.hydrate_(stored?.rows ?? [])
      })
    })
    if (this.isStaff_()) this.isLoading_.set(false)
    else void this.load()
  }

  protected async load(): Promise<void> {
    this.isLoading_.set(true)
    await Promise.all([
      this.dishData.load(),
      this.months.load(),
      this.taxonomy.loadSafely({ event: 'dish_sales.taxonomy', message: 'Loading return reasons failed' })
    ])
    this.isLoading_.set(false)
  }

  private hydrate_(rows: readonly DishSalesRow[]): void {
    const drafts: Record<string, Draft> = {}
    for (const r of rows) {
      drafts[r.menuDishId] = { sold: r.sold, returned: r.returned, reasons: r.returnReasons.map((x) => ({ ...x })) }
    }
    this.drafts_.set(drafts)
    this.unsaved_.markSaved()
  }

  /** Comparable text of what is typed (a dish with nothing typed counts as no entry). */
  private snapshot_(): string {
    const drafts = this.drafts_()
    return JSON.stringify(
      Object.keys(drafts)
        .sort()
        .filter((id) => this.hasContent(drafts[id]))
        .map((id) => [id, drafts[id].sold, drafts[id].returned, drafts[id].reasons])
    )
  }

  private hasContent(d: Draft): boolean {
    return d.sold !== null || d.returned !== null || d.reasons.length > 0
  }

  // ── page contract for pendingChangesGuard ───────────────────────────────

  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  async saveAndWait(): Promise<boolean> {
    return this.save()
  }

  // ── the typed numbers ───────────────────────────────────────────────────

  protected draftOf(id: string): Draft {
    return this.drafts_()[id] ?? EMPTY_DRAFT
  }

  protected given(id: string): number {
    return this.draftOf(id).reasons.reduce((sum, r) => sum + r.count, 0)
  }

  protected setNumber(id: string, field: 'sold' | 'returned', value: number | string | null): void {
    if (this.isClosed_()) return
    const n = value === null || value === '' ? null : Math.trunc(Number(value))
    const next = n !== null && Number.isFinite(n) ? Math.max(0, n) : null
    const current = this.draftOf(id)
    let reasons = current.reasons
    if (field === 'returned' && (next === null || next === 0) && reasons.length > 0) {
      reasons = []
      this.userMsg.onSetSuccessMsg(this.translation.translate('dish_sales_reasons_cleared'))
    }
    this.drafts_.update((all) => ({ ...all, [id]: { ...current, [field]: next, reasons } }))
  }

  protected async fillEmptyWithZero(): Promise<void> {
    const n = this.emptySoldCount_()
    if (this.isClosed_() || n === 0) return
    const message = this.translation.translate('dish_sales_zero_fill_confirm').replace('{{n}}', String(n))
    if (!(await this.confirmModal.open(message))) return
    this.drafts_.update((all) => {
      const next = { ...all }
      for (const r of this.rows_()) {
        const d = next[r.dish._id] ?? EMPTY_DRAFT
        if (d.sold === null) next[r.dish._id] = { ...d, sold: 0 }
      }
      return next
    })
  }

  protected reasonsText(id: string): string {
    return this.translation
      .translate('dish_sales_reasons_count')
      .replace('{{given}}', String(this.given(id)))
      .replace('{{returned}}', String(this.draftOf(id).returned ?? 0))
  }

  protected canOpenReasons(id: string): boolean {
    return (this.draftOf(id).returned ?? 0) > 0
  }

  protected openReasons(id: string): void {
    if (this.canOpenReasons(id)) this.dialogDishId_.set(id)
  }

  protected onReasonsConfirmed(lines: DishReturnReasonLine[]): void {
    const id = this.dialogDishId_()
    if (id) this.drafts_.update((all) => ({ ...all, [id]: { ...this.draftOf(id), reasons: lines } }))
    this.dialogDishId_.set(null)
  }

  // ── month arrows ────────────────────────────────────────────────────────

  protected goMonth(step: -1 | 1): void {
    if (step === 1 && this.isCurrentMonth_()) return
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { month: shiftMonthKey(this.month_(), step) }
    })
  }

  // ── save ────────────────────────────────────────────────────────────────

  /** The whole month: a dish is sent only when it has a number or reasons; rows of dishes no longer listed stay. */
  private payload_(): DishSalesRow[] {
    const drafts = this.drafts_()
    const stored = new Map((this.stored_()?.rows ?? []).map((r) => [r.menuDishId, r] as const))
    const listed = new Set(this.rows_().map((r) => r.dish._id))
    const rows: DishSalesRow[] = this.rows_()
      .filter((r) => this.hasContent(this.draftOf(r.dish._id)) && !!drafts[r.dish._id])
      .map(({ dish }) => {
        const d = drafts[dish._id]
        const old = stored.get(dish._id)
        return {
          menuDishId: dish._id,
          nameSnapshot: dish.name,
          sold: d.sold,
          returned: d.returned,
          returnReasons: d.reasons,
          ...(old?.netSales !== undefined ? { netSales: old.netSales } : {}),
          source: old?.source ?? 'typed'
        }
      })
    const orphans = [...stored.values()].filter((r) => !listed.has(r.menuDishId))
    return [...rows, ...orphans]
  }

  protected async save(): Promise<boolean> {
    if (!this.canSave_()) return false
    this.isSaving_.set(true)
    try {
      await this.months.saveMonth(this.month_(), this.payload_(), this.stored_()?.note)
      this.unsaved_.markSaved()
      this.userMsg.onSetSuccessMsg(this.translation.translate('dish_sales_saved'))
      return true
    } catch (err) {
      this.userMsg.onSetErrorMsg(this.translation.translate(this.saveErrorKey_(err)))
      return false
    } finally {
      this.isSaving_.set(false)
    }
  }

  private saveErrorKey_(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      const key = err.error?.messageKey
      if (key === 'dish_month_closed' || key === 'dish_month_exists') return key
    }
    return 'dish_sales_save_failed'
  }

  // ── display ─────────────────────────────────────────────────────────────

  protected courseLabel(dish: MenuDish): string {
    return dish.course ? this.translation.translate(dish.course) : ''
  }

  protected bannerText(): string {
    return this.translation.translate('dish_sales_closed_banner').replace('{{date}}', this.closedDate_())
  }

  protected skippedText(): string {
    return this.translation.translate('dish_sales_skipped').replace('{{n}}', String(this.skipped_().length))
  }
}
