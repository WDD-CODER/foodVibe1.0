import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
  input,
  Signal,
  runInInjectionContext,
  Injector,
  ElementRef,
  AfterViewInit,
  viewChild,
  DestroyRef
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  FormArray,
  AbstractControl
} from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { ActivatedRoute, Router } from '@angular/router'

import { ConversionService } from '@services/conversion.service'
import { UserMsgService } from '@services/user-msg.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { Product, PurchaseOption_, ProductSource } from '@models/product.model'
import { getEffectivePrice, getSupplierIds } from '@utils/product-source.util'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { UtilService } from '@services/util.service'
import { UnitRegistryService, UnitCreatorContext, ProductUnitAdded } from '@services/unit-registry.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { TranslationService } from '@services/translation.service'
import { notifyItemAdded } from 'src/app/core/utils/add-option.util'
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service'
import { AddSupplierFlowService } from '@services/add-supplier-flow.service'
import { LoggingService } from '@services/logging.service'
import { map } from 'rxjs'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { duplicateNameValidator } from 'src/app/core/validators/item.validators'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { ChipSearchDropdownComponent } from 'src/app/shared/chip-search-dropdown/chip-search-dropdown.component'
import { useSavingState } from 'src/app/core/utils/saving-state.util'
import { useUnsavedChanges } from 'src/app/core/utils/unsaved-changes'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { AiProductModalService } from 'src/app/shared/ai-product-modal/ai-product-modal.service'
import { ProductAiFlowService } from 'src/app/pages/inventory/services/product-ai-flow.service'
import type { AiProductDraft } from '@models/ai-product-draft.model'
import { UserService } from '@services/user.service'
import { MasterPushService } from '@services/master-push.service'
import { HeroFabService } from '@services/hero-fab.service'
import { registerDraftMetadata } from 'src/app/pages/inventory/services/ai-draft-metadata.util'
import { ProductPriceLockComponent } from '../product-price-lock/product-price-lock.component'

/**
 * Plan 423 — units whose size is a physical constant: choosing one in a purchase row fills the exact amount.
 * Any other unit (jar, box, ...) weighs something different for every product, so its amount is typed per product.
 */
const PREFILLED_UNITS: ReadonlySet<string> = new Set(['kg', 'gram', 'liter', 'ml', 'tablespoon', 'teaspoon', 'cup'])

interface PurchaseOptionState {
  overrideConfirmed: boolean
  /** Last real unit of the row (never 'NEW_UNIT'): what a cancelled "add new unit" restores. */
  previousUnit?: string
  previousUom?: string
}

