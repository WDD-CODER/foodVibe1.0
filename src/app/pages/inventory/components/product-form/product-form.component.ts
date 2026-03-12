import { Component, inject, OnInit, signal, computed, input, Signal, runInInjectionContext, Injector, effect, ViewChildren, QueryList, ElementRef, AfterViewChecked, AfterViewInit, ViewChild, DestroyRef } from '@angular/core';
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
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service';
import { AddSupplierFlowService } from '@services/add-supplier-flow.service';
import { LoggingService } from '@services/logging.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { duplicateNameValidator } from 'src/app/core/validators/item.validators';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

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
    LoaderComponent,
    ScrollableDropdownComponent,
    CustomSelectComponent
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})

export class ProductFormComponent implements OnInit, AfterViewInit, AfterViewChecked {
  initialProduct_ = input<Product | null>(null);

  @ViewChild('productNameInput') private productNameInputRef?: ElementRef<HTMLInputElement>;

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
  private readonly logging = inject(LoggingService);

  unitRegistry = inject(UnitRegistryService);
  @ViewChildren('categoryDropdownItem') categoryDropdownItems!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('categoryTrigger') categoryTriggerQuery!: QueryList<ElementRef<HTMLElement>>;
  get categoryTriggerRef(): ElementRef<HTMLElement> | undefined { return this.categoryTriggerQuery?.first; }
  @ViewChildren('supplierDropdownItem') supplierDropdownItems!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('supplierTrigger') supplierTriggerQuery!: QueryList<ElementRef<HTMLElement>>;
  get supplierTriggerRef(): ElementRef<HTMLElement> | undefined { return this.supplierTriggerQuery?.first; }
  // RESTORED UI SIGNALS

  protected readonly categoryOptions_ = computed(() => this.metadataRegistry.allCategories_());
  protected readonly suppliers_ = computed(() => this.kitchenStateService.suppliers_());
  protected availableUnits_ = computed(() => this.unitRegistry.allUnitKeys_());
  protected baseUnitOptions_ = computed(() => [
    ...this.unitRegistry.allUnitKeys_().map((k) => ({ value: k, label: k })),
    { value: 'NEW_UNIT', label: 'add_new_unit' },
  ]);
  protected unitSymbolOptions_ = computed(() => [
    { value: '', label: 'choose_unit' },
    ...this.availableUnits_().map((u) => ({ value: u, label: u })),
    { value: 'NEW_UNIT', label: 'add_new_unit' },
  ]);
  protected uomOptions_ = computed(() =>
    this.availableUnits_().map((u) => ({ value: u, label: u }))
  );
  protected allergenOptions_ = computed(() => this.metadataRegistry.allAllergens_());
  protected isEditMode_ = signal<boolean>(false);
  protected isSaving_ = signal(false);
  protected curProduct_ = signal<Product | null>(null);
  protected isBaseUnitMode_ = signal(false);

  //SIMPLE VALUES
  private formValue_!: Signal<any>
  protected showSuggestions = false;
  protected productForm_!: FormGroup;
  /** Snapshot of form value when user entered the item (for hasRealChanges). */
  private initialFormSnapshot_: string | null = null;
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
  protected allergenDropdownHighlightIndex_ = signal(-1);

  protected showCategoryDropdown_ = signal(false);
  protected showSupplierDropdown_ = signal(false);
  protected categoryDropdownHighlightIndex_ = signal(-1);
  protected supplierDropdownHighlightIndex_ = signal(-1);
  private categoryDropdownFocusPending_ = false;
  private supplierDropdownFocusPending_ = false;

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

  ngAfterViewInit(): void {
    setTimeout(() => this.productNameInputRef?.nativeElement?.focus(), 0);
  }

  ngAfterViewChecked(): void {
    if (this.categoryDropdownFocusPending_ && this.showCategoryDropdown_()) {
      this.categoryDropdownFocusPending_ = false;
      const idx = this.categoryDropdownHighlightIndex_();
      const items = this.categoryDropdownItems;
      if (items?.length && idx >= 0 && idx < items.length) {
        (items.get(idx) as ElementRef<HTMLElement>)?.nativeElement?.focus();
      }
    }
    if (this.supplierDropdownFocusPending_ && this.showSupplierDropdown_()) {
      this.supplierDropdownFocusPending_ = false;
      const idx = this.supplierDropdownHighlightIndex_();
      const items = this.supplierDropdownItems;
      if (items?.length && idx >= 0 && idx < items.length) {
        (items.get(idx) as ElementRef<HTMLElement>)?.nativeElement?.focus();
      }
    }
  }

