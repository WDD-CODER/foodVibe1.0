import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
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
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { PermissionService } from '@services/permission.service'
import { ApplyRow, ImportRow, ProductImportService } from '@services/product-import.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { normalizeProductName } from '@utils/product-name.util'
import { incrementGeminiUsage } from '@utils/gemini-usage.util'
import { registerDraftMetadata, resolveDraftMetadata } from '../../services/ai-draft-metadata.util'
import { TextareaAutoGrowDirective } from '@directives/textarea-auto-grow.directive'

/** The base units a product may have (same list as the server). */
const BASE_UNITS = ['gram', 'ml', 'kg', 'liter', 'unit']

export type ImportRowStatus = 'new' | 'update' | 'same'

/** One editable line of the preview. `id` keeps the row stable while its siblings are deleted. */
interface PreviewRow {
  id: number
  name: string
  baseUnit: string
  price: number | null
  purchaseUnit: string
  purchaseQty: number | null
  category: string
  needsReview: boolean
  duplicate: boolean
}

interface ImportSummary {
  created: number
  updated: number
  skipped: number
}

@Component({
  selector: 'app-product-import',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    CustomSelectComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    TextareaAutoGrowDirective
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
  private readonly logging_ = inject(LoggingService)

  // 4. SIGNALS & CONSTANTS
  protected readonly maxRows = 200
  protected readonly text_ = signal('')
  protected readonly supplierId_ = signal('')
  protected readonly rows_ = signal<PreviewRow[]>([])
  protected readonly isParsed_ = signal(false)
  protected readonly isTruncated_ = signal(false)
  protected readonly isParsing_ = signal(false)
  protected readonly isSaving_ = signal(false)
  /** Rows the user removed from the preview; they count as skipped in the summary. */
  protected readonly deleted_ = signal(0)
  protected readonly errorKey_ = signal<string | null>(null)
  protected readonly summary_ = signal<ImportSummary | null>(null)
  private nextRowId_ = 1

  // 5. COMPUTED
  protected readonly allowed_ = computed(() => this.permission_.can('editMoney', { type: 'products' }))

  protected readonly supplierOptions_ = computed(() => [
    { value: '', label: 'import_no_supplier' },
    ...this.kitchenState_.suppliers_().map((s) => ({ value: s._id, label: s.nameHebrew }))
  ])

  protected readonly unitOptions_ = BASE_UNITS.map((unit) => ({ value: unit, label: unit }))

  /** First live product per normalized name; the key the server matches by. */
  private readonly productsByName_ = computed(() => {
    const map = new Map<string, Product>()
    for (const product of this.kitchenState_.products_()) {
      const key = normalizeProductName(product.nameHebrew)
      if (!map.has(key)) map.set(key, product)
    }
    return map
  })

  protected readonly categoryOptions_ = computed(() => [
    { value: '', label: 'general_group' },
    ...this.metadataRegistry_.allCategories_().map((key) => ({ value: key, label: key }))
  ])

  /** The preview rows with what the save would do to each: create, update the price, or nothing. */
  protected readonly view_ = computed(() => {
    const supplierKey = this.supplierId_()
    return this.rows_().map((row) => {
      const match = this.productsByName_().get(normalizeProductName(row.name)) ?? null
      let status: ImportRowStatus = 'new'
      if (match) {
        const current = match.sources?.find((source) => source.supplierId === supplierKey)?.price ?? null
        status = row.price === null || current === row.price ? 'same' : 'update'
      }
      return { row, status, match }
    })
  })

  protected readonly canSave_ = computed(() => this.rows_().length > 0 && !this.isSaving_() && !this.isParsing_())

  // 6. METHODS
  /** Reads the pasted list with one AI call; the text stays in the box whatever happens. */
  protected async parse(): Promise<void> {
    const text = this.text_().trim()
    if (!text || this.isParsing_()) return
    this.isParsing_.set(true)
    this.errorKey_.set(null)
    this.summary_.set(null)
    try {
      const result = await firstValueFrom(this.gemini_.parsePriceList(text, this.metadataRegistry_.allCategories_()))
      incrementGeminiUsage()
      this.rows_.set(result.rows.map((row) => this.toPreviewRow_(row)))
      this.isTruncated_.set(result.truncated)
      this.deleted_.set(0)
      this.isParsed_.set(true)
      if (result.rows.length === 0) this.errorKey_.set('import_nothing_found')
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0
      const code = err instanceof HttpErrorResponse ? String(err.error?.error ?? '') : ''
      this.errorKey_.set(
        status === 429 || code.includes('daily_limit_reached') ? 'ai_daily_limit_reached_all' : 'import_ai_failed'
      )
      this.logging_.error({
        event: 'product_import.parse_failed',
        message: 'Price list parse failed',
        context: { status }
      })
    } finally {
      this.isParsing_.set(false)
    }
  }

  /** Saves every kept row in one request. */
  protected async saveAll(): Promise<void> {
    if (!this.canSave_()) return
    this.isSaving_.set(true)
    try {
      const categoryKeys = await this.resolveCategories_()
      const rows: ApplyRow[] = this.view_().map(({ row, status }) => ({
        name: row.name.trim(),
        baseUnit: row.baseUnit,
        price: row.price,
        category: status === 'new' ? (categoryKeys.get(row.category) ?? null) : null,
        purchaseUnit: status === 'new' && row.purchaseUnit.trim() ? row.purchaseUnit.trim() : null,
        purchaseQty: status === 'new' ? row.purchaseQty : null
      }))
      const supplierId = this.supplierId_() || null
      const result = await this.importService_.apply(supplierId, rows)
      const summary = {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped + this.deleted_()
      }
      this.summary_.set(summary)
      this.userMsg_.onSetSuccessMsg(this.summaryText_(summary))
      this.rows_.set([])
      this.isParsed_.set(false)
      this.text_.set('')
    } catch (err) {
      this.logging_.error({
        event: 'product_import.apply_failed',
        message: 'Price list apply failed',
        context: { status: err instanceof HttpErrorResponse ? err.status : 0 }
      })
      this.userMsg_.onSetErrorMsg(this.translation_.translate('save_failed'))
    } finally {
      this.isSaving_.set(false)
    }
  }

  protected removeRow(id: number): void {
    this.rows_.update((rows) => rows.filter((row) => row.id !== id))
    this.deleted_.update((count) => count + 1)
  }

  protected updateRow(id: number, patch: Partial<PreviewRow>): void {
    this.rows_.update((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  protected setPrice(id: number, value: string | number | null): void {
    const price =
      typeof value === 'number'
        ? value
        : Number(
            String(value ?? '')
              .trim()
              .replace(',', '.')
          )
    this.updateRow(id, { price: Number.isFinite(price) && price > 0 ? price : null })
  }

  protected setPurchaseQty(id: number, value: string | number | null): void {
    const qty =
      typeof value === 'number'
        ? value
        : Number(
            String(value ?? '')
              .trim()
              .replace(',', '.')
          )
    this.updateRow(id, { purchaseQty: Number.isFinite(qty) && qty > 0 ? qty : null })
  }

  protected summaryText_(summary: ImportSummary): string {
    const t = (key: string) => this.translation_.translate(key)
    return `${summary.created} ${t('import_created')}, ${summary.updated} ${t('import_updated')}, ${summary.skipped} ${t('import_skipped')}`
  }

  protected statusKey(status: ImportRowStatus): string {
    return { new: 'import_status_new', update: 'import_status_update', same: 'import_status_same' }[status]
  }

  private toPreviewRow_(row: ImportRow): PreviewRow {
    return {
      id: this.nextRowId_++,
      name: row.name,
      baseUnit: row.baseUnit,
      price: row.price,
      purchaseUnit: row.purchaseUnit ?? '',
      purchaseQty: row.purchaseQty,
      category: row.category ?? '',
      needsReview: row.needsReview,
      duplicate: row.duplicate
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
