import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { BusinessService } from '@services/business.service'
import { CloudinaryService } from '@services/cloudinary.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { PlanSnapshotService } from '@services/plan-snapshot.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { ClosingSupplier, EventClosing, MenuEvent } from '@models/menu-event.model'
import { BUSINESS_SETTINGS_DEFAULTS } from '@schemas/entities'
import { computeClosingResult, initClosing, supplierVariance } from '../../../../core/engine/event-closing'
import type { SupplierVariance } from '../../../../core/engine/event-closing'
import { formatMoney, formatPct1 } from '../../../../core/engine/rounding'
import { downscaleImage } from '../../../../core/utils/downscale-image.util'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'

/** The key of the "no supplier" row (its `supplierId` is null). */
const NO_SUPPLIER_KEY = '__none__'
export const MAX_CLOSING_PHOTOS = 10

const rowKey = (row: Pick<ClosingSupplier, 'supplierId'>): string => row.supplierId ?? NO_SUPPLIER_KEY

export interface ClosingRowView {
  key: string
  row: ClosingSupplier
  /** 'over' = red, 'under' = grey, '' = no remark */
  level: 'over' | 'under' | ''
  remark: string
}

/**
 * Plan 446: the closing dialog of an event. One row per supplier (planned, what was really paid, arrived, invoice,
 * delivery-note photos), the actual extra costs and revenue, and the planned-versus-actual profit in the footer.
 * Amounts need `editMoney`; arrived, invoice and photos need `markArrival`. The server decides again (plan 446 routes).
 */