interface ProductFormValue {
  buy_price_global_?: number
  yieldFactor?: number
  allergens?: string[]
  categories?: string[]
  supplierIds_?: string[]
  [key: string]: unknown
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    FormsModule,
    ClickOutSideDirective,
    SelectOnFocusDirective,
    TranslatePipe,
    LoaderComponent,
    CustomSelectComponent,
    ChipSearchDropdownComponent,
    ProductPriceLockComponent,
    FormFieldComponent
  ],
  providers: [ProductAiFlowService],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnInit, AfterViewInit {
  initialProduct_ = input<Product | null>(null)

  private readonly productNameInputRef = viewChild<ElementRef<HTMLInputElement>>('productNameInput')

  private readonly fb_ = inject(FormBuilder)
  private readonly conversionService = inject(ConversionService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly kitchenStateService = inject(KitchenStateService)
  private readonly utilService = inject(UtilService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly translationService = inject(TranslationService)
  private readonly translationKeyModal = inject(TranslationKeyModalService)
  private readonly addSupplierFlowService = inject(AddSupplierFlowService)
  private readonly userMsgService = inject(UserMsgService)
  private readonly injector = inject(Injector)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly logging = inject(LoggingService)
  private readonly aiProductModal_ = inject(AiProductModalService)
  private readonly productAiFlow_ = inject(ProductAiFlowService)
  private readonly userService_ = inject(UserService)
  private readonly masterPush_ = inject(MasterPushService)
  private readonly heroFab_ = inject(HeroFabService)

  unitRegistry = inject(UnitRegistryService)
  private readonly isAdmin_ = this.userService_.isAdmin_

  protected readonly categoryOptions_ = computed(() => this.metadataRegistry.allCategories_())
  protected readonly suppliers_ = computed(() => this.kitchenStateService.suppliers_())
  protected availableUnits_ = computed(() => this.unitRegistry.allUnitKeys_())
  protected baseUnitOptions_ = computed(() => [
    ...this.unitRegistry.allUnitKeys_().map((k) => ({ value: k, label: k })),
    { value: 'NEW_UNIT', label: 'add_new_unit' }
  ])
  protected unitSymbolOptions_ = computed(() => [
    { value: '', label: 'choose_unit' },
    ...this.availableUnits_().map((u) => ({ value: u, label: u })),
    { value: 'NEW_UNIT', label: 'add_new_unit' }
  ])
  protected uomOptions_ = computed(() => [
    ...this.availableUnits_().map((u) => ({ value: u, label: u })),
    { value: 'NEW_UNIT', label: 'add_new_unit' }
  ])
  protected allergenOptions_ = computed(() => this.metadataRegistry.allAllergens_())
  protected isEditMode_ = signal<boolean>(false)
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  protected curProduct_ = signal<Product | null>(null)
  /** Typed name from a unit dropdown's add row, read once by the value-change handler (rule W). */
  protected readonly pendingAddName_ = signal('')
  protected validationErrors_ = signal<Record<string, string>>({})

  //SIMPLE VALUES
  private formValue_!: Signal<ProductFormValue>
  protected productForm_!: FormGroup
  private readonly unsaved_ = useUnsavedChanges({
    form: () => this.productForm_,
    snapshot: () => this.getFormSnapshotForComparison()
  })
  isSubmitted = false

  // Tracks per-row state for purchase options (e.g., whether a manual override was confirmed)
  private readonly purchaseOptionState_ = new WeakMap<FormGroup, PurchaseOptionState>()

  //COMPUTED
  protected netUnitCost_ = computed(() => {
    if (!this.formValue_) return 0
    const currentForm = this.formValue_()
    const price = currentForm?.buy_price_global_ || 0
    const yieldFactor = currentForm?.yieldFactor || 1
    return yieldFactor > 0 ? price / yieldFactor : 0
  })

  protected selectedAllergensSignal_ = computed(() => {
    return this.formValue_()?.allergens || []
  })

  protected filteredAllergenOptions_ = computed(() => {
    const all = this.metadataRegistry.allAllergens_()
    const selected = this.selectedAllergensSignal_() || []
    return all.filter((allergen) => !selected.includes(allergen))
  })

  protected filteredCategoryOptions_ = computed(() => {
    const all = this.metadataRegistry.allCategories_()
    const selected = (this.formValue_?.()?.categories ?? []) as string[]
    return all.filter((c: string) => !selected.includes(c))
  })

  protected filteredSupplierOptions_ = computed(() => {
    const all = this.kitchenStateService.suppliers_()
    const selectedIds = (this.formValue_?.()?.supplierIds_ ?? []) as string[]
    return all.filter((s: { _id: string }) => !selectedIds.includes(s._id))
  })

  protected filteredSupplierIds_ = computed(() => this.filteredSupplierOptions_().map((s) => s._id))

  protected readonly translateFn = (key: string) => this.translationService.translate(key)
  protected readonly supplierDisplayFn = (id: string) => this.getSupplierName(id)

  protected expandedMinStock_ = signal(false)
  protected expandedExpiryDays_ = signal(false)
  protected expandedWasteYield_ = signal(false)
  protected expandedAllergens_ = signal(false)
  protected expandedSupplier_ = signal(false)

  protected toggleMinStock(): void {
    this.expandedMinStock_.update((v) => !v)
  }
  protected toggleExpiryDays(): void {
    this.expandedExpiryDays_.update((v) => !v)
  }
  protected toggleWasteYield(): void {
    this.expandedWasteYield_.update((v) => !v)
  }
  protected toggleAllergens(): void {
    this.expandedAllergens_.update((v) => !v)
  }
  protected toggleSupplier(): void {
    this.expandedSupplier_.update((v) => !v)
  }

  protected onSupplierBlur(clickTarget?: HTMLElement): void {
    if (!this.productForm_) return
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return
    if (this.selectedSupplierIds_().length === 0) {
      this.expandedSupplier_.set(false)
    }
  }

  protected onMinStockBlur(clickTarget?: HTMLElement): void {
    if (!this.productForm_) return
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return
    const val = this.productForm_.get('minStockLevel')?.value
    if (val == null || val === 0 || val === '') {
      this.expandedMinStock_.set(false)
    }
  }

  protected onExpiryDaysBlur(clickTarget?: HTMLElement): void {
    if (!this.productForm_) return
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return
    const val = this.productForm_.get('expiryDaysDefault')?.value
    if (val == null || val === 0 || val === '') {
      this.expandedExpiryDays_.set(false)
    }
  }

  protected onAllergensBlur(clickTarget?: HTMLElement): void {
    if (!this.productForm_) return
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return
    const allergens = (this.productForm_.get('allergens')?.value || []) as string[]
    if (allergens.length === 0) {
      this.expandedAllergens_.set(false)
    }
  }

  protected onWasteYieldBlur(clickTarget?: HTMLElement): void {
    if (!this.productForm_) return
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return
    const waste = this.productForm_.get('waste_percent_')?.value
    const yieldVal = this.productForm_.get('yieldFactor')?.value
    const isDefault = (waste == null || waste === 0) && (yieldVal == null || yieldVal === 1)
    if (isDefault) {
      this.expandedWasteYield_.set(false)
    }
  }

  protected openAiProductModal(): void {
    const snapshot: AiProductDraft = {
      nameHebrew: this.productForm_.get('productName')?.value ?? '',
      baseUnit: this.productForm_.get('baseUnit')?.value ?? '',
      categories: this.productForm_.get('categories')?.value ?? [],
      allergens: this.productForm_.get('allergens')?.value ?? [],
      yieldFactor: this.productForm_.get('yieldFactor')?.value ?? 1,
      minStockLevel: this.productForm_.get('minStockLevel')?.value ?? 0,
      expiryDaysDefault: this.productForm_.get('expiryDaysDefault')?.value ?? 0
    }
    this.aiProductModal_.open('edit', snapshot, undefined, async (patch) => this.productAiFlow_.applyPatch(patch))
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.productNameInputRef()?.nativeElement?.focus(), 0)
  }

  ngOnInit(): void {
    this.unitRegistry.refreshFromStorage()
    this.initForm()
    this.productAiFlow_.init(this.productForm_)
    this.heroFab_.setPageActions(
      [{ labelKey: 'ai_product_title_edit', icon: 'sparkles', run: () => this.openAiProductModal() }],
      'replace'
    )
    this.destroyRef.onDestroy(() => this.heroFab_.clearPageActions())

    runInInjectionContext(this.injector, () => {
      this.formValue_ = toSignal(this.productForm_.valueChanges.pipe(map(() => this.productForm_.getRawValue())), {
        initialValue: this.productForm_.getRawValue()
      })
    })

    const productData = this.initialProduct_()
    if (productData) {
      this.hydrateForm(productData)
    } else {
      this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ product }) => {
        if (product) {
          this.hydrateForm(product)
        } else {
          this.isEditMode_.set(false)
          this.curProduct_.set(this.utilService.getEmptyProduct())
          this.productForm_.patchValue({ baseUnit: 'kg' })
          this.unsaved_.markSaved()
        }
      })
    }
  }

  private initForm(): void {
    this.productForm_ = this.fb_.group({
      productName: [
        '',
        [
          Validators.required,
          duplicateNameValidator(
            () => this.kitchenStateService.products_(),
            () => this.curProduct_()?._id ?? null
          )
        ]
      ],
      baseUnit: ['', Validators.required],
      buy_price_global_: [0, [Validators.min(0)]],
      categories: [[]],
      supplierIds_: [[]],
      minStockLevel: [0, [Validators.min(0)]],
      expiryDaysDefault: [0, [Validators.min(0)]],
      yieldFactor: [1, [Validators.required, Validators.min(0)]],
      waste_percent_: [0, [Validators.min(0), Validators.max(99)]],
      allergens: [[]],
      purchaseOptions: this.fb_.array([])
    })
    this.productForm_
      .get('baseUnit')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string | null) => {
        if (v && v !== 'NEW_UNIT') this.previousBaseUnit_ = v
      })
    this.setupWasteLogic()
  }

  /** Last real base unit (never 'NEW_UNIT'): what a cancelled "add new unit" restores. */
  private previousBaseUnit_ = ''

  private setupWasteLogic(): void {
    const percentCtrl = this.productForm_.get('waste_percent_')
    const yieldCtrl = this.productForm_.get('yieldFactor')

    // React to Waste % change
    percentCtrl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pct) => {
      const { yieldFactor } = this.conversionService.handleWasteChange(pct)

      // Only update if the value is actually different to avoid loops
      if (yieldCtrl?.value !== yieldFactor) {
        yieldCtrl?.setValue(yieldFactor, { emitEvent: false })
        this.productForm_.get('buy_price_global_')?.updateValueAndValidity() // Force price recalc
      }
    })

    yieldCtrl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((y) => {
      if (y === null || y === undefined) return
      const { wastePercent } = this.conversionService.handleYieldChange(y)

      if (percentCtrl?.value !== wastePercent) {
        percentCtrl?.setValue(wastePercent, { emitEvent: false })
        this.productForm_.get('buy_price_global_')?.updateValueAndValidity()
      }
    })
  }

  // RESTORED MODAL ACTIONS
  protected async onCategoryChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement
    const value = select.value
    if (value === 'NEW_CATEGORY') {
      await this.openAddNewCategory()
    } else if (value) {
      this.addCategory(value)
    }
    select.value = ''
  }

  /** Add a category; a typed new name prefills the key modal. The stored English key is what gets selected. */
  protected async openAddNewCategory(typed = ''): Promise<void> {
    try {
      const result = await this.translationKeyModal.open(typed.trim(), 'category')
      if (!isTranslationKeyResult(result)) return
      this.translationService.updateDictionary(result.englishKey, result.hebrewLabel)
      await this.metadataRegistry.registerCategory(result.hebrewLabel)
      this.addCategory(result.englishKey)
      notifyItemAdded(this.userMsgService, (k) => this.translationService.translate(k), result.hebrewLabel)
    } catch (err) {
      this.logging.error({
        event: 'inventory.product.add_category_error',
        message: 'Failed to add category',
        context: { err }
      })
    }
  }

  protected async onSupplierChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement
    const value = select.value
    if (value === 'ADD_SUPPLIER') {
      await this.openAddSupplier()
    } else if (value) {
      const ctrl = this.productForm_.get('supplierIds_')
      const current = (ctrl?.value || []) as string[]
      if (!current.includes(value)) {
        ctrl?.setValue([...current, value])
      }
    }
    select.value = ''
  }

  protected async openAddSupplier(typedName = ''): Promise<void> {
    const supplier = await this.addSupplierFlowService.open(typedName)
    if (supplier?._id) {
      const ctrl = this.productForm_.get('supplierIds_')
      const current = (ctrl?.value || []) as string[]
      if (!current.includes(supplier._id)) {
        ctrl?.setValue([...current, supplier._id])
      }
    }
  }

  /** Add an allergen: always through the key window, prefilled with the typed name (rule W). */
  protected async onAddNewAllergen(hebrewLabel: string): Promise<void> {
    try {
      const result = await this.translationKeyModal.open((hebrewLabel ?? '').trim(), 'allergen')
      if (!isTranslationKeyResult(result)) return
      const englishKey = result.englishKey
      const current = (this.productForm_.get('allergens')?.value || []) as string[]
      if (current.includes(englishKey)) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('allergen_already_on_product'))
        return
      }
      await this.metadataRegistry.registerAllergen(englishKey)
      this.translationService.updateDictionary(englishKey, result.hebrewLabel)
      this.toggleAllergen(englishKey)
      notifyItemAdded(this.userMsgService, (k) => this.translationService.translate(k), result.hebrewLabel)
    } catch (err) {
      this.logging.error({
        event: 'inventory.product.add_allergen_error',
        message: 'Failed to add allergen',
        context: { err }
      })
    }
  }

  /** Reads and clears the typed add-row name (rule W). */
  private takePendingAddName_(): string {
    const typed = this.pendingAddName_()
    this.pendingAddName_.set('')
    return typed
  }

  /**
   * Plan 423 - one flow for every "add new unit" in the form. Clears the control, opens the window, then
   * delivers the unit that was saved (`onAdded`) or, when the window closes without a save, puts `previous`
   * (a string, never a number) back. Takes the first result only and ends with the component.
   */
  private async pickNewUnit_(
    control: AbstractControl | null | undefined,
    previous: string,
    context: UnitCreatorContext,
    onAdded: (added: { key: string; amount?: number; basis?: string }) => void
  ): Promise<void> {
    control?.setValue('', { emitEvent: false })
    this.unitRegistry.openUnitCreator(context)
    let alive = true
    const stopWatching = this.destroyRef.onDestroy(() => (alive = false))
    const added = await (context.forProduct
      ? this.unitRegistry.awaitProductUnitAdded()
      : this.unitRegistry.awaitUnitCreated().then((key) => (key ? { key } : null)))
    stopWatching()
    if (!alive) return
    if (added) onAdded(added)
    else control?.setValue(previous, { emitEvent: false })
  }

  protected onBaseUnitValueChange(value: string): void {
    if (value !== 'NEW_UNIT') return
    const control = this.productForm_.get('baseUnit')
    this.pickNewUnit_(control, this.previousBaseUnit_, { prefillName: this.takePendingAddName_() }, ({ key }) => {
      control?.setValue(key)
    })
  }

  protected onUnitSymbolValueChange(value: string, index: number): void {
    if (value !== 'NEW_UNIT') return
    const row = this.purchaseOptions_.at(index) as FormGroup | undefined
    if (!row) return
    const existingSymbols =
      ((this.purchaseOptions_.value as { unitSymbol?: string }[])
        ?.map((o) => o?.unitSymbol)
        ?.filter(Boolean) as string[]) ?? []
    const productName = String(this.productForm_.get('productName')?.value ?? '').trim()
    const baseUnit = String(this.productForm_.get('baseUnit')?.value ?? '')
    const previous = this.purchaseOptionState_.get(row)?.previousUnit ?? ''
    this.pickNewUnit_(
      row.get('unitSymbol'),
      previous,
      {
        existingUnitSymbols: existingSymbols,
        prefillName: this.takePendingAddName_(),
        forProduct: { name: productName, baseUnit }
      },
      (added) => this.applyNewPurchaseUnit_(index, added as ProductUnitAdded)
    )
  }

  /** Fill a purchase row with a just-added unit: this product's own amount, the unit it was typed in, suggested price. */
  private applyNewPurchaseUnit_(index: number, added: ProductUnitAdded): void {
    const row = this.purchaseOptions_.at(index) as FormGroup | undefined
    if (!row) return
    const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(
      this.productForm_.get('buy_price_global_')?.value || 0,
      added.amount
    )
    row.patchValue(
      { unitSymbol: added.key, uom: added.basis, conversionRate: added.amount, priceOverride: suggestedPrice },
      { emitEvent: false }
    )
    const state = this.purchaseOptionState_.get(row) ?? { overrideConfirmed: false }
    this.purchaseOptionState_.set(row, {
      ...state,
      overrideConfirmed: false,
      previousUnit: added.key,
      previousUom: added.basis
    })
    this.productForm_.markAsDirty()
  }

  protected onUomValueChange(value: string, index: number): void {
    if (value !== 'NEW_UNIT') return
    const row = this.purchaseOptions_.at(index) as FormGroup | undefined
    if (!row) return
    const previous = this.purchaseOptionState_.get(row)?.previousUom ?? ''
    this.pickNewUnit_(row.get('uom'), previous, { prefillName: this.takePendingAddName_() }, ({ key }) => {
      row.get('uom')?.setValue(key)
    })
  }

  protected toggleAllergen(allergen: string): void {
    const ctrl = this.productForm_.get('allergens')
    const current = (ctrl?.value || []) as string[]
    const updated = current.includes(allergen) ? current.filter((a: string) => a !== allergen) : [...current, allergen]

    ctrl?.setValue(updated)
    ctrl?.markAsDirty()
  }

  protected addCategory(cat: string): void {
    if (!cat?.trim()) return
    const ctrl = this.productForm_.get('categories')
    const current = (ctrl?.value || []) as string[]
    if (current.includes(cat)) {
      this.userMsgService.onSetErrorMsg(this.translationService.translate('category_already_on_product'))
      return
    }
    ctrl?.setValue([...current, cat])
    ctrl?.markAsDirty()
  }

  protected removeCategory(cat: string): void {
    const ctrl = this.productForm_.get('categories')
    const current = (ctrl?.value || []) as string[]
    ctrl?.setValue(current.filter((c) => c !== cat))
    ctrl?.markAsDirty()
  }

  protected removeSupplierId(id: string): void {
    const ctrl = this.productForm_.get('supplierIds_')
    const current = (ctrl?.value || []) as string[]
    ctrl?.setValue(current.filter((s) => s !== id))
    ctrl?.markAsDirty()
  }

  protected addSupplierId(id: string): void {
    if (!id?.trim()) return
    const ctrl = this.productForm_.get('supplierIds_')
    const current = (ctrl?.value || []) as string[]
    if (!current.includes(id)) {
      ctrl?.setValue([...current, id])
      ctrl?.markAsDirty()
    }
  }

  protected selectedSupplierIds_(): string[] {
    return (this.productForm_.get('supplierIds_')?.value || []) as string[]
  }

  protected selectedCategories_(): string[] {
    return (this.productForm_.get('categories')?.value || []) as string[]
  }

  protected getSupplierName(supplierId: string): string {
    const supplier = this.kitchenStateService.suppliersById_().get(supplierId)
    return supplier?.nameHebrew ?? supplierId
  }

  //GETERS
  get purchaseOptions_(): FormArray {
    return this.productForm_.get('purchaseOptions') as FormArray
  }

  get readProductForm_(): FormGroup {
    return this.productForm_
  }

  /** For pendingChangesGuard: values on this item (categories, allergens) that are not in the dictionary so we ask for English key in a modal before leaving. */
  getValuesNeedingTranslation(): string[] {
    if (!this.productForm_) return []
    const raw = this.productForm_.getRawValue()
    const categories = (raw?.categories ?? []) as string[]
    const allergens = (raw?.allergens ?? []) as string[]
    const combined = [...categories, ...allergens]
      .map((v) => (v != null ? String(v).trim() : ''))
      .filter((v) => v !== '')
    const unique = [...new Set(combined)]
    return unique.filter((v) => !this.translationService.hasKey(v))
  }

  /** For pendingChangesGuard: remove untranslated values from categories and allergens when user chooses "continue without saving". */
  removeValuesNeedingTranslation(): void {
    if (!this.productForm_) return
    const toRemove = this.getValuesNeedingTranslation()
    if (toRemove.length === 0) return
    const catCtrl = this.productForm_.get('categories')
    const allCtrl = this.productForm_.get('allergens')
    const currentCat = ((catCtrl?.value ?? []) as string[]).filter((v) => !toRemove.includes(String(v).trim()))
    const currentAll = ((allCtrl?.value ?? []) as string[]).filter((v) => !toRemove.includes(String(v).trim()))
    catCtrl?.setValue(currentCat)
    allCtrl?.setValue(currentAll)
    catCtrl?.markAsDirty()
    allCtrl?.markAsDirty()
  }

  /** For pendingChangesGuard: true when current form value differs from initial state when user entered the item. */
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  /** Normalized form value for comparison (sorted arrays, comparable purchaseOptions). */
  private getFormSnapshotForComparison(): string {
    const raw = this.productForm_.getRawValue()
    type Opt = { unitSymbol?: string; conversionRate?: number; uom?: string; priceOverride?: number }
    const opts = (raw?.purchaseOptions ?? []) as Opt[]
    const normalized = {
      productName: raw?.productName ?? '',
      baseUnit: raw?.baseUnit ?? '',
      buy_price_global_: Number(raw?.buy_price_global_) || 0,
      categories: [...((raw?.categories ?? []) as string[])].sort(),
      supplierIds_: [...(raw?.supplierIds_ ?? [])].sort(),
      minStockLevel: Number(raw?.minStockLevel),
      expiryDaysDefault: Number(raw?.expiryDaysDefault),
      yieldFactor: Number(raw?.yieldFactor),
      waste_percent_: Number(raw?.waste_percent_),
      allergens: [...((raw?.allergens ?? []) as string[])].sort(),
      purchaseOptions: opts
        .map((o) => ({
          unitSymbol: o?.unitSymbol ?? '',
          conversionRate: Number(o?.conversionRate),
          uom: o?.uom ?? '',
          priceOverride: Number(o?.priceOverride)
        }))
        .sort((a, b) => (a.unitSymbol || '').localeCompare(b.unitSymbol || ''))
    }
    return JSON.stringify(normalized)
  }

  protected addPurchaseOption(opt?: Partial<PurchaseOption_>): void {
    const unit = opt?.unitSymbol || ''
    const conv = opt ? opt.conversionRate : null
    const baseUnit = this.productForm_.get('baseUnit')?.value ?? ''
    const uomValue = opt?.uom ?? baseUnit

    const group = this.fb_.group({
      unitSymbol: [unit, Validators.required],
      conversionRate: [conv, [Validators.required, Validators.min(0.0001)]],
      uom: [uomValue, Validators.required],
      show_special_price_: [!!(opt?.priceOverride != null && Number(opt?.priceOverride) !== 0)],
      priceOverride: [opt?.priceOverride || 0, [Validators.min(0)]]
    })

    // Initialize state for this row
    this.purchaseOptionState_.set(group, { overrideConfirmed: false, previousUnit: unit, previousUom: uomValue })

    group
      .get('uom')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string | null) => {
        if (!v || v === 'NEW_UNIT') return
        const state = this.purchaseOptionState_.get(group) ?? { overrideConfirmed: false }
        this.purchaseOptionState_.set(group, { ...state, previousUom: v })
      })

    group
      .get('unitSymbol')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newUnit: string | null) => {
        // 'NEW_UNIT': the row stays as it was until the window answers (a cancel restores the previous unit)
        if (newUnit === 'NEW_UNIT') return
        if (!newUnit) {
          group.patchValue(
            {
              conversionRate: null,
              uom: '',
              priceOverride: 0
            },
            { emitEvent: false }
          )
          return
        }

        const baseUnitKey = this.productForm_.get('baseUnit')?.value ?? ''
        const baseFactor = this.unitRegistry.getConversion(baseUnitKey) || 1
        const unitFactor = this.unitRegistry.getConversion(newUnit) || 1
        // Plan 423: only physical-constant units are pre-filled (kg, gram, ...). A custom unit (jar, box)
        // weighs something different for every product, so another product's number is never copied in.
        const suggestedConv: number | null = PREFILLED_UNITS.has(newUnit)
          ? baseFactor > 0 && unitFactor > 0
            ? unitFactor / baseFactor
            : 1
          : null
        const currentGlobal = this.productForm_.get('buy_price_global_')?.value || 0

        // 1. Get the actual base unit selected at the top of the form (e.g., 'gram')
        const currentBaseUnit = this.productForm_.get('baseUnit')?.value ?? ''
        const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(currentGlobal, suggestedConv ?? 0)

        // 2. Patch the row so the "UOM" (middle dropdown) is no longer empty
        group.patchValue(
          {
            conversionRate: suggestedConv,
            uom: currentBaseUnit, // 👈 This fills the empty slot next to 5000
            priceOverride: suggestedPrice
          },
          { emitEvent: false }
        )

        // Reset override state when unit changes
        const state = this.purchaseOptionState_.get(group) ?? { overrideConfirmed: false }
        this.purchaseOptionState_.set(group, { ...state, overrideConfirmed: false, previousUnit: newUnit })

        // 3. Mark for check to ensure the UI refreshes the calculation
        group.get('priceOverride')?.markAsDirty()
      })

    group
      .get('conversionRate')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newConv: number | null | undefined) => {
        if (newConv === null || newConv === undefined) return
        const state = this.purchaseOptionState_.get(group) ?? { overrideConfirmed: false }
        if (state.overrideConfirmed) {
          return
        }
        const conventional = this.getConventionalPriceForGroup_(group)
        group.get('priceOverride')?.setValue(conventional, { emitEvent: false })
      })

    // When user unchecks "special price", clear priceOverride so the state persists on save (when they come back it stays unchecked)
    group
      .get('show_special_price_')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((checked: boolean | null) => {
        if (!checked) {
          group.get('priceOverride')?.setValue(0, { emitEvent: false })
        }
      })

    this.purchaseOptions_.push(group)
  }

  /** Computes the conventional (auto) price for a row, based on base price and conversion rate. */
  private getConventionalPriceForGroup_(group: FormGroup): number {
    const basePrice = this.productForm_.get('buy_price_global_')?.value || 0
    const conv = group.get('conversionRate')?.value
    if (!basePrice || !conv) return 0
    // Conventional meaning: price for the quantity that equals 1 base unit
    return this.conversionService.getSuggestedPurchasePrice(basePrice, conv)
  }

  /** Called on blur of priceOverride to confirm manual overrides that differ from the conventional value. */
  protected async onPriceOverrideBlur(control: AbstractControl | null | undefined): Promise<void> {
    const group = control as FormGroup | null
    if (!group) return

    const state = this.purchaseOptionState_.get(group) ?? { overrideConfirmed: false }
    const conventional = this.getConventionalPriceForGroup_(group)
    const current = group.get('priceOverride')?.value
    const epsilon = 0.0001

    // If empty or NaN, snap back to conventional and clear override
    if (current === null || current === '' || isNaN(Number(current))) {
      group.get('priceOverride')?.setValue(conventional, { emitEvent: false })
      state.overrideConfirmed = false
      this.purchaseOptionState_.set(group, state)
      return
    }

    const numericCurrent = Number(current)

    // If essentially equal to conventional, treat as non-override
    if (Math.abs(numericCurrent - conventional) <= epsilon) {
      state.overrideConfirmed = false
      this.purchaseOptionState_.set(group, state)
      return
    }

    const confirmed = await this.confirmModal.open('save_price_confirm', {
      title: 'save_price'
    })
    if (confirmed) {
      state.overrideConfirmed = true
      this.purchaseOptionState_.set(group, state)
    } else {
      group.get('priceOverride')?.setValue(conventional, { emitEvent: false })
      state.overrideConfirmed = false
      this.purchaseOptionState_.set(group, state)
    }
  }

  private hydrateForm(data: Product): void {
    this.isEditMode_.set(true)
    this.curProduct_.set(data)

    const legacy = data as unknown as { category?: string; is_dairy_?: boolean }
    const categories = data.categories ?? (legacy.category ? [legacy.category] : [])
    const withDairy = legacy.is_dairy_ && !categories.includes('dairy') ? [...categories, 'dairy'] : categories

    this.productForm_.patchValue({
      productName: data.nameHebrew,
      baseUnit: data.baseUnit,
      buy_price_global_: getEffectivePrice(data),
      categories: withDairy,
      supplierIds_: getSupplierIds(data),
      minStockLevel: data.minStockLevel ?? 0,
      expiryDaysDefault: data.expiryDaysDefault ?? 0,
      yieldFactor: data.yieldFactor,
      waste_percent_: Math.round((1 - data.yieldFactor) * 100),
      allergens: data.allergens || []
    })

    if ((data.minStockLevel ?? 0) > 0) this.expandedMinStock_.set(true)
    if ((data.expiryDaysDefault ?? 0) > 0) this.expandedExpiryDays_.set(true)
    if (Math.abs((data.yieldFactor ?? 1) - 1) > 0.001) this.expandedWasteYield_.set(true)
    if ((data.allergens?.length ?? 0) > 0) this.expandedAllergens_.set(true)
    if (getSupplierIds(data).length > 0) this.expandedSupplier_.set(true)

    this.purchaseOptions_.clear()

    if (data.purchaseOptions && data.purchaseOptions.length > 0) {
      const baseUom = data.baseUnit ?? 'gram'
      data.purchaseOptions.forEach((opt) => {
        this.addPurchaseOption({ ...opt, uom: opt.uom ?? baseUom })
      })
    }

    this.unsaved_.markSaved()
  }
  private validateForm_(): boolean {
    const errors: Record<string, string> = {}
    const val = this.productForm_.getRawValue()
    if (!val.productName?.trim()) errors['productName'] = 'field_name_required'
    if (!val.baseUnit?.trim()) errors['baseUnit'] = 'field_unit_required'
    this.validationErrors_.set(errors)
    return Object.keys(errors).length === 0
  }

  protected onSubmit(): void {
    this.saveAndWait().then((saved) => {
      if (saved) this.router.navigate(['/inventory/list'])
    })
  }

  /** For pendingChangesGuard: save and resolve true on success, false on failure. */
  async saveAndWait(): Promise<boolean> {
    if (!this.validateForm_()) {
      this.productForm_.markAllAsTouched()
      this.userMsgService.onSetErrorMsg(this.translationService.translate('form_has_errors'))
      return false
    }
    if (!this.productForm_.valid) {
      this.productForm_.markAllAsTouched()
      this.userMsgService.onSetErrorMsg(this.translationService.translate('form_has_errors'))
      return false
    }
    const val = this.productForm_.getRawValue()
    const categories = (val.categories ?? []) as string[]

    const purchaseOptions = (val.purchaseOptions ?? []).map(
      (opt: PurchaseOption_ & { show_special_price_?: boolean }) => {
        const { show_special_price_: special, ...rest } = opt
        // The row keeps an auto-filled price even when "special price" is off; saving it would
        // turn the special price on by itself and cost the unit at that price (plan 377).
        return { ...rest, priceOverride: special ? rest.priceOverride : 0 } as PurchaseOption_
      }
    )

    // Build sources from form's flat buy_price_global_ + supplierIds_
    const formPrice = val.buy_price_global_ ?? 0
    const formSupplierIds = (val.supplierIds_ ?? []) as string[]
    const existingSources = this.curProduct_()?.sources ?? []
    let sources: ProductSource[]
    if (formSupplierIds.length > 0) {
      sources = formSupplierIds.map((sid) => {
        const existing = existingSources.find((s) => s.supplierId === sid)
        return {
          supplierId: sid,
          price: formPrice,
          addedBy: existing?.addedBy,
          addedAt: existing?.addedAt ?? Date.now()
        }
      })
    } else {
      sources = formPrice > 0 ? [{ supplierId: '', price: formPrice, addedAt: Date.now() }] : []
    }

    const productToSave: Product = {
      ...this.curProduct_()!,
      nameHebrew: val.productName,
      baseUnit: val.baseUnit,
      sources,
      categories: categories,
      minStockLevel: val.minStockLevel ?? 0,
      expiryDaysDefault: val.expiryDaysDefault ?? 0,
      yieldFactor: val.yieldFactor,
      allergens: val.allergens,
      purchaseOptions: purchaseOptions
    }

    // Plan 322 M9: same admin "just me / everyone" prompt already asked for
    // brand-new recipes — a brand-new product has no _masterId client-side yet
    // (server only assigns one at insert), so forcePrompt covers that case.
    const isNewProduct = !this.curProduct_()?._id
    let pushToMasterAfterSave = false
    if ((productToSave._masterId && !isNewProduct) || (isNewProduct && this.isAdmin_())) {
      const scope = await this.masterPush_.askScope(
        { _masterId: productToSave._masterId },
        { entity: 'product', isNew: isNewProduct }
      )
      if (scope === 'cancel') return false
      pushToMasterAfterSave = scope === 'everyone'
    }

    this.saving.setSaving(true)
    let saved: Product
    try {
      saved = await this.kitchenStateService.saveProduct(productToSave)
    } catch {
      this.saving.setSaving(false)
      return false
    }
    this.saving.setSaving(false)
    this.validationErrors_.set({})
    this.isSubmitted = true
    if (pushToMasterAfterSave) this.masterPush_.pushProductToMaster(saved)
    // Categories/allergens enter Metadata only once the product is actually saved.
    void registerDraftMetadata({ categories, allergens: val.allergens ?? [] }, this.metadataRegistry)
    return true
  }

  protected onCancel(): void {
    this.router.navigate(['/inventory/list'])
  }

  //DELETE
  protected onDeletePurchaseOption(idx: number): void {
    this.purchaseOptions_.removeAt(idx)
    this.productForm_.markAsDirty()
  }
}
