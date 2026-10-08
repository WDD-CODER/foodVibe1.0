import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  viewChild,
  effect,
  ElementRef
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import { ProductDataService } from '@services/product-data.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { UserMsgService } from '@services/user-msg.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { Product } from '@models/product.model'
import { take } from 'rxjs/operators'
import { CustomSelectComponent } from '../custom-select/custom-select.component'
import { LoaderComponent } from '../loader/loader.component'
import { GeminiService } from '@services/gemini.service'

@Component({
  selector: 'app-quick-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent, LoaderComponent],
  templateUrl: './quick-add-product-modal.component.html',
  styleUrl: './quick-add-product-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickAddProductModalComponent {
  private readonly modalService = inject(QuickAddProductModalService)
  private readonly productData = inject(ProductDataService)
  private readonly unitRegistry = inject(UnitRegistryService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly userMsg = inject(UserMsgService)
  private readonly addItemModal = inject(AddItemModalService)
  private readonly gemini_ = inject(GeminiService)

  protected isOpen_ = this.modalService.isOpen_
  protected config = this.modalService.config

  protected name = signal('')
  protected baseUnit_ = signal('gram')
  protected expanded_ = signal(false)
  protected buyPrice_ = signal(0)
  protected category = signal('')
  protected yieldFactor_ = signal(1)
  protected selectedAllergens_ = signal<Set<string>>(new Set())
  protected minStock_ = signal(0)
  protected expiryDays_ = signal(0)
  protected isSubmitting_ = signal(false)
  protected nameError_ = signal('')
  protected unitError_ = signal('')
  protected aiLoading_ = signal(false)
  protected aiError_ = signal(false)

  protected nameRef = viewChild<ElementRef<HTMLInputElement>>('nameEl')
  protected baseUnitRef = viewChild<ElementRef<HTMLElement>>('baseUnitSelect')
  protected buyPriceRef = viewChild<ElementRef<HTMLInputElement>>('buyPriceEl')
  protected categoryRef = viewChild<ElementRef<HTMLElement>>('categorySelect')
  protected yieldFactorRef = viewChild<ElementRef<HTMLInputElement>>('yieldFactorEl')
  protected saveBtnRef = viewChild<ElementRef<HTMLButtonElement>>('saveBtnEl')

  protected unitKeys_ = this.unitRegistry.allUnitKeys_
  protected categories = this.metadataRegistry.allCategories_
  protected allergens = this.metadataRegistry.allAllergens_

  protected baseUnitOptions_ = computed(() => {
    const keys = this.unitKeys_()
    return [...keys.map((k) => ({ value: k, label: k })), { value: '__add_unit__', label: 'add_new_unit' }]
  })

  protected categoryOptions_ = computed(() => {
    const cats = this.categories()
    return [...cats.map((c) => ({ value: c, label: c })), { value: '__add_category__', label: 'add_new_category' }]
  })

  constructor() {
    effect(() => {
      const cfg = this.modalService.config()
      if (cfg) {
        this.name.set(cfg.prefillName)
        this.baseUnit_.set('gram')
        this.expanded_.set(false)
        this.buyPrice_.set(0)
        this.category.set('')
        this.yieldFactor_.set(1)
        this.selectedAllergens_.set(new Set())
        this.minStock_.set(0)
        this.expiryDays_.set(0)
        this.isSubmitting_.set(false)
        this.nameError_.set('')
        this.unitError_.set('')
      }
    })

    effect(() => {
      if (this.modalService.isOpen_() && this.modalService.config()) {
        setTimeout(() => this.nameRef()?.nativeElement?.focus(), 0)
      }
    })

    effect(() => {
      if (this.modalService.isOpen_()) this.unitRegistry.refreshFromStorage()
    })
  }

  /** Accepts either an ElementRef or a native HTMLElement (template ref). */
  protected advanceFocus(ref: ElementRef<HTMLElement> | HTMLElement | null | undefined): void {
    const el = ref && 'nativeElement' in ref ? ref.nativeElement : ref
    el?.focus()
  }

  /** After select change: advance focus to next field. */
  protected onSelectChange(nextTarget: HTMLElement | null): void {
    this.advanceFocus(nextTarget)
  }

  protected async onCategoryChange(val: string): Promise<void> {
    if (val === '__add_category__') {
      const newCategory = await this.addItemModal.open({
        title: 'add_new_category',
        label: 'categoryName',
        placeholder: 'categoryName',
        saveLabel: 'save_category'
      })
      if (newCategory) {
        const key = await this.metadataRegistry.registerCategory(newCategory)
        if (key) {
          this.category.set(key)
          this.onSelectChange(this.getNextFocusAfterCategory())
        } else {
          this.category.set('')
        }
      } else {
        this.category.set('')
      }
    } else {
      this.category.set(val)
      this.onSelectChange(this.getNextFocusAfterCategory())
    }
  }

  protected onBaseUnitChange(val: string): void {
    if (val === '__add_unit__') {
      this.baseUnit_.set('')
      this.unitRegistry.openUnitCreator()
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
        this.baseUnit_.set(newUnit)
        this.onSelectChange(this.getNextFocusAfterBaseUnit())
      })
    } else {
      this.baseUnit_.set(val)
      this.onSelectChange(this.getNextFocusAfterBaseUnit())
    }
  }

  protected getNextFocusAfterBaseUnit(): HTMLElement | null {
    return this.buyPriceRef()?.nativeElement ?? null
  }

  protected getNextFocusAfterBuyPrice(): HTMLElement | null {
    return this.categoryRef()?.nativeElement ?? null
  }

  protected getNextFocusAfterCategory(): HTMLElement | null {
    if (this.expanded_()) return this.yieldFactorRef()?.nativeElement ?? null
    return this.saveBtnRef()?.nativeElement ?? null
  }

  protected getNextFocusAfterYield(): HTMLElement | null {
    return this.saveBtnRef()?.nativeElement ?? null
  }

  protected toggleAllergen(key: string): void {
    this.selectedAllergens_.update((set) => {
      const next = new Set(set)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  protected isAllergenSelected(key: string): boolean {
    return this.selectedAllergens_().has(key)
  }

  protected onSave(): void {
    if (this.isSubmitting_()) return

    this.nameError_.set('')
    this.unitError_.set('')

    const name = this.name().trim()
    const baseUnit = this.baseUnit_().trim()
    if (!name) {
      this.nameError_.set('field_name_required')
      return
    }
    if (!baseUnit) {
      this.unitError_.set('field_unit_required')
      this.baseUnitRef()?.nativeElement?.focus()
      return
    }

    this.isSubmitting_.set(true)

    const category = this.category().trim()
    const price = Math.max(0, Number(this.buyPrice_()) || 0)
    const product: Omit<Product, '_id'> = {
      nameHebrew: name,
      baseUnit: baseUnit,
      sources: price > 0 ? [{ supplierId: '', price, addedAt: Date.now() }] : [],
      purchaseOptions: [],
      categories: category ? [category] : [],
      yieldFactor: Number(this.yieldFactor_()) || 1,
      allergens: Array.from(this.selectedAllergens_()),
      minStockLevel: Number(this.minStock_()) || 0,
      expiryDaysDefault: Number(this.expiryDays_()) || 0
    }

    this.productData.addProduct(product).then(
      (saved) => {
        this.isSubmitting_.set(false)
        this.modalService.save(saved)
      },
      () => {
        this.isSubmitting_.set(false)
        this.userMsg.onSetErrorMsg('שגיאה בשמירת המוצר')
      }
    )
  }

  protected async onAiFill(): Promise<void> {
    const name = this.name().trim()
    if (!name || this.aiLoading_()) return
    this.aiLoading_.set(true)
    this.aiError_.set(false)
    try {
      const draft = await this.gemini_.generateProduct(name)
      if (draft.baseUnit) this.baseUnit_.set(draft.baseUnit)
      if (draft.categories?.length) this.category.set(draft.categories[0])
      if (draft.allergens?.length) this.selectedAllergens_.set(new Set(draft.allergens))
      if (draft.yieldFactor && draft.yieldFactor !== 1) this.yieldFactor_.set(draft.yieldFactor)
      this.expanded_.set(true)
    } catch {
      this.aiError_.set(true)
    } finally {
      this.aiLoading_.set(false)
    }
  }

  protected onCancel(): void {
    this.modalService.cancel()
  }

  protected toggleExpanded(): void {
    this.expanded_.update((v) => !v)
  }
}