@Component({
  selector: 'app-event-closing-dialog',
  standalone: true,
  imports: [NumberBoxDirective, LucideAngularModule, TranslatePipe, CustomSelectComponent, SelectOnFocusDirective],
  templateUrl: './event-closing-dialog.component.html',
  styleUrl: './event-closing-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' }
})
export class EventClosingDialogComponent {
  // 1. INJECTED
  private readonly eventData = inject(MenuEventDataService)
  private readonly pipeline = inject(EventPipelineService)
  private readonly permission = inject(PermissionService)
  private readonly business = inject(BusinessService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly snapshots = inject(PlanSnapshotService)
  private readonly cloudinary = inject(CloudinaryService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly logging = inject(LoggingService)

  // 2. INPUTS
  readonly eventId = input.required<string>()

  // 3. OUTPUTS
  readonly closed = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly draft_ = signal<EventClosing | null>(null)
  protected readonly uploading_ = signal<ReadonlySet<string>>(new Set())
  protected readonly isPicking_ = signal(false)
  protected readonly isBusy_ = signal(false)
  protected readonly maxPhotos = MAX_CLOSING_PHOTOS
  protected readonly formatMoney = formatMoney
  protected readonly formatPct1 = formatPct1
  private saveChain_: Promise<void> = Promise.resolve()

  // 5. COMPUTED
  protected readonly event_ = computed<MenuEvent | null>(
    () => this.eventData.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )
  protected readonly snapshot_ = computed(() => this.event_()?.planSnapshot ?? null)
  protected readonly locked_ = computed(() => this.event_()?.stage === 'finished')
  protected readonly canFinish_ = computed(() => {
    const stage = this.event_()?.stage
    return stage === 'execution' || stage === 'post_production'
  })
  protected readonly canMoney_ = computed(() => this.can('editMoney'))
  protected readonly canArrival_ = computed(() => this.can('markArrival'))
  protected readonly closing_ = computed<EventClosing | null>(() => {
    const snapshot = this.snapshot_()
    return this.draft_() ?? this.event_()?.closing ?? (snapshot ? initClosing(snapshot) : null)
  })
  protected readonly threshold_ = computed(
    () => this.business.business_()?.settings?.overrunThresholdPct ?? BUSINESS_SETTINGS_DEFAULTS.overrunThresholdPct
  )
  protected readonly result_ = computed(() => {
    const snapshot = this.snapshot_()
    const closing = this.closing_()
    return snapshot && closing ? computeClosingResult(snapshot, closing) : null
  })
  protected readonly rows_ = computed<ClosingRowView[]>(() =>
    (this.closing_()?.suppliers ?? []).map((row) => this.viewOf(row))
  )
  protected readonly supplierOptions_ = computed(() => {
    const used = new Set((this.closing_()?.suppliers ?? []).map(rowKey))
    const options = [...this.kitchenState.suppliersById_().values()]
      .filter((s) => !used.has(s._id))
      .map((s) => ({ value: s._id, label: s.nameHebrew }))
    return used.has(NO_SUPPLIER_KEY)
      ? options
      : [{ value: NO_SUPPLIER_KEY, label: this.translation.translate('no_supplier') }, ...options]
  })
  protected readonly missingText_ = computed(() => {
    const count = this.result_()?.missingAmounts ?? 0
    return this.translation.translate('closing_missing_amounts').replace('{{count}}', String(count))
  })

  // 6. METHODS
  /** Adds a supplier row (planned 0) chosen from the picker. */
  protected addSupplier(value: string): void {
    const closing = this.closing_()
    if (!closing || !value) return
    const supplierId = value === NO_SUPPLIER_KEY ? null : value
    const name =
      supplierId === null
        ? this.translation.translate('no_supplier')
        : (this.kitchenState.suppliersById_().get(supplierId)?.nameHebrew ?? '')
    const row: ClosingSupplier = { supplierId, name, planned: 0, arrived: false, hasInvoice: false, photos: [] }
    this.isPicking_.set(false)
    void this.commit({ ...closing, suppliers: [...closing.suppliers, row] })
  }

  protected removePhoto(key: string, url: string): void {
    const index =
      this.closing_()
        ?.suppliers.find((r) => rowKey(r) === key)
        ?.photos.indexOf(url) ?? -1
    this.updateRow(key, (row) => ({ ...row, photos: row.photos.filter((p) => p !== url) }))
    if (index < 0) return
    // Undo goes through the same updateRow / commit path that saved the removal.
    this.userMsg.onLineRemoved(
      this.translation.translate('photo_removed'),
      () =>
        this.updateRow(key, (row) => {
          if (row.photos.includes(url)) return row
          const photos = [...row.photos]
          photos.splice(Math.min(index, photos.length), 0, url)
          return { ...row, photos }
        }),
      this.destroyRef
    )
  }

  protected async addPhotos(key: string, files: FileList | null): Promise<void> {
    if (!files?.length) return
    const picked = Array.from(files)
    this.setUploading(key, true)
    try {
      for (const file of picked) {
        if ((this.closing_()?.suppliers.find((r) => rowKey(r) === key)?.photos.length ?? 0) >= MAX_CLOSING_PHOTOS) break
        const url = await firstValueFrom(this.cloudinary.upload(await downscaleImage(file)))
        this.updateRow(key, (row) => ({ ...row, photos: [...row.photos, url] }))
      }
    } catch (err) {
      this.logging.error({
        event: 'events.closing.photo_failed',
        message: 'Delivery-note photo upload failed',
        context: { err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.translation.translate('closing_photo_failed'))
    } finally {
      this.setUploading(key, false)
    }
  }

  protected async finish(): Promise<void> {
    const result = this.result_()
    if (!result || this.isBusy_()) return
    if (
      result.missingAmounts > 0 &&
      !(await this.confirmModal.open(this.missingText_(), { saveLabel: 'closing_finish' }))
    )
      return
    this.isBusy_.set(true)
    await this.saveChain_
    const done = await this.pipeline.finish(this.eventId())
    this.isBusy_.set(false)
    if (done.ok) this.userMsg.onSetSuccessMsg(this.translation.translate('closing_saved'))
  }

  protected async reopen(): Promise<void> {
    if (this.isBusy_()) return
    this.isBusy_.set(true)
    await this.pipeline.reopen(this.eventId())
    this.isBusy_.set(false)
  }

  protected async refreshPlan(): Promise<void> {
    const event = this.event_()
    if (!event || this.isBusy_()) return
    if (!(await this.confirmModal.open('closing_refresh_confirm', { saveLabel: 'closing_refresh_plan' }))) return
    this.isBusy_.set(true)
    await this.pipeline.refreshPlan(event._id, this.snapshots.buildFor(event))
    this.draft_.set(null)
    this.isBusy_.set(false)
  }

  // UI handlers
  protected onPaidChange(key: string, raw: string): void {
    const amount = this.parseAmount(raw)
    if (amount === null) return
    this.updateRow(key, ({ actualPaid: _old, ...row }) => (amount === undefined ? row : { ...row, actualPaid: amount }))
  }

  protected onExtraChange(raw: string): void {
    this.updateTop('actualExtraCosts', raw)
  }

  protected onRevenueChange(raw: string): void {
    this.updateTop('actualRevenue', raw)
  }

  protected onArrivedChange(key: string, checked: boolean): void {
    this.updateRow(key, (row) => ({ ...row, arrived: checked }))
  }

  protected onInvoiceChange(key: string, checked: boolean): void {
    this.updateRow(key, (row) => ({ ...row, hasInvoice: checked }))
  }

  protected onFilesChosen(key: string, input: HTMLInputElement): void {
    const files = input.files
    void this.addPhotos(key, files).then(() => (input.value = ''))
  }

  protected togglePicker(): void {
    this.isPicking_.update((open) => !open)
  }

  protected isUploading(key: string): boolean {
    return this.uploading_().has(key)
  }

  // private
  private can(action: 'editMoney' | 'markArrival'): boolean {
    const event = this.event_()
    return !!event && this.permission.can(action, { type: 'menuEvents', doc: event })
  }

  /** '' = cleared (undefined), a number >= 0 = value, anything else = null (ignored). */
  private parseAmount(raw: string): number | undefined | null {
    if (raw.trim() === '') return undefined
    const amount = Number(raw)
    return Number.isFinite(amount) && amount >= 0 ? amount : null
  }

  private updateTop(field: 'actualExtraCosts' | 'actualRevenue', raw: string): void {
    const closing = this.closing_()
    const amount = this.parseAmount(raw)
    if (!closing || amount === null) return
    const { [field]: _old, ...rest } = closing
    void this.commit(amount === undefined ? rest : { ...rest, [field]: amount })
  }

  private updateRow(key: string, change: (row: ClosingSupplier) => ClosingSupplier): void {
    const closing = this.closing_()
    if (!closing) return
    void this.commit({ ...closing, suppliers: closing.suppliers.map((r) => (rowKey(r) === key ? change(r) : r)) })
  }

  private setUploading(key: string, on: boolean): void {
    this.uploading_.update((set) => {
      const next = new Set(set)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  }

  /** Shows the change at once and saves it after the saves before it (one at a time, in order). */
  private commit(next: EventClosing): Promise<void> {
    this.draft_.set(next)
    this.saveChain_ = this.saveChain_.then(async () => {
      await this.pipeline.saveClosing(this.eventId(), next)
      // Whatever the server answered is now in the store; a refused change falls back to it.
      if (this.draft_() === next) this.draft_.set(null)
    })
    return this.saveChain_
  }

  private viewOf(row: ClosingSupplier): ClosingRowView {
    const variance = supplierVariance(row.planned, row.actualPaid, this.threshold_())
    return { key: rowKey(row), row, level: this.levelOf(variance), remark: this.remarkOf(variance) }
  }

  private levelOf(variance: SupplierVariance): 'over' | 'under' | '' {
    return variance.kind === 'over' || variance.kind === 'under' ? variance.kind : ''
  }

  private remarkOf(variance: SupplierVariance): string {
    if (variance.kind === 'over') {
      return this.translation
        .translate('closing_overrun')
        .replace('{{pct}}', String(Math.round((variance.pct ?? 0) * 10) / 10))
        .replace('{{amount}}', formatMoney(variance.diff))
    }
    if (variance.kind === 'under') return `${formatPct1(variance.pct ?? 0)} (${formatMoney(variance.diff)})`
    return ''
  }
}
