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
  viewChild,
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
import { Product, ProductSource } from '@models/product.model'
import { getEffectivePrice, getSupplierIds } from '@utils/product-source.util'

@Component({
  selector: 'app-quick-edit-product-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './quick-edit-product-panel.component.html',
  styleUrl: './quick-edit-product-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickEditProductPanelComponent {
  private readonly productData = inject(ProductDataService)
  private readonly unitRegistry = inject(UnitRegistryService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly userMsg = inject(UserMsgService)

  // INPUTS / OUTPUTS
  product = input.required<Product>()
  tier = input.required<'invalid' | 'incomplete'>()
  closing = input<boolean>(false)

  saved = output<void>()
  cancelled = output<void>()
  openFullEdit = output<void>()

  // FORM STATE
  protected name_ = signal('')
  protected baseUnit_ = signal('')
  protected category_ = signal('')
  protected price_ = signal(0)
  protected selectedSupplierIds_ = signal<string[]>([])
  protected error_ = signal<string | null>(null)
  protected isSubmitting_ = signal(false)
  protected showUnsavedConfirm_ = signal(false)
  protected nameError_ = signal('')
  protected unitError_ = signal('')

  protected isDirty_ = computed(() => {
    const p = this.product()
    const suppliersSorted = [...this.selectedSupplierIds_()].sort().join(',')
    const originalSuppliersSorted = [...getSupplierIds(p)].sort().join(',')
    return (
      this.name_() !== (p.name_hebrew ?? '') ||
      this.baseUnit_() !== (p.base_unit_ ?? '') ||
      this.category_() !== (p.categories_?.[0] ?? '') ||
      this.price_() !== getEffectivePrice(p) ||
      suppliersSorted !== originalSuppliersSorted
    )
  })

  // VIEW REFS for focus management
  protected nameRef = viewChild<ElementRef<HTMLInputElement>>('nameInput')
  protected priceRef = viewChild<ElementRef<HTMLInputElement>>('priceInput')

  // OPTIONS
  protected unitKeys_ = this.unitRegistry.allUnitKeys_
  protected categories_ = this.metadataRegistry.allCategories_
  protected suppliers_ = this.kitchenState.suppliers_

  protected baseUnitOptions_ = computed(() =>
    this.unitKeys_().map(k => ({ value: k, label: k }))
  )

  protected categoryOptions_ = computed(() =>
    this.categories_().map(c => ({ value: c, label: c }))
  )

  protected supplierOptions_ = computed(() =>
    this.suppliers_().map(s => ({ value: s._id, label: s.name_hebrew }))
  )

  constructor() {
    // Pre-fill fields whenever the product input changes
    effect(() => {
      const p = this.product()
      this.name_.set(p.name_hebrew ?? '')
      this.baseUnit_.set(p.base_unit_ ?? '')
      this.category_.set(p.categories_?.[0] ?? '')
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
      this.selectedSupplierIds_.set(current.filter(id => id !== val))
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

    const name = this.name_().trim()
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

    const category = this.category_().trim()
    const price = Math.max(0, Number(this.price_()) || 0)
    const supplierIds = this.selectedSupplierIds_()
    const existingSources = this.product().sources_ ?? []
    let sources_: ProductSource[]
    if (supplierIds.length > 0) {
      sources_ = supplierIds.map(sid => {
        const existing = existingSources.find(s => s.supplierId === sid)
        return { supplierId: sid, price, addedBy: existing?.addedBy, addedAt: existing?.addedAt ?? Date.now() }
      })
    } else {
      sources_ = price > 0 ? [{ supplierId: '', price, addedAt: Date.now() }] : []
    }

    const updated: Product = {
      ...this.product(),
      name_hebrew: name,
      base_unit_: baseUnit,
      categories_: category ? [category] : [],
      sources_,
    }

    try {
      await this.productData.updateProduct(updated)
      this.userMsg.onSetSuccessMsg('המוצר נשמר')
      this.isSubmitting_.set(false)
      this.saved.emit()
    } catch {
      this.isSubmitting_.set(false)
      this.error_.set('שגיאה בשמירת המוצר')
    }
  }

  protected onCancel(): void {
    if (this.isDirty_()) {
      this.showUnsavedConfirm_.set(true)
    } else {
      this.cancelled.emit()
    }
  }

  protected onDiscardAndClose(): void {
    this.showUnsavedConfirm_.set(false)
    this.cancelled.emit()
  }

  /** Called by the parent before closing (e.g. clickOutside on the accordion). */
  requestClose(): void {
    if (this.showUnsavedConfirm_()) return
    if (this.isDirty_()) {
      this.showUnsavedConfirm_.set(true)
    } else {
      this.cancelled.emit()
    }
  }

  protected onOpenFullEdit(): void {
    this.openFullEdit.emit()
  }
}
