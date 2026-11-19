import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'

import { Product } from '@models/product.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import { GeminiService } from '@services/gemini.service'
import { ProductNameMatcherService } from '@services/product-name-matcher.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { PermissionService } from '@services/permission.service'
import { ApplyRow, ImportRow, InvoiceReadResult, ProductImportService } from '@services/product-import.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { formatMoney, roundMoney } from 'src/app/core/engine/rounding'
import { BusinessService } from '@services/business.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { BUSINESS_SETTINGS_DEFAULTS } from '@schemas/entities'
import { warnBeforeUnload } from '@utils/leave-warning.util'
import { incrementGeminiUsage } from '@utils/gemini-usage.util'
import { isPriceRiseAlert, previousPriceOf, priceChangePct, recipesUsingProducts } from '@utils/price-change.util'
import { registerDraftMetadata, resolveDraftMetadata } from '../../services/ai-draft-metadata.util'
import { TextareaAutoGrowDirective } from '@directives/textarea-auto-grow.directive'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { InvoiceHeaderStripComponent } from './invoice-header-strip/invoice-header-strip.component'
import { PriceImpactPanelComponent, PriceImpactRow } from './price-impact-panel/price-impact-panel.component'
import {
  buildApplyInvoice,
  changeText,
  importErrorKey,
  ImportSummary,
  InvoiceState,
  PreviewRow,
  ImportRowStatus,
  invoiceStateFrom,
  isIsoDate,
  positiveNumber
} from './invoice-import.util'

export type { ImportRowStatus }

/** The base units a product may have (same list as the server). */
const BASE_UNITS = ['gram', 'ml', 'kg', 'liter', 'unit']