  protected onCategoryTriggerKeydown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.key !== ' ') return;
    e.preventDefault();
    this.showCategoryDropdown_.set(true);
    const total = this.filteredCategoryOptions_().length + 1;
    this.categoryDropdownHighlightIndex_.set(0);
    this.categoryDropdownFocusPending_ = true;
  }

  protected onCategoryDropdownKeydown(event: Event): void {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== ' ' && key !== 'Escape') return;
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
    } else if (key === 'Enter' || key === ' ') {
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

  protected onSupplierTriggerKeydown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.key !== ' ') return;
    e.preventDefault();
    this.showSupplierDropdown_.set(true);
    const total = this.filteredSupplierOptions_().length + 1;
    this.supplierDropdownHighlightIndex_.set(0);
    this.supplierDropdownFocusPending_ = true;
  }

  protected onSupplierKeyboardOpen(event: Event): void {
    const e = event as KeyboardEvent;
    e.preventDefault();
    this.showSupplierDropdown_.set(true);
    const total = this.filteredSupplierOptions_().length + 1;
    if (e.key === 'ArrowDown') {
      this.supplierDropdownHighlightIndex_.set(0);
      this.supplierDropdownFocusPending_ = true;
    } else if (e.key === 'ArrowUp') {
      this.supplierDropdownHighlightIndex_.set(Math.max(0, total - 1));
      this.supplierDropdownFocusPending_ = true;
    }
  }

  protected onSupplierDropdownKeydown(event: Event): void {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== ' ' && key !== 'Escape') return;
    event.preventDefault();
    const options = this.filteredSupplierOptions_();
    const total = options.length + 1;
    let idx = this.supplierDropdownHighlightIndex_();

    if (key === 'ArrowDown') {
      idx = idx < total - 1 ? idx + 1 : 0;
      this.supplierDropdownHighlightIndex_.set(idx);
      this.focusSupplierItem(idx);
    } else if (key === 'ArrowUp') {
      idx = idx > 0 ? idx - 1 : total - 1;
      this.supplierDropdownHighlightIndex_.set(idx);
      this.focusSupplierItem(idx);
    } else if (key === 'Enter' || key === ' ') {
      if (idx >= 0 && idx < options.length) {
        this.addSupplierId(options[idx]._id);
      } else if (idx === options.length) {
        this.openAddSupplier();
      }
      this.showSupplierDropdown_.set(false);
      this.supplierDropdownHighlightIndex_.set(-1);
      this.supplierTriggerRef?.nativeElement?.focus();
    } else if (key === 'Escape') {
      this.showSupplierDropdown_.set(false);
      this.supplierDropdownHighlightIndex_.set(-1);
      this.supplierTriggerRef?.nativeElement?.focus();
    }
  }

  private focusSupplierItem(index: number): void {
    setTimeout(() => {
      const items = this.supplierDropdownItems;
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
    this.unitRegistry.refreshFromStorage();
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
          this.productForm_.patchValue({ base_unit_: 'kg' });
          this.initialFormSnapshot_ = this.getFormSnapshotForComparison();
        }
      });
    }

    this.unitRegistry.unitAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(unitKey => {
      const idx = this.activeRowIndex_();
      if (idx === null || idx === undefined) return;
      const baseUnit = this.productForm_.get('base_unit_')?.value ?? '';
      const baseFactor = this.unitRegistry.getConversion(baseUnit) || 1;
      const unitFactor = this.unitRegistry.getConversion(unitKey) || 1;
      // conversion_rate_ = base units per 1 purchase unit (e.g. 0.33 kg per jar when 1 jar = 330g)
      const conversion_rate_ = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1;
      const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(
        this.productForm_.get('buy_price_global_')?.value || 0,
        conversion_rate_
      );
      const row = this.purchaseOptions_.at(idx);
      if (row) {
        row.patchValue({
          unit_symbol_: unitKey,
          uom: baseUnit,
          conversion_rate_: conversion_rate_,
          price_override_: suggestedPrice
        }, { emitEvent: false });
        this.productForm_.markAsDirty();
      }
      this.activeRowIndex_.set(null);
    });
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
      if (!isTranslationKeyResult(result)) return;
      this.translationService.updateDictionary(result.englishKey, result.hebrewLabel);
      await this.metadataRegistry.registerCategory(result.hebrewLabel);
      this.addCategory(result.englishKey);
    } catch (err) {
      this.logging.error({ event: 'inventory.product.add_category_error', message: 'Failed to add category', context: { err } });
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
    const trimmed = hebrewLabel.trim();
    try {
      let englishKey: string;
      const resolved = this.translationService.resolveAllergen(trimmed);
      if (resolved) {
        englishKey = resolved;
      } else {
        const result = await this.translationKeyModal.open(trimmed, 'allergen');
        if (!isTranslationKeyResult(result)) return;
        englishKey = result.englishKey;
        await this.metadataRegistry.registerAllergen(englishKey);
        this.translationService.updateDictionary(englishKey, result.hebrewLabel);
      }
      const current = (this.productForm_.get('allergens_')?.value || []) as string[];
      if (current.includes(englishKey)) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('allergen_already_on_product'));
        this.allergenSearchQuery_.set('');
        return;
      }
      this.toggleAllergen(englishKey);
      this.allergenSearchQuery_.set('');
    } catch (err) {
      this.logging.error({ event: 'inventory.product.add_allergen_error', message: 'Failed to add allergen', context: { err } });
    }
  }

  protected onBaseUnitValueChange(value: string): void {
    if (value === 'NEW_UNIT') {
      this.activeRowIndex_.set(null);
      this.isBaseUnitMode_.set(true);
      this.unitRegistry.openUnitCreator();
      this.productForm_.patchValue({ base_unit_: '' });
    }
  }

  protected onUnitSymbolValueChange(value: string, index: number): void {
    if (value === 'NEW_UNIT') {
      this.activeRowIndex_.set(index);
      this.isBaseUnitMode_.set(false);
      const existingSymbols = (this.purchaseOptions_.value as { unit_symbol_?: string }[])
        ?.map((o) => o?.unit_symbol_)
        ?.filter(Boolean) as string[] ?? [];
      this.unitRegistry.openUnitCreator({ existingUnitSymbols: existingSymbols });
      (this.productForm_.get('purchase_options_') as FormArray)
        ?.at(index)
        ?.patchValue({ unit_symbol_: '' });
    }
  }


  protected onAllergenSearchFocus(): void {
    this.showSuggestions = true;
    this.allergenDropdownHighlightIndex_.set(0);
  }

  protected onAllergenKeydown(event: Event): void {
    if (!this.showSuggestions) return;
    const e = event as KeyboardEvent;
    const key = e.key;
    const filtered = this.filteredAllergenOptions_();
    const hasAddNew = this.allergenSearchQuery_().trim() !== ''
      && !filtered.includes(this.allergenSearchQuery_().trim())
      && !(this.productForm_.get('allergens_')?.value as string[] || []).includes(this.allergenSearchQuery_().trim());
    const total = filtered.length + (hasAddNew ? 1 : 0);
    if (key === 'Escape') {
      event.preventDefault();
      this.showSuggestions = false;
      this.allergenDropdownHighlightIndex_.set(-1);
      return;
    }
    if (total === 0) return;

    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      event.preventDefault();
    }

    let idx = this.allergenDropdownHighlightIndex_();
    if (key === 'ArrowDown') {
      idx = idx < total - 1 ? idx + 1 : 0;
      this.allergenDropdownHighlightIndex_.set(idx);
    } else if (key === 'ArrowUp') {
      idx = idx > 0 ? idx - 1 : total - 1;
      this.allergenDropdownHighlightIndex_.set(idx);
    } else if (key === 'Enter' || key === ' ') {
      if (idx >= 0 && idx < filtered.length) {
        this.toggleAllergen(filtered[idx]);
      } else if (hasAddNew && idx === filtered.length) {
        this.onAddNewAllergen(this.allergenSearchQuery_());
      }
    }
  }

  protected toggleAllergen(allergen: string): void {
    const ctrl = this.productForm_.get('allergens_');
    const current = (ctrl?.value || []) as string[];
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
    if (current.includes(cat)) {
      this.userMsgService.onSetErrorMsg(this.translationService.translate('category_already_on_product'));
      return;
    }
    ctrl?.setValue([...current, cat]);
    ctrl?.markAsDirty();
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

  /** For pendingChangesGuard: values on this item (categories, allergens) that are not in the dictionary so we ask for English key in a modal before leaving. */
  getValuesNeedingTranslation(): string[] {
    if (!this.productForm_) return [];
    const raw = this.productForm_.getRawValue();
    const categories = (raw?.categories_ ?? []) as string[];
    const allergens = (raw?.allergens_ ?? []) as string[];
    const combined = [...categories, ...allergens]
      .map((v) => (v != null ? String(v).trim() : ''))
      .filter((v) => v !== '');
    const unique = [...new Set(combined)];
    return unique.filter((v) => !this.translationService.hasKey(v));
  }

  /** For pendingChangesGuard: remove untranslated values from categories_ and allergens_ when user chooses "continue without saving". */
  removeValuesNeedingTranslation(): void {
    if (!this.productForm_) return;
    const toRemove = this.getValuesNeedingTranslation();
    if (toRemove.length === 0) return;
    const catCtrl = this.productForm_.get('categories_');
    const allCtrl = this.productForm_.get('allergens_');
    const currentCat = ((catCtrl?.value ?? []) as string[]).filter((v) => !toRemove.includes(String(v).trim()));
    const currentAll = ((allCtrl?.value ?? []) as string[]).filter((v) => !toRemove.includes(String(v).trim()));
    catCtrl?.setValue(currentCat);
    allCtrl?.setValue(currentAll);
    catCtrl?.markAsDirty();
    allCtrl?.markAsDirty();
  }

  /** For pendingChangesGuard: true when current form value differs from initial state when user entered the item. */
  hasRealChanges(): boolean {
    if (!this.productForm_ || this.initialFormSnapshot_ === null) return this.productForm_?.dirty ?? false;
    return this.getFormSnapshotForComparison() !== this.initialFormSnapshot_;
  }

  /** Normalized form value for comparison (sorted arrays, comparable purchase_options_). */
  private getFormSnapshotForComparison(): string {
    const raw = this.productForm_.getRawValue();
    const opts = (raw?.purchase_options_ ?? []) as Array<{ unit_symbol_?: string; conversion_rate_?: number; uom?: string; price_override_?: number }>;
    const normalized = {
      productName: raw?.productName ?? '',
      base_unit_: raw?.base_unit_ ?? '',
      buy_price_global_: Number(raw?.buy_price_global_) || 0,
      categories_: [...((raw?.categories_ ?? []) as string[])].sort(),
      supplierIds_: [...(raw?.supplierIds_ ?? [])].sort(),
      min_stock_level_: Number(raw?.min_stock_level_) ?? 0,
      expiry_days_default_: Number(raw?.expiry_days_default_) ?? 0,
      yield_factor_: Number(raw?.yield_factor_) ?? 1,
      waste_percent_: Number(raw?.waste_percent_) ?? 0,
      allergens_: [...((raw?.allergens_ ?? []) as string[])].sort(),
      purchase_options_: opts
        .map((o) => ({
          unit_symbol_: o?.unit_symbol_ ?? '',
          conversion_rate_: Number(o?.conversion_rate_) ?? 0,
          uom: o?.uom ?? '',
          price_override_: Number(o?.price_override_) ?? 0
        }))
        .sort((a, b) => (a.unit_symbol_ || '').localeCompare(b.unit_symbol_ || ''))
    };
    return JSON.stringify(normalized);
  }


  protected addPurchaseOption(opt?: Partial<PurchaseOption_>): void {
    const unit = opt?.unit_symbol_ || '';
    const conv = opt ? opt.conversion_rate_ : null;
    const baseUnit = this.productForm_.get('base_unit_')?.value ?? '';
    const uomValue = opt?.uom ?? baseUnit;

    const globalPrice = this.productForm_.get('buy_price_global_')?.value || 0;

    // const currentBaseUnit = this.productForm_.get('base_unit_')?.value || '';

    const group = this.fb_.group({
      unit_symbol_: [unit, Validators.required],
      conversion_rate_: [conv, [Validators.required, Validators.min(0.0001)]],
      uom: [uomValue, Validators.required],
      show_special_price_: [!!(opt?.price_override_ != null && Number(opt?.price_override_) !== 0)],
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
      // conversion_rate_ = base units per 1 purchase unit (e.g. 0.33 kg per jar when 1 jar = 330g)
      const suggestedConv = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1;
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

    // When user unchecks "special price", clear price_override_ so the state persists on save (when they come back it stays unchecked)
    group.get('show_special_price_')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((checked: boolean | null) => {
      if (!checked) {
        group.get('price_override_')?.setValue(0, { emitEvent: false });
      }
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
      const baseUom = data.base_unit_ ?? 'gram';
      data.purchase_options_.forEach(opt => {
        this.addPurchaseOption({ ...opt, uom: opt.uom ?? baseUom });
      });
    }

    this.initialFormSnapshot_ = this.getFormSnapshotForComparison();
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

    const purchaseOptions = (val.purchase_options_ ?? []).map((opt: PurchaseOption_ & { show_special_price_?: boolean }) => {
      const { show_special_price_: _, ...rest } = opt;
      return rest as PurchaseOption_;
    });

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
      purchase_options_: purchaseOptions
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