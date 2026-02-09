import { Component, inject, OnInit, signal, computed, input, Signal, runInInjectionContext, Injector, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';

import { ProductDataService } from '@services/product-data.service';
import { ConversionService } from '@services/conversion.service';
import { UserMsgService } from '@services/user-msg.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Product, PurchaseOption_ } from '@models/product.model';
import { ClickOutSideDirective } from "@directives/click-out-side";
import { UtilService } from '@services/util.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { UnitCreatorModal } from '@components/shared/unit-creator-modal/unit-creator.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { KitchenUnit } from '@models/units.enum';

@Component({
  selector: 'product-form',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    FormsModule,
    ClickOutSideDirective,
    SelectOnFocusDirective,
    TranslatePipe
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  initialProduct_ = input<Product | null>(null);

  private readonly fb_ = inject(FormBuilder);
  private readonly conversionService = inject(ConversionService);
  private readonly userMsgService = inject(UserMsgService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitchenStateService = inject(KitchenStateService);
  private readonly utilService = inject(UtilService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  private readonly injector = inject(Injector);

  unitRegistry = inject(UnitRegistryService);
  // RESTORED UI SIGNALS

  protected readonly categoryOptions_ = computed(() => this.metadataRegistry.allCategories_());
  protected availableUnits_ = computed(() => this.unitRegistry.allUnitKeys_());
  protected allergenOptions_ = computed(() => this.metadataRegistry.allAllergens_());
  protected isEditMode_ = signal<boolean>(false);
  protected curProduct_ = signal<Product | null>(null);
  protected selectedAllergensSignal_ = signal<string[]>([]);
  protected activeRowIndex_ = signal<number | null>(null);
  // protected isUnitModalOpen_ = signal(false);
  protected isBaseUnitMode_ = signal(false);

  private formValue_!: Signal<any>
  protected showSuggestions = false;
  protected productForm_!: FormGroup;
  protected readonly KitchenUnit = KitchenUnit;
  
  protected netUnitCost_ = computed(() => {
    if (!this.formValue_) return 0;

    const currentForm = this.formValue_();
    const price = currentForm?.buy_price_global_ || 0;
    const yieldFactor = currentForm?.yield_factor_ || 1;

    return yieldFactor > 0 ? price / yieldFactor : 0;
  });

  protected filteredAllergenOptions_ = computed(() => {
    const all = this.metadataRegistry.allAllergens_();
    const selected = this.selectedAllergensSignal_() || [];
    return all.filter(allergen => !selected.includes(allergen));
  });


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

    this.productForm_.get('allergens_')?.valueChanges.subscribe(val => {
      this.selectedAllergensSignal_.set(val || []);
    });

    const productData = this.initialProduct_();
    if (productData) {
      this.hydrateForm(productData);
    } else {
      this.route.data.subscribe(({ product }) => {
        if (product) {
          this.hydrateForm(product);
        } else {
          this.isEditMode_.set(false);
          this.curProduct_.set(this.utilService.getEmptyProduct());
          this.productForm_.patchValue({ base_unit_: KitchenUnit.GRAM })
        }
      });
    }
  }

  private initForm(): void {
    this.productForm_ = this.fb_.group({
      productName: ['', [Validators.required]],
      base_unit_: ['gram', Validators.required],
      buy_price_global_: [0, [Validators.required, Validators.min(0)]],
      category_: ['', Validators.required],
      yield_factor_: [1, [Validators.required]],
      waste_percent_: [0, [Validators.min(0), Validators.max(100)]],
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
    percentCtrl?.valueChanges.subscribe(pct => {
      const { yieldFactor } = this.conversionService.handleWasteChange(pct);

      // Only update if the value is actually different to avoid loops 
      if (yieldCtrl?.value !== yieldFactor) {
        yieldCtrl?.setValue(yieldFactor, { emitEvent: false });
        this.productForm_.get('buy_price_global_')?.updateValueAndValidity(); // Force price recalc
      }
    });

    yieldCtrl?.valueChanges.subscribe(y => {
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

  protected onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'NEW_CATEGORY') {
      const newCat = prompt('הכנס שם קטגוריה חדשה:'); // Simple prompt for now
      if (newCat) {
        this.metadataRegistry.registerCategory(newCat);
        this.productForm_.get('category_')?.setValue(newCat);
      }
      select.value = '';
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

  // protected handleNewUnitSaved(data: { symbol: string, rate: number }): void {
  //   if (this.isBaseUnitMode_()) {
  //     // Mode A: Update the Base Unit control
  //     this.productForm_.get('base_unit_')?.setValue(data.symbol);
  //     this.isBaseUnitMode_.set(false);
  //   } else {
  //     // Mode B: Update a Purchase Option row (your existing logic)
  //     const index = this.activeRowIndex_();
  //     if (index !== null) {
  //       this.purchaseOptions_.at(index).patchValue({
  //         unit_symbol_: data.symbol,
  //         conversion_rate_: data.rate
  //       });
  //     }
  //   }

  //   this.userMsgService.onSetSuccessMsg(`היחידה "${data.symbol}" נרשמה כבסיס חדש במערכת`);
  //   this.isUnitModalOpen_.set(false);
  // }

  protected toggleAllergen(allergen: string): void {
    const ctrl = this.productForm_.get('allergens_');
    const current = ctrl?.value || [];
    const updated = current.includes(allergen)
      ? current.filter((a: string) => a !== allergen)
      : [...current, allergen];

    ctrl?.setValue(updated);
    ctrl?.markAsDirty();
  }


  //GETERS
  get purchaseOptions_(): FormArray {
    return this.productForm_.get('purchase_options_') as FormArray;
  }

  protected addPurchaseOption(opt?: Partial<PurchaseOption_>): void {
    const unit = opt?.unit_symbol_ || '';
    const conv = opt?.conversion_rate_ || 1;
    const globalPrice = this.productForm_.get('buy_price_global_')?.value || 0;

    const currentBaseUnit = this.productForm_.get('base_unit_')?.value || 'gram';

    const group = this.fb_.group({
      unit_symbol_: [unit, Validators.required],
      conversion_rate_: [conv, [Validators.required, Validators.min(0.0001)]],
      uom: [opt?.uom || currentBaseUnit, Validators.required], // 👈 This will now match an option in the @for loop
      price_override_: [opt?.price_override_ || (globalPrice * conv)]
    });

    group.get('unit_symbol_')?.valueChanges.subscribe((newUnit: string | null) => {
      if (!newUnit) return;

      const suggestedConv = this.unitRegistry.getConversion(newUnit);
      const currentGlobal = this.productForm_.get('buy_price_global_')?.value || 0;

      // 1. Get the actual base unit selected at the top of the form (e.g., 'grams')
      const currentBaseUnit = this.productForm_.get('base_unit_')?.value || 'gram';

      const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(currentGlobal, suggestedConv);

      // 2. Patch the row so the "UOM" (middle dropdown) is no longer empty
      group.patchValue({
        conversion_rate_: suggestedConv,
        uom: currentBaseUnit, // 👈 This fills the empty slot next to 5000
        price_override_: suggestedPrice
      }, { emitEvent: false });

      // 3. Mark for check to ensure the UI refreshes the calculation
      group.get('price_override_')?.markAsDirty();
    });

    group.get('conversion_rate_')?.valueChanges.subscribe((newConv: number | null) => {
      if (newConv === null) return;
      const currentGlobal = this.productForm_.get('buy_price_global_')?.value || 0;
      group.get('price_override_')?.setValue(currentGlobal * newConv, { emitEvent: false });
    });

    this.purchaseOptions_.push(group);
  }

  private hydrateForm(data: Product): void {
    this.isEditMode_.set(true);
    this.curProduct_.set(data);
    this.productForm_.patchValue({
      productName: data.name_hebrew,
      base_unit_: data.base_unit_,
      buy_price_global_: data.buy_price_global_,
      category_: data.category_,
      yield_factor_: data.yield_factor_,
      waste_percent_: Math.round((1 - data.yield_factor_) * 100),
      allergens_: data.allergens_ || []
    });

    this.purchaseOptions_.clear();
    data.purchase_options_?.forEach(opt => this.addPurchaseOption(opt));
  }

  protected onSubmit(): void {
    if (this.productForm_.valid) {
      const val = this.productForm_.getRawValue();

      // 3. Ensure the Metadata Registry learns the category if it's new
      this.metadataRegistry.registerCategory(val.category_);

      const productToSave: Product = {
        ...this.curProduct_()!,
        name_hebrew: val.productName,
        base_unit_: val.base_unit_,
        buy_price_global_: val.buy_price_global_,
        category_: val.category_,
        yield_factor_: val.yield_factor_,
        allergens_: val.allergens_,
        purchase_options_: val.purchase_options_
      };

      this.kitchenStateService.saveProduct(productToSave).subscribe({
        next: () => {
          this.router.navigate(['/inventory/list']);
        }
      });
    }
  }

  protected onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }
}