@Component({
  selector: 'app-product-import',
  standalone: true,
  imports: [
    NumberBoxDirective,
    SelectOnFocusDirective,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    CustomSelectComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    TextareaAutoGrowDirective,
    InvoiceHeaderStripComponent,
    PriceImpactPanelComponent
  ],
  templateUrl: './product-import.component.html',
  styleUrl: './product-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductImportComponent {
  // 1. INJECTED
  private readonly gemini_ = inject(GeminiService)
  private readonly importService_ = inject(ProductImportService)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly metadataRegistry_ = inject(MetadataRegistryService)
  private readonly permission_ = inject(PermissionService)
  private readonly translation_ = inject(TranslationService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly destroyRef_ = inject(DestroyRef)
  private readonly logging_ = inject(LoggingService)
  private readonly matcher_ = inject(ProductNameMatcherService)
  private readonly unitRegistry_ = inject(UnitRegistryService)
  private readonly business_ = inject(BusinessService)
  private readonly recipeCost_ = inject(RecipeCostService)

  // 3. INPUTS & OUTPUTS (plan 634: a second host, the diagnosis queue, hands over one file and hears about the apply)
  /** Hides the page header, the back link and the paste box; nothing else changes. */
  readonly embedded = input(false)
  /** A file to read as if it was chosen (once per file object); null clears the preview. */
  readonly file = input<File | null>(null)
  /** Emitted after a successful apply; `invoiceId` is null when the apply recorded no invoice. */
  readonly applied = output<{ invoiceId: string | null }>()

  // 4. SIGNALS & CONSTANTS
  private lastFile_: File | null = null
  protected readonly text_ = signal('')
  protected readonly supplierId_ = signal('')
  protected readonly rows_ = signal<PreviewRow[]>([])
  protected readonly isParsed_ = signal(false)
  protected readonly isTruncated_ = signal(false)
  protected readonly isParsing_ = signal(false)
  /** True when the rows in the preview were read from a photo or a PDF (shows the "check every line" note). */
  protected readonly isFromPhoto_ = signal(false)
  protected readonly isSaving_ = signal(false)
  /** True while the AI name-matching step runs after a parse. */
  protected readonly isMatching_ = signal(false)
  protected readonly hasMatchFailed_ = signal(false)
  /** Ids of the rows sent to the AI step and not answered yet; they show a neutral status instead of `new`. */
  protected readonly pendingIds_ = signal<ReadonlySet<number>>(new Set())
  protected readonly formatMoney = formatMoney
  /** Rows the user removed from the preview; they count as skipped in the summary. */
  protected readonly deleted_ = signal(0)
  protected readonly errorKey_ = signal<string | null>(null)
  protected readonly summary_ = signal<ImportSummary | null>(null)
  /** Plan 629: the recipes and dishes a save made dearer (null = no price went up, no panel). Cleared with summary_. */
  protected readonly impact_ = signal<PriceImpactRow[] | null>(null)
  protected readonly changeText = changeText
  protected readonly invoice_ = signal<InvoiceState | null>(null)
  protected readonly invoiceDate_ = signal('')
  protected readonly invoiceNumber_ = signal('')
  private nextRowId_ = 1

  constructor() {
    warnBeforeUnload(() => this.hasRealChanges())
    effect(() => {
      const file = this.file()
      untracked(() => {
        if (file === this.lastFile_) return
        this.lastFile_ = file
        if (file) void this.readFile_(file)
        else this.resetPreview_()
      })
    })
  }

  // 5. COMPUTED
  protected readonly allowed_ = computed(() => this.permission_.can('editMoney', { type: 'products' }))

  protected readonly supplierOptions_ = computed(() => [
    { value: '', label: 'import_no_supplier' },
    ...this.kitchenState_.suppliers_().map((s) => ({ value: s._id, label: s.nameHebrew }))
  ])

  protected readonly unitOptions_ = BASE_UNITS.map((unit) => ({ value: unit, label: unit }))

  protected readonly categoryOptions_ = computed(() => [
    { value: '', label: 'general_group' },
    ...this.metadataRegistry_.allCategories_().map((key) => ({ value: key, label: key }))
  ])

  /** Pack words the server can store: a base unit or a unit in the registry. */
  private readonly knownPurchaseUnits_ = computed(
    () => new Set<string>([...BASE_UNITS, ...this.unitRegistry_.allUnitKeys_()])
  )

  /** The preview rows with what the save would do to each: create, update the price, or nothing. */
  protected readonly view_ = computed(() => {
    const supplierKey = this.supplierId_()
    const products = this.kitchenState_.products_()
    const knownUnits = this.knownPurchaseUnits_()
    const pendingIds = this.pendingIds_()
    const suppliers = new Map(this.kitchenState_.suppliers_().map((s) => [s._id, s]))
    const sameName = (a: string | null | undefined, b: string | null | undefined) =>
      !!a?.trim() && !!b?.trim() && a.trim().toLowerCase() === b.trim().toLowerCase()
    const threshold =
      this.business_.business_()?.settings?.priceRiseAlertPct ?? BUSINESS_SETTINGS_DEFAULTS.priceRiseAlertPct
    return this.rows_().map((row) => {
      const match = this.matchOf_(row, products)
      let status: ImportRowStatus = !match && pendingIds.has(row.id) ? 'matching' : 'new'
      let oldPrice: number | null = null
      let otherSupplierName: string | null = null
      let targetSupplierId: string | null = null
      let canChoose = false
      let choice: 'update' | 'add' | null = null
      if (match) {
        const previous = previousPriceOf(match, supplierKey)
        oldPrice = previous?.price ?? null
        if (previous && !previous.isOwnSupplier) {
          // Plan 641: the price comes from another supplier; an equal price is still a change of supplier.
          status = row.price === null ? 'same' : 'update'
          otherSupplierName = suppliers.get(previous.supplierId)?.nameHebrew ?? ''
          if (supplierKey !== '') {
            canChoose = true
            choice =
              row.supplierChoice ??
              (sameName(otherSupplierName, suppliers.get(supplierKey)?.nameHebrew) ? 'update' : 'add')
            if (choice === 'update') targetSupplierId = previous.supplierId
          }
        } else {
          status = row.price === null || oldPrice === row.price ? 'same' : 'update'
        }
      }
      const unitText = row.purchaseUnit.trim()
      const hasUnknownPurchaseUnit = !match && status !== 'matching' && unitText !== '' && !knownUnits.has(unitText)
      const changePct = status === 'update' ? priceChangePct(oldPrice, row.price) : null
      const isRiseAlert = isPriceRiseAlert(changePct, threshold)
      return {
        row,
        status,
        match,
        oldPrice,
        changePct,
        isRiseAlert,
        hasUnknownPurchaseUnit,
        otherSupplierName,
        targetSupplierId,
        canChoose,
        choice,
        invoiceSupplierName: suppliers.get(supplierKey)?.nameHebrew ?? ''
      }
    })
  })

  /** The strip shows while the preview came from a file and has rows. */
  protected readonly showStrip_ = computed(() => this.invoice_() !== null && this.rows_().length > 0)

  /** The name saved on the invoice: the chosen supplier's own name, else the printed one. */
  private readonly invoiceSupplierName_ = computed(() => {
    const chosen = this.kitchenState_.suppliers_().find((s) => s._id === this.supplierId_())
    return chosen?.nameHebrew ?? this.invoice_()?.header.supplierName?.trim() ?? ''
  })

  protected readonly isSupplierMissing_ = computed(() => this.showStrip_() && this.invoiceSupplierName_() === '')

  protected readonly canSave_ = computed(
    () =>
      this.rows_().length > 0 &&
      !this.isSaving_() &&
      !this.isParsing_() &&
      !this.isMatching_() &&
      !this.isSupplierMissing_()
  )

  // 6. METHODS
  /** True when there is text in the box or a preview that a save has not cleared (plan 464, leave guard). */
  hasRealChanges(): boolean {
    return this.text_().trim() !== '' || this.rows_().length > 0
  }

  /** Reads the pasted list with one AI call; the text stays in the box whatever happens. */
  protected async parse(): Promise<void> {
    const text = this.text_().trim()
    if (!text || this.isParsing_()) return
    await this.readAndFill_(
      () => firstValueFrom(this.gemini_.parsePriceList(text, this.metadataRegistry_.allCategories_())),
      null
    )
  }

  /** Plan 628: reads a photo or a PDF of an invoice (camera or file) with one AI call; the text box is left untouched. */
  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    input.value = '' // the same file can be chosen again
    if (!file || this.isParsing_() || this.isSaving_()) return
    await this.readFile_(file)
  }

  private async readFile_(file: File): Promise<void> {
    await this.readAndFill_(() => this.gemini_.readInvoice(file, this.metadataRegistry_.allCategories_()), file)
  }

  /** The preview of a file that was skipped is dropped. */
  private resetPreview_(): void {
    this.rows_.set([])
    this.isParsed_.set(false)
    this.isFromPhoto_.set(false)
    this.errorKey_.set(null)
    this.summary_.set(null)
    this.impact_.set(null)
    this.clearInvoice_()
  }

  /**
   * The one read-and-fill path for pasted text and for a file: runs the AI call, counts the usage, fills the
   * preview, asks memory (file only), matches against the inventory, and maps a failure to a message.
   * Existing rows are kept on failure.
   */
  private async readAndFill_(
    call: () => Promise<{ rows: ImportRow[]; truncated: boolean }>,
    file: File | null
  ): Promise<void> {
    this.isParsing_.set(true)
    this.errorKey_.set(null)
    this.summary_.set(null)
    this.impact_.set(null)
    this.hasMatchFailed_.set(false)
    try {
      const result = await call()
      incrementGeminiUsage()
      this.rows_.set(result.rows.map((row) => this.toPreviewRow_(row)))
      this.isTruncated_.set(result.truncated)
      this.isFromPhoto_.set(file !== null)
      this.deleted_.set(0)
      this.isParsed_.set(true)
      if (file) this.setInvoiceFrom_(result as InvoiceReadResult, file)
      else this.clearInvoice_()
      if (result.rows.length === 0) this.errorKey_.set('import_nothing_found')
      else {
        if (file) await this.resolveFromMemory_()
        await this.matchWithAi_()
      }
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0
      const code = err instanceof HttpErrorResponse ? String(err.error?.error ?? '') : ''
      const reason = err instanceof Error ? err.message : ''
      this.errorKey_.set(importErrorKey(file !== null, status, code, reason))
      this.logging_.error({
        event: file ? 'productImport.file_failed' : 'productImport.parse_failed',
        message: file ? 'Invoice file read failed' : 'Price list parse failed',
        context: { status }
      })
    } finally {
      this.isParsing_.set(false)
    }
  }

  private clearInvoice_(): void {
    this.invoice_.set(null)
    this.invoiceDate_.set('')
    this.invoiceNumber_.set('')
  }

  /** Keeps what the read said about the invoice and preselects the supplier it recognised. */
  private setInvoiceFrom_(read: InvoiceReadResult, file: File): void {
    const known = this.kitchenState_.suppliers_().some((s) => s._id === read.supplier.supplierId)
    const state = invoiceStateFrom(read, file, known)
    this.supplierId_.set(state.suggestedSupplierId)
    this.invoice_.set(state)
    this.invoiceDate_.set(isIsoDate(read.header?.invoiceDate) ? read.header.invoiceDate! : '')
    this.invoiceNumber_.set((read.header?.invoiceNumber ?? '').slice(0, 40))
  }

  /** Plan 627: rows the business already linked arrive linked, so the model is asked only about the rest. */
  private async resolveFromMemory_(): Promise<void> {
    const invoice = this.invoice_()
    if (!invoice) return
    try {
      const names = this.rows_()
        .slice(0, 200)
        .map((row) => row.name)
      const matches = await this.importService_.resolve(invoice.supplierKey, names)
      const ids = new Set(this.kitchenState_.products_().map((p) => p._id))
      const linked = new Map(matches.filter((m) => ids.has(m.productId)).map((m) => [m.i, m.productId]))
      this.rows_.update((rows) => rows.map((row, i) => (linked.has(i) ? { ...row, matchedId: linked.get(i)! } : row)))
    } catch (err) {
      this.logging_.error({
        event: 'productImport.resolve_failed',
        message: 'Memory match failed',
        context: { status: err instanceof HttpErrorResponse ? err.status : 0 }
      })
    }
  }

  /** Saves every kept row in one request. */
  protected async saveAll(): Promise<void> {
    if (!this.canSave_()) return
    this.isSaving_.set(true)
    try {
      const categoryKeys = await this.resolveCategories_()
      const rows: ApplyRow[] = this.view_().map(({ row, status, match, targetSupplierId }) => ({
        name: match ? match.nameHebrew : row.name.trim(),
        baseUnit: row.baseUnit,
        price: row.price,
        category: status === 'new' ? (categoryKeys.get(row.category) ?? null) : null,
        purchaseUnit: status === 'new' && row.purchaseUnit.trim() ? row.purchaseUnit.trim() : null,
        purchaseQty: status === 'new' ? row.purchaseQty : null,
        ...(targetSupplierId ? { targetSupplierId } : {})
      }))
      const supplierId = this.supplierId_() || null
      const state = this.invoice_()
      const invoice = state
        ? buildApplyInvoice(
            state,
            this.invoiceSupplierName_(),
            this.invoiceNumber_(),
            this.invoiceDate_(),
            this.view_().map(({ row }) => row)
          )
        : undefined
      // Plan 629: the cost of every affected recipe at the OLD prices (apply reloads the products).
      const risen = new Set<string>()
      for (const { status, match, changePct } of this.view_()) {
        if (status === 'update' && match && changePct !== null && changePct > 0) risen.add(match._id)
      }
      const affected = risen.size ? recipesUsingProducts(this.kitchenState_.recipes_(), risen) : []
      const before = new Map(affected.map((recipe) => [recipe._id, this.recipeCost_.computeRecipeCost(recipe)]))
      const result = await this.importService_.apply(supplierId, rows, invoice)
      if (risen.size) this.impact_.set(this.impactRows_(affected, before))
      const summary = {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped + this.deleted_()
      }
      this.summary_.set(summary)
      this.userMsg_.onSetSuccessMsg(this.summaryText_(summary))
      this.rows_.set([])
      this.isParsed_.set(false)
      this.isFromPhoto_.set(false)
      this.text_.set('')
      this.clearInvoice_()
      if (invoice && result.invoiceId === null) {
        this.userMsg_.onSetErrorMsg(this.translation_.translate('invoice_trail_failed'))
      }
      this.applied.emit({ invoiceId: invoice ? (result.invoiceId ?? null) : null })
    } catch (err) {
      this.logging_.error({
        event: 'productImport.apply_failed',
        message: 'Price list apply failed',
        context: { status: err instanceof HttpErrorResponse ? err.status : 0 }
      })
      this.userMsg_.onSetErrorMsg(this.translation_.translate('save_failed'))
    } finally {
      this.isSaving_.set(false)
    }
  }

  /** The recipes whose cost changed once the new prices are loaded, biggest rise first. */
  private impactRows_(
    affected: ReturnType<typeof recipesUsingProducts>,
    before: Map<string, number>
  ): PriceImpactRow[] {
    const rows: PriceImpactRow[] = []
    for (const recipe of affected) {
      const was = before.get(recipe._id) ?? 0
      const now = this.recipeCost_.computeRecipeCost(recipe)
      if (roundMoney(now) === roundMoney(was)) continue
      rows.push({
        id: recipe._id,
        name: recipe.nameHebrew,
        isDish: recipe.recipeType === 'dish',
        before: was,
        after: now,
        changePct: priceChangePct(was, now)
      })
    }
    return rows.sort((a, b) => b.after - b.before - (a.after - a.before))
  }

  protected removeRow(id: number): void {
    if (this.isSaving_()) return
    const index = this.rows_().findIndex((row) => row.id === id)
    const removed = this.rows_()[index]
    if (!removed) return
    this.rows_.update((rows) => rows.filter((row) => row.id !== id))
    this.deleted_.update((count) => count + 1)
    this.userMsg_.onLineRemoved(
      this.translation_.translate('line_removed'),
      () => {
        if (this.isSaving_()) return
        this.rows_.update((rows) => {
          const next = [...rows]
          next.splice(Math.min(index, next.length), 0, removed)
          return next
        })
        this.deleted_.update((count) => Math.max(0, count - 1))
      },
      this.destroyRef_
    )
  }

  protected updateRow(id: number, patch: Partial<PreviewRow>): void {
    if (this.isSaving_()) return
    // A new name is matched by name only; the AI link belonged to the old text.
    const next = 'name' in patch ? { ...patch, matchedId: null } : patch
    this.rows_.update((rows) => rows.map((row) => (row.id === id ? { ...row, ...next } : row)))
    // The AI answer for the old text is ignored, so the row stops waiting for it.
    if ('name' in patch && this.pendingIds_().has(id)) {
      this.pendingIds_.update((ids) => new Set([...ids].filter((pendingId) => pendingId !== id)))
    }
  }

  /** «היה {price} אצל {name}» for a row compared with another supplier's price. */
  protected wasAtText(price: number, name: string): string {
    return this.translation_
      .translate('import_price_was_at')
      .replace('{price}', formatMoney(price))
      .replace('{name}', name)
  }

  protected choiceText(key: 'import_update_supplier_price' | 'import_add_as_new_supplier', name: string): string {
    return this.translation_.translate(key).replace('{name}', name)
  }

  protected setChoice(id: number, choice: 'update' | 'add'): void {
    this.updateRow(id, { supplierChoice: choice })
  }

  protected setPrice(id: number, value: string | number | null): void {
    this.updateRow(id, { price: positiveNumber(value) })
  }

  protected setPurchaseQty(id: number, value: string | number | null): void {
    this.updateRow(id, { purchaseQty: positiveNumber(value) })
  }

  protected summaryText_(summary: ImportSummary): string {
    const t = (key: string) => this.translation_.translate(key)
    return `${summary.created} ${t('import_created')}, ${summary.updated} ${t('import_updated')}, ${summary.skipped} ${t('import_skipped')}`
  }

  protected statusKey(status: ImportRowStatus): string {
    return {
      new: 'import_status_new',
      update: 'import_status_update',
      same: 'import_status_same',
      matching: 'import_status_matching'
    }[status]
  }

  private toPreviewRow_(row: ImportRow): PreviewRow {
    return {
      id: this.nextRowId_++,
      name: row.name,
      printedName: row.name,
      baseUnit: row.baseUnit,
      price: row.price,
      purchaseUnit: row.purchaseUnit ?? '',
      purchaseQty: row.purchaseQty,
      category: row.category ?? '',
      needsReview: row.needsReview,
      duplicate: row.duplicate,
      matchedId: null,
      supplierChoice: null
    }
  }

  /** The existing product a row stands for: its AI link, else an exact or variant name match (ambiguous counts as none). */
  private matchOf_(row: PreviewRow, products: readonly Product[]): Product | null {
    if (row.matchedId) {
      const linked = products.find((product) => product._id === row.matchedId)
      if (linked) return linked
    }
    const hit = this.matcher_.matchExact(row.name)
    return hit && hit.kind !== 'ambiguous' ? hit.product : null
  }

  /** One AI call for the names that exact and variant matching could not settle; failure leaves them as new. */
  private async matchWithAi_(): Promise<void> {
    const products = this.kitchenState_.products_()
    const pending = this.rows_().filter((row) => !this.matchOf_(row, products))
    if (pending.length === 0) return
    this.pendingIds_.set(new Set(pending.map((row) => row.id)))
    this.isMatching_.set(true)
    try {
      const found = await this.matcher_.matchNames(
        pending.map((row) => ({ key: String(row.id), name: row.name, unit: row.baseUnit })),
        { onAiFailure: () => this.hasMatchFailed_.set(true) }
      )
      this.rows_.update((rows) =>
        rows.map((row) => {
          const hit = found.get(String(row.id))
          const unchanged = pending.some((p) => p.id === row.id && p.name === row.name)
          return hit && unchanged ? { ...row, matchedId: hit.product._id } : row
        })
      )
    } finally {
      this.pendingIds_.set(new Set())
      this.isMatching_.set(false)
    }
  }

  /**
   * Category texts of the rows about to be created that are not known keys yet go through the canonical
   * flow once each (the translation-key modal for an unknown Hebrew value), then are registered before the save.
   * Returns text -> canonical key; a cancelled text is missing (the product is created without it).
   */
  private async resolveCategories_(): Promise<Map<string, string>> {
    const known = new Set(this.metadataRegistry_.allCategories_())
    const resolved = new Map<string, string>()
    const unknown = new Set<string>()
    for (const { row, status } of this.view_()) {
      if (status !== 'new' || !row.category) continue
      if (known.has(row.category)) resolved.set(row.category, row.category)
      else unknown.add(row.category)
    }
    const keys: string[] = []
    for (const text of unknown) {
      const [key] = (await resolveDraftMetadata({ categories: [text] }, this.metadataRegistry_)).categories
      if (key) {
        resolved.set(text, key)
        keys.push(key)
      }
    }
    await registerDraftMetadata({ categories: keys, allergens: [] }, this.metadataRegistry_)
    return resolved
  }
}
