import { Component, inject, OnInit, signal, computed, input, Signal, runInInjectionContext, Injector, effect, ViewChildren, QueryList, ElementRef, AfterViewChecked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray, AbstractControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';

// import { ProductDataService } from '@services/product-data.service';
import { ConversionService } from '@services/conversion.service';
import { UserMsgService } from '@services/user-msg.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Product, PurchaseOption_ } from '@models/product.model';
import { ClickOutSideDirective } from "@directives/click-out-side";
import { UtilService } from '@services/util.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { TranslationService } from '@services/translation.service';
import { TranslationKeyModalService } from '@services/translation-key-modal.service';
import { AddSupplierFlowService } from '@services/add-supplier-flow.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { duplicateNameValidator } from 'src/app/core/validators/item.validators';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';

@Component({
  selector: 'product-form',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    FormsModule,
    ClickOutSideDirective,
    SelectOnFocusDirective,
    TranslatePipe,
    LoaderComponent
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})

export class ProductFormComponent implements OnInit, AfterViewChecked {
  initialProduct_ = input<Product | null>(null);

  private readonly fb_ = inject(FormBuilder);
  private readonly conversionService = inject(ConversionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly utilService = inject(UtilService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  private readonly translationService = inject(TranslationService);
  private readonly translationKeyModal = inject(TranslationKeyModalService);
  private readonly addSupplierFlowService = inject(AddSupplierFlowService);
  private readonly userMsgService = inject(UserMsgService);
  private readonly injector = inject(Injector);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly destroyRef = inject(DestroyRef);

  unitRegistry = inject(UnitRegistryService);
  @ViewChildren('categoryDropdownItem') categoryDropdownItems!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('categoryTrigger') categoryTriggerQuery!: QueryList<ElementRef<HTMLElement>>;
  get categoryTriggerRef(): ElementRef<HTMLElement> | undefined { return this.categoryTriggerQuery?.first; }
  // RESTORED UI SIGNALS

  protected readonly categoryOptions_ = computed(() => this.metadataRegistry.allCategories_());
  protected readonly suppliers_ = computed(() => this.kitchenStateService.suppliers_());
  protected availableUnits_ = computed(() => this.unitRegistry.allUnitKeys_());
  protected allergenOptions_ = computed(() => this.metadataRegistry.allAllergens_());
  protected isEditMode_ = signal<boolean>(false);
  protected isSaving_ = signal(false);
  protected curProduct_ = signal<Product | null>(null);
  protected isBaseUnitMode_ = signal(false);

  //SIMPLE VALUES
  private formValue_!: Signal<any>
  protected showSuggestions = false;
  protected productForm_!: FormGroup;
  // protected readonly KitchenUnit = KitchenUnit;
  isSubmitted = false;

  // Tracks per-row state for purchase options (e.g., whether a manual override was confirmed)
  private readonly purchaseOptionState_ = new WeakMap<FormGroup, { overrideConfirmed: boolean }>();

  //COMPUTED
  protected netUnitCost_ = computed(() => {
    if (!this.formValue_) return 0;
    const currentForm = this.formValue_();
    const price = currentForm?.buy_price_global_ || 0;
    const yieldFactor = currentForm?.yield_factor_ || 1;
    return yieldFactor > 0 ? price / yieldFactor : 0;
  });

  protected selectedAllergensSignal_ = computed(() => {
    return this.formValue_()?.allergens_ || [];
  }); protected activeRowIndex_ = signal<number | null>(null);


  protected filteredAllergenOptions_ = computed(() => {
    const all = this.metadataRegistry.allAllergens_();
    const selected = this.selectedAllergensSignal_() || [];
    return all.filter(allergen => !selected.includes(allergen));
  });

  protected filteredCategoryOptions_ = computed(() => {
    const all = this.metadataRegistry.allCategories_();
    const selected = (this.formValue_?.()?.categories_ ?? []) as string[];
    return all.filter((c: string) => !selected.includes(c));
  });

  protected filteredSupplierOptions_ = computed(() => {
    const all = this.kitchenStateService.suppliers_();
    const selectedIds = (this.formValue_?.()?.supplierIds_ ?? []) as string[];
    return all.filter((s: { _id: string }) => !selectedIds.includes(s._id));
  });

  protected allergenSearchQuery_ = signal('');

  protected showCategoryDropdown_ = signal(false);
  protected showSupplierDropdown_ = signal(false);
  protected categoryDropdownHighlightIndex_ = signal(-1);
  private categoryDropdownFocusPending_ = false;

  protected expandedMinStock_ = signal(false);
  protected expandedExpiryDays_ = signal(false);
  protected expandedWasteYield_ = signal(false);
  protected expandedAllergens_ = signal(false);
  protected expandedSupplier_ = signal(false);

  protected toggleMinStock(): void { this.expandedMinStock_.update(v => !v); }
  protected toggleExpiryDays(): void { this.expandedExpiryDays_.update(v => !v); }
  protected toggleWasteYield(): void { this.expandedWasteYield_.update(v => !v); }
  protected toggleAllergens(): void { this.expandedAllergens_.update(v => !v); }
  protected toggleSupplier(): void { this.expandedSupplier_.update(v => !v); }

  protected onSupplierBlur(clickTarget?: HTMLElement): void {
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return;
    if (this.selectedSupplierIds_().length === 0) {
      this.expandedSupplier_.set(false);
    }
  }

  protected onMinStockBlur(clickTarget?: HTMLElement): void {
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return;
    const val = this.productForm_.get('min_stock_level_')?.value;
    if (val == null || val === 0 || val === '') {
      this.expandedMinStock_.set(false);
    }
  }

  protected onExpiryDaysBlur(clickTarget?: HTMLElement): void {
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return;
    const val = this.productForm_.get('expiry_days_default_')?.value;
    if (val == null || val === 0 || val === '') {
      this.expandedExpiryDays_.set(false);
    }
  }

  protected onAllergensBlur(clickTarget?: HTMLElement): void {
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return;
    const allergens = (this.productForm_.get('allergens_')?.value || []) as string[];
    if (allergens.length === 0) {
      this.expandedAllergens_.set(false);
    }
  }

  protected onWasteYieldBlur(clickTarget?: HTMLElement): void {
    if (clickTarget?.closest?.('.collapsible-field__header--btn')) return;
    const waste = this.productForm_.get('waste_percent_')?.value;
    const yieldVal = this.productForm_.get('yield_factor_')?.value;
    const isDefault = (waste == null || waste === 0) && (yieldVal == null || yieldVal === 1);
    if (isDefault) {
      this.expandedWasteYield_.set(false);
    }
  }

  protected onCategoryKeyboardOpen(event: Event): void {
    const e = event as KeyboardEvent;
    e.preventDefault();
    const key = e.key;
    this.showCategoryDropdown_.set(true);
    const options = this.filteredCategoryOptions_();
    const total = options.length + 1; // +1 for "add new"
    if (key === 'ArrowDown') {
      this.categoryDropdownHighlightIndex_.set(0);
      this.categoryDropdownFocusPending_ = true;
    } else if (key === 'ArrowUp') {
      this.categoryDropdownHighlightIndex_.set(Math.max(0, total - 1));
      this.categoryDropdownFocusPending_ = true;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.categoryDropdownFocusPending_ || !this.showCategoryDropdown_()) return;
    this.categoryDropdownFocusPending_ = false;
    const idx = this.categoryDropdownHighlightIndex_();
    const items = this.categoryDropdownItems;
    if (items?.length && idx >= 0 && idx < items.length) {
      (items.get(idx) as ElementRef<HTMLElement>)?.nativeElement?.focus();
    }
  }

  protected onCategoryDropdownKeydown(event: Event): void {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== 'Escape') return;
    event.preventDefault();
    const options = this.filteredCategoryOptions_();
    const total = options.length + 1;
    let idx = this.categoryDropdownHighlightIndex_();

    if (key === 'ArrowDown') {
      idx = idx < total - 1 ? idx + 1 : 0;
      this.categoryDropdownHighlightIndex_.set(idx);
      this.focusCategoryItem(idx);
    } else if (key === 'ArrowUp') {
      idx = idx > 0 ? idx - 1 : total - 1;
      this.categoryDropdownHighlightIndex_.set(idx);
      this.focusCategoryItem(idx);
    } else if (key === 'Enter') {
      if (idx >= 0 && idx < options.length) {
        this.addCategory(options[idx]);
      } else if (idx === options.length) {
        this.openAddNewCategory();
      }
      this.showCategoryDropdown_.set(false);
      this.categoryDropdownHighlightIndex_.set(-1);
      this.categoryTriggerRef?.nativeElement?.focus();
    } else if (key === 'Escape') {
      this.showCategoryDropdown_.set(false);
      this.categoryDropdownHighlightIndex_.set(-1);
      this.categoryTriggerRef?.nativeElement?.focus();
    }
  }

  private focusCategoryItem(index: number): void {
    setTimeout(() => {
      const items = this.categoryDropdownItems;
      if (items?.length && index >= 0 && index < items.length) {
        (items.get(index) as ElementRef<HTMLElement>)?.nativeElement?.focus();
      }
    }, 0);
  }


  constructor() {
    effect(() => {

      // 1. Define variables first
      const allUnits = this.unitRegistry.allUnitKeys_();
      const isCreatorOpen = this.unitRegistry.isCreatorOpen_();
      const index = this.activeRowIndex_();
      const isBase = this.isBaseUnitMode_();

      // 2. Only run logic if the modal just closed
      if (!isCreatorOpen) {
        const lastUnitName = Array.from(allUnits.keys()).pop();
        if (!lastUnitName) return;

        if (isBase) {
          this.productForm_.get('base_unit_')?.setValue(lastUnitName);
          this.isBaseUnitMode_.set(false);
        } else if (index !== null) {
          const row = this.purchaseOptions_.at(index);
          const currentBase = this.productForm_.get('base_unit_')?.value;

          // 3. Patch both the symbol AND the UOM (grams/ml) at once
          row.patchValue({
            unit_symbol_: lastUnitName,
            uom: currentBase
          });

          this.activeRowIndex_.set(null);
        }
      }
    });
  }

  ngOnInit(): void {
    this.initForm();

    runInInjectionContext(this.injector, () => {
      this.formValue_ = toSignal(this.productForm_.valueChanges, {
        initialValue: this.productForm_.getRawValue()
      });
    });


    const productData = this.initialProduct_();
    if (productData) {
      this.hydrateForm(productData);
    } else {
      this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ product }) => {
        if (product) {
          this.hydrateForm(product);
        } else {
          this.isEditMode_.set(false);
          this.curProduct_.set(this.utilService.getEmptyProduct());
          this.productForm_.patchValue({ base_unit_: 'kg' })
        }
      });
    }
  }

  private initForm(): void {
    this.productForm_ = this.fb_.group({
      productName: ['', [
        Validators.required,
        duplicateNameValidator(
          () => this.kitchenStateService.products_(),
          () => this.curProduct_()?._id ?? null
        )
      ]],
      base_unit_: ['', Validators.required],
      buy_price_global_: [0, [Validators.required, Validators.min(0)]],
      categories_: [[], [Validators.required, Validators.minLength(1)]],
      supplierIds_: [[]],
      min_stock_level_: [0, [Validators.min(0)]],
      expiry_days_default_: [0, [Validators.min(0)]],
      yield_factor_: [1, [Validators.required]],
      waste_percent_: [0, [Validators.min(0), Validators.max(99)]],
      allergens_: [[]],
      purchase_options_: this.fb_.array([])
    });
    this.setupWasteLogic();
  }

  // RESTORED WASTE LOGIC
  private setupWasteLogic(): void {
    const percentCtrl = this.productForm_.get('waste_percent_');
    const yieldCtrl = this.productForm_.get('yield_factor_');

    // React to Waste % change
    percentCtrl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(pct => {
      const { yieldFactor } = this.conversionService.handleWasteChange(pct);

      // Only update if the value is actually different to avoid loops
      if (yieldCtrl?.value !== yieldFactor) {
        yieldCtrl?.setValue(yieldFactor, { emitEvent: false });
        this.productForm_.get('buy_price_global_')?.updateValueAndValidity(); // Force price recalc
      }
    });

    yieldCtrl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(y => {
      if (y === null || y === undefined) return;
      const { wastePercent } = this.conversionService.handleYieldChange(y);

      if (percentCtrl?.value !== wastePercent) {
        percentCtrl?.setValue(wastePercent, { emitEvent: false });
        this.productForm_.get('buy_price_global_')?.updateValueAndValidity();
      }
    });
  }



  // RESTORED MODAL ACTIONS
  protected onUnitChange(event: Event, index: number): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'NEW_UNIT') {
      // 1. Tell the service which row we are currently editing
      // This allows the form to "remember" the target while the UnitCreatorComponent is active
      this.activeRowIndex_.set(index);
      this.isBaseUnitMode_.set(false);

      // 2. Trigger the GLOBAL station
      this.unitRegistry.openUnitCreator();

      select.value = '';
    }
  }

  protected async onCategoryChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value === 'NEW_CATEGORY') {
      await this.openAddNewCategory();
    } else if (value) {
      this.addCategory(value);
    }
    select.value = '';
  }

  protected async openAddNewCategory(): Promise<void> {
    try {
      const result = await this.translationKeyModal.open('', 'category');
      if (result?.englishKey && result?.hebrewLabel) {
        await this.metadataRegistry.registerCategory(result.englishKey);
        this.translationService.updateDictionary(result.englishKey, result.hebrewLabel);
        this.addCategory(result.englishKey);
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  }

  protected async onSupplierChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value === 'ADD_SUPPLIER') {
      await this.openAddSupplier();
    } else if (value) {
      const ctrl = this.productForm_.get('supplierIds_');
      const current = (ctrl?.value || []) as string[];
      if (!current.includes(value)) {
        ctrl?.setValue([...current, value]);
      }
    }
    select.value = '';
  }

  protected async openAddSupplier(): Promise<void> {
    const supplier = await this.addSupplierFlowService.open();
    if (supplier?._id) {
      const ctrl = this.productForm_.get('supplierIds_');
      const current = (ctrl?.value || []) as string[];
      if (!current.includes(supplier._id)) {
        ctrl?.setValue([...current, supplier._id]);
      }
    }
  }

  protected async onAddNewAllergen(hebrewLabel: string): Promise<void> {
    if (!hebrewLabel?.trim()) return;
    try {
      const result = await this.translationKeyModal.open(hebrewLabel.trim(), 'allergen');
      if (result) {
        await this.metadataRegistry.registerAllergen(result.englishKey);
        this.translationService.updateDictionary(result.englishKey, result.hebrewLabel);
        this.toggleAllergen(result.englishKey);
        this.allergenSearchQuery_.set('');
      }
    } catch (err) {
      console.error('Failed to add allergen:', err);
    }
  }

  protected onBaseUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'NEW_UNIT') {
      this.activeRowIndex_.set(null);
      this.isBaseUnitMode_.set(true);

      // Trigger the GLOBAL station
      this.unitRegistry.openUnitCreator();

      select.value = '';
    }
  }


  protected toggleAllergen(allergen: string): void {
    const ctrl = this.productForm_.get('allergens_');
    const current = ctrl?.value || [];
    const updated = current.includes(allergen)
      ? current.filter((a: string) => a !== allergen)
      : [...current, allergen];

    ctrl?.setValue(updated);
    ctrl?.markAsDirty();
  }

  protected addCategory(cat: string): void {
    if (!cat?.trim()) return;
    const ctrl = this.productForm_.get('categories_');
    const current = (ctrl?.value || []) as string[];
    if (!current.includes(cat)) {
      ctrl?.setValue([...current, cat]);
      ctrl?.markAsDirty();
    }
  }

  protected removeCategory(cat: string): void {
    const ctrl = this.productForm_.get('categories_');
    const current = (ctrl?.value || []) as string[];
    ctrl?.setValue(current.filter(c => c !== cat));
    ctrl?.markAsDirty();
  }

  protected removeSupplierId(id: string): void {
    const ctrl = this.productForm_.get('supplierIds_');
    const current = (ctrl?.value || []) as string[];
    ctrl?.setValue(current.filter(s => s !== id));
    ctrl?.markAsDirty();
  }

  protected addSupplierId(id: string): void {
    if (!id?.trim()) return;
    const ctrl = this.productForm_.get('supplierIds_');
    const current = (ctrl?.value || []) as string[];
    if (!current.includes(id)) {
      ctrl?.setValue([...current, id]);
      ctrl?.markAsDirty();
    }
  }

  protected selectedSupplierIds_(): string[] {
    return (this.productForm_.get('supplierIds_')?.value || []) as string[];
  }

  protected selectedCategories_(): string[] {
    return (this.productForm_.get('categories_')?.value || []) as string[];
  }

  protected getSupplierName(supplierId: string): string {
    const supplier = this.kitchenStateService.suppliers_().find(s => s._id === supplierId);
    return supplier?.name_hebrew ?? supplierId;
  }


  //GETERS
  get purchaseOptions_(): FormArray {
    return this.productForm_.get('purchase_options_') as FormArray;
  }

  get readProductForm_(): FormGroup {
    return this.productForm_;
  }


  protected addPurchaseOption(opt?: Partial<PurchaseOption_>): void {
    const unit = opt?.unit_symbol_ || '';
    const conv = opt ? opt.conversion_rate_ : null;
    const uomValue = opt ? opt.uom : ''

    const globalPrice = this.productForm_.get('buy_price_global_')?.value || 0;

    // const currentBaseUnit = this.productForm_.get('base_unit_')?.value || '';

    const group = this.fb_.group({
      unit_symbol_: [unit, Validators.required],
      conversion_rate_: [conv, [Validators.required, Validators.min(0.0001)]],
      uom: [uomValue, Validators.required],
      price_override_: [opt?.price_override_ || 0]
    });

    // Initialize state for this row
    this.purchaseOptionState_.set(group, { overrideConfirmed: false });

    group.get('unit_symbol_')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((newUnit: string | null) => {

      if (!newUnit || newUnit === 'NEW_UNIT') {
        group.patchValue({
          conversion_rate_: null,
          uom: '',
          price_override_: 0
        }, { emitEvent: false });
        return;
      }

      const baseUnitKey = this.productForm_.get('base_unit_')?.value ?? '';
      const baseFactor = this.unitRegistry.getConversion(baseUnitKey) || 1;
      const unitFactor = this.unitRegistry.getConversion(newUnit) || 1;
      // conversion_rate_ = how many purchase units per 1 base unit
      const suggestedConv = baseFactor / unitFactor;
      const currentGlobal = this.productForm_.get('buy_price_global_')?.value || 0;

      // 1. Get the actual base unit selected at the top of the form (e.g., 'gram')
      const currentBaseUnit = this.productForm_.get('base_unit_')?.value ?? '';
      const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(currentGlobal, suggestedConv);

      // 2. Patch the row so the "UOM" (middle dropdown) is no longer empty
      group.patchValue({
        conversion_rate_: suggestedConv,
        uom: currentBaseUnit, // 👈 This fills the empty slot next to 5000
        price_override_: suggestedPrice
      }, { emitEvent: false });

      // Reset override state when unit changes
      const state = this.purchaseOptionState_.get(group) || { overrideConfirmed: false };
      state.overrideConfirmed = false;
      this.purchaseOptionState_.set(group, state);

      // 3. Mark for check to ensure the UI refreshes the calculation
      group.get('price_override_')?.markAsDirty();
    });

    group.get('conversion_rate_')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((newConv: number | null | undefined) => {
      if (newConv === null || newConv === undefined) return;
      const state = this.purchaseOptionState_.get(group) || { overrideConfirmed: false };
      if (state.overrideConfirmed) {
        return;
      }
      const conventional = this.getConventionalPriceForGroup_(group);
      group.get('price_override_')?.setValue(conventional, { emitEvent: false });
    });

    this.purchaseOptions_.push(group);
  }

  /** Computes the conventional (auto) price for a row, based on base price and conversion rate. */
  private getConventionalPriceForGroup_(group: FormGroup): number {
    const basePrice = this.productForm_.get('buy_price_global_')?.value || 0;
    const conv = group.get('conversion_rate_')?.value;
    if (!basePrice || !conv) return 0;
    // Conventional meaning: price for the quantity that equals 1 base unit
    return this.conversionService.getSuggestedPurchasePrice(basePrice, conv);
  }

  /** Called on blur of price_override_ to confirm manual overrides that differ from the conventional value. */
  protected async onPriceOverrideBlur(control: AbstractControl | null | undefined): Promise<void> {
    const group = control as FormGroup | null;
    if (!group) return;

    const state = this.purchaseOptionState_.get(group) || { overrideConfirmed: false };
    const conventional = this.getConventionalPriceForGroup_(group);
    const current = group.get('price_override_')?.value;
    const epsilon = 0.0001;

    // If empty or NaN, snap back to conventional and clear override
    if (current === null || current === '' || isNaN(Number(current))) {
      group.get('price_override_')?.setValue(conventional, { emitEvent: false });
      state.overrideConfirmed = false;
      this.purchaseOptionState_.set(group, state);
      return;
    }

    const numericCurrent = Number(current);

    // If essentially equal to conventional, treat as non-override
    if (Math.abs(numericCurrent - conventional) <= epsilon) {
      state.overrideConfirmed = false;
      this.purchaseOptionState_.set(group, state);
      return;
    }

    const confirmed = await this.confirmModal.open('save_price_confirm', {
      title: 'save_price'
    });
    if (confirmed) {
      state.overrideConfirmed = true;
      this.purchaseOptionState_.set(group, state);
    } else {
      group.get('price_override_')?.setValue(conventional, { emitEvent: false });
      state.overrideConfirmed = false;
      this.purchaseOptionState_.set(group, state);
    }
  }


  private hydrateForm(data: Product): void {
    this.isEditMode_.set(true);
    this.curProduct_.set(data);

    const legacy = data as unknown as { category_?: string; is_dairy_?: boolean };
    const categories_ = data.categories_ ?? (legacy.category_ ? [legacy.category_] : []);
    const withDairy = legacy.is_dairy_ && !categories_.includes('dairy')
      ? [...categories_, 'dairy']
      : categories_;

    this.productForm_.patchValue({
      productName: data.name_hebrew,
      base_unit_: data.base_unit_,
      buy_price_global_: data.buy_price_global_,
      categories_: withDairy,
      supplierIds_: data.supplierIds_ ?? [],
      min_stock_level_: data.min_stock_level_ ?? 0,
      expiry_days_default_: data.expiry_days_default_ ?? 0,
      yield_factor_: data.yield_factor_,
      waste_percent_: Math.round((1 - data.yield_factor_) * 100),
      allergens_: data.allergens_ || []
    });

    if ((data.min_stock_level_ ?? 0) > 0) this.expandedMinStock_.set(true);
    if ((data.expiry_days_default_ ?? 0) > 0) this.expandedExpiryDays_.set(true);
    if (Math.abs((data.yield_factor_ ?? 1) - 1) > 0.001) this.expandedWasteYield_.set(true);
    if ((data.allergens_?.length ?? 0) > 0) this.expandedAllergens_.set(true);
    if ((data.supplierIds_?.length ?? 0) > 0) this.expandedSupplier_.set(true);

    this.purchaseOptions_.clear();

    if (data.purchase_options_ && data.purchase_options_.length > 0) {
      data.purchase_options_.forEach(opt => {
        this.addPurchaseOption(opt);
      });
    }
  }
  protected onSubmit(): void {
    if (!this.productForm_.valid) {
      this.productForm_.markAllAsTouched();
      this.userMsgService.onSetErrorMsg('יש למלא את כל השדות הנדרשים (שם הפריט, יחידה, מחיר)');
      return;
    }
    const val = this.productForm_.getRawValue();
    const categories = (val.categories_ ?? []) as string[];
    categories.forEach(cat => this.metadataRegistry.registerCategory(cat));

    const productToSave: Product = {
      ...this.curProduct_()!,
      name_hebrew: val.productName,
      base_unit_: val.base_unit_,
      buy_price_global_: val.buy_price_global_,
      categories_: categories,
      supplierIds_: val.supplierIds_ ?? [],
      min_stock_level_: val.min_stock_level_ ?? 0,
      expiry_days_default_: val.expiry_days_default_ ?? 0,
      yield_factor_: val.yield_factor_,
      allergens_: val.allergens_,
      purchase_options_: val.purchase_options_
    };

    this.isSaving_.set(true);
    this.kitchenStateService.saveProduct(productToSave).subscribe({
      next: () => {
        this.isSaving_.set(false);
        this.isSubmitted = true;
        this.router.navigate(['/inventory/list']);
      },
      error: () => {
        this.isSaving_.set(false);
        this.isSubmitted = false;
      }
    });
  }

  protected onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }

  //DELETE
  protected onDeletePurchaseOption(idx: number): void {
    this.purchaseOptions_.removeAt(idx);
    this.productForm_.markAsDirty();
  }

}