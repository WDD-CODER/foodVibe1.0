import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { ProductDataService } from '@services/product-data.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { LoggingService } from '@services/logging.service'
import { Product, ProductSource } from '@models/product.model'
import { getEffectivePrice, getSupplierIds } from '@utils/product-source.util'
import { isProductNameTaken } from 'src/app/core/utils/product-name-error.util'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-quick-edit-product-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    CustomSelectComponent,
    SelectOnFocusDirective
  ],
  templateUrl: './quick-edit-product-panel.component.html',
  styleUrl: './quick-edit-product-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'onEscape($event)' }
})
export class QuickEditProductPanelComponent {
  /** Set when the panel sits inside a popup: the popup shell owns Escape there. */
  private readonly insideShell_ = inject(ModalShellComponent, { optional: true }) !== null
  private readonly productData = inject(ProductDataService)
  private readonly unitRegistry = inject(UnitRegistryService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // INPUTS / OUTPUTS
  product = input.required<Product>()
  tier = input.required<'invalid' | 'incomplete'>()
  closing = input<boolean>(false)

  saved = output<void>()
  cancelled = output<void>()
  openFullEdit = output<void>()

  // FORM STATE
  protected name = signal('')
  protected baseUnit_ = signal('')
  protected category = signal('')
  protected price_ = signal(0)
  protected selectedSupplierIds_ = signal<string[]>([])
  protected error_ = signal<string | null>(null)
  protected isSubmitting_ = signal(false)
  protected shouldShowUnsavedConfirm_ = signal(false)
  protected nameError_ = signal('')
  protected unitError_ = signal('')

  protected isDirty_ = computed(() => {
    const p = this.product()
    const suppliersSorted = [...this.selectedSupplierIds_()].sort().join(',')
    const originalSuppliersSorted = [...getSupplierIds(p)].sort().join(',')
    return (
      this.name() !== (p.nameHebrew ?? '') ||
      this.baseUnit_() !== (p.baseUnit ?? '') ||
      this.category() !== (p.categories?.[0] ?? '') ||
      this.price_() !== getEffectivePrice(p) ||
      suppliersSorted !== originalSuppliersSorted
    )
  })

  // VIEW REFS for focus management
  protected nameRef = viewChild<ElementRef<HTMLInputElement>>('nameInput')
  protected priceRef = viewChild<ElementRef<HTMLInputElement>>('priceInput')

  // OPTIONS
  protected unitKeys_ = this.unitRegistry.allUnitKeys_
  protected categories = this.metadataRegistry.allCategories_
  protected suppliers_ = this.kitchenState.suppliers_

  protected baseUnitOptions_ = computed(() => this.unitKeys_().map((k) => ({ value: k, label: k })))

  protected categoryOptions_ = computed(() => this.categories().map((c) => ({ value: c, label: c })))

  protected supplierOptions_ = computed(() => this.suppliers_().map((s) => ({ value: s._id, label: s.nameHebrew })))

  constructor() {
    // Pre-fill fields whenever the product input changes
    effect(() => {
      const p = this.product()
      this.name.set(p.nameHebrew ?? '')
      this.baseUnit_.set(p.baseUnit ?? '')
      this.category.set(p.categories?.[0] ?? '')
      this.price_.set(getEffectivePrice(p))
      this.selectedSupplierIds_.set([...getSupplierIds(p)])
      this.error_.set(null)
      this.isSubmitting_.set(false)
      this.nameError_.set('')
      this.unitError_.set('')
    })

    // Auto-focus the relevant field based on tier
    effect(() => {
      const t = this.tier()
      // Use setTimeout to allow the view to render before focusing
      setTimeout(() => {
        if (t === 'invalid') {
          this.nameRef()?.nativeElement?.focus()
        } else {
          this.priceRef()?.nativeElement?.focus()
        }
      }, 50)
    })
  }

  protected onSupplierChange(val: string): void {
    const current = this.selectedSupplierIds_()
    if (current.includes(val)) {
      this.selectedSupplierIds_.set(current.filter((id) => id !== val))
    } else {
      this.selectedSupplierIds_.set([...current, val])
    }
  }

  protected isSupplierSelected(id: string): boolean {
    return this.selectedSupplierIds_().includes(id)
  }

  protected async onSave(): Promise<void> {
    if (this.isSubmitting_()) return

    this.nameError_.set('')
    this.unitError_.set('')

    const name = this.name().trim()
    const baseUnit = this.baseUnit_().trim()

    if (!name) {
      this.nameError_.set('field_name_required')
      this.nameRef()?.nativeElement?.focus()
      return
    }
    if (!baseUnit) {
      this.unitError_.set('field_unit_required')
      return
    }

    this.isSubmitting_.set(true)
    this.error_.set(null)

    const category = this.category().trim()
    const price = Math.max(0, Number(this.price_()) || 0)
    const supplierIds = this.selectedSupplierIds_()
    const existingSources = this.product().sources ?? []
    let sources: ProductSource[]
    if (supplierIds.length > 0) {
      sources = supplierIds.map((sid) => {
        const existing = existingSources.find((s) => s.supplierId === sid)
        return { supplierId: sid, price, addedBy: existing?.addedBy, addedAt: existing?.addedAt ?? Date.now() }
      })
    } else {
      sources = price > 0 ? [{ supplierId: '', price, addedAt: Date.now() }] : []
    }

    const updated: Product = {
      ...this.product(),
      nameHebrew: name,
      baseUnit: baseUnit,
      categories: category ? [category] : [],
      sources
    }

    try {
      await this.productData.updateProduct(updated)
      this.userMsg.onSetSuccessMsg(this.translation.translate('product_saved'))
      this.isSubmitting_.set(false)
      this.saved.emit()
    } catch (err) {
      this.logging.error({
        event: 'crud.products.quick_edit_error',
        message: 'Quick edit save error',
        context: { err }
      })
      this.isSubmitting_.set(false)
      // Plan 485: a rename to a taken name is shown on the name box.
      if (isProductNameTaken(err)) {
        this.nameError_.set('duplicate_product_name_error')
        return
      }
      this.error_.set(this.translation.translate('product_save_error'))
    }
  }

  /** Explicit Cancel closes without asking (plan 498, D2); only an accidental close (Escape, click outside) asks. */
  protected onCancel(): void {
    this.cancelled.emit()
  }

  /** Save from outside (the popup's discard question): true when the product was saved and the panel closed. */
  async saveAndClose(): Promise<boolean> {
    let saved = false
    const sub = this.saved.subscribe(() => (saved = true))
    await this.onSave()
    sub.unsubscribe()
    return saved
  }

  /** True while a field differs from the product as loaded (the popup shell asks before an Escape discards it). */
  hasChanges(): boolean {
    return this.isDirty_()
  }

  protected onDiscardAndClose(): void {
    this.shouldShowUnsavedConfirm_.set(false)
    this.cancelled.emit()
  }

  /** Plan 498: Escape in the inline (recipe) accordion closes it, asking first when a field was changed. */
  protected onEscape(event: Event): void {
    if (this.insideShell_ || event.defaultPrevented) return
    event.preventDefault()
    this.requestClose()
  }

  /** Called by the parent before closing (e.g. clickOutside on the accordion). */
  requestClose(): void {
    if (this.shouldShowUnsavedConfirm_()) return
    if (this.isDirty_()) {
      this.shouldShowUnsavedConfirm_.set(true)
    } else {
      this.cancelled.emit()
    }
  }

  protected onOpenFullEdit(): void {
    this.openFullEdit.emit()
  }
}
