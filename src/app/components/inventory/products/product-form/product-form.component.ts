import { Component, inject, OnInit, signal, computed, input } from '@angular/core';
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

@Component({
  selector: 'product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FormsModule, ClickOutSideDirective],
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
  private readonly unitRegistry = inject(UnitRegistryService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  // RESTORED UI SIGNALS

  protected readonly categoryOptions_ = computed(() => this.metadataRegistry.allCategories_()); // Metadata [cite: 1]
  protected availableUnits_ = computed(() => this.unitRegistry.allUnits_());
  protected allergenOptions_ = computed(() => this.metadataRegistry.allAllergens_());
  protected isModalOpen_ = signal(false);
  protected isEditMode_ = signal<boolean>(false);
  protected curProduct_ = signal<Product | null>(null);
  protected selectedAllergensSignal_ = signal<string[]>([]);

  // RESTORED MODAL STATE
  protected newUnitName_ = '';
  protected newUnitValue_ = 1;
  protected basisUnit_ = 'g';
  protected customBasisName_ = '';
  protected showSuggestions = false;
  protected productForm_!: FormGroup;

  protected netUnitCost_ = computed(() => {
    const price = this.productForm_?.get('buy_price_global_')?.value || 0;
    const yieldFactor = this.productForm_?.get('yield_factor_')?.value || 1;
    return yieldFactor > 0 ? price / yieldFactor : 0;
  });

  protected filteredAllergenOptions_ = computed(() => {
    const all = this.metadataRegistry.allAllergens_();
    const selected = this.selectedAllergensSignal_() || [];
    return all.filter(allergen => !selected.includes(allergen));
  });

  ngOnInit(): void {
    this.initForm();
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
          this.productForm_.patchValue({ base_unit_: 'grams' });
        }
      });
    }
  }

  private initForm(): void {
    this.productForm_ = this.fb_.group({
      productName: ['', [Validators.required]],
      base_unit_: ['grams', Validators.required],
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

    percentCtrl?.valueChanges.subscribe(pct => {
      const calculatedYield = (100 - pct) / 100;
      if (yieldCtrl?.value !== calculatedYield) {
        yieldCtrl?.setValue(calculatedYield, { emitEvent: false });
      }
    });
  }

  // RESTORED MODAL ACTIONS
  protected onUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'NEW_UNIT') {
      this.isModalOpen_.set(true);
      select.value = '';
    }
  }

  protected closeModal(): void {
    this.isModalOpen_.set(false);
    this.newUnitName_ = '';
    this.newUnitValue_ = 1;
  }

  protected saveNewUnit(): void {
    if (this.newUnitName_ && this.newUnitValue_ > 0) {
      this.unitRegistry.registerUnit(this.newUnitName_, this.newUnitValue_);
      this.addPurchaseOption({
        unit_symbol_: this.newUnitName_,
        conversion_rate_: this.newUnitValue_
      });
      this.closeModal();
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

  get purchaseOptions_(): FormArray {
    return this.productForm_.get('purchase_options_') as FormArray;
  }

  protected addPurchaseOption(opt?: Partial<PurchaseOption_>): void {
    const unit = opt?.unit_symbol_ || '';
    const conv = opt?.conversion_rate_ || 1;
    const globalPrice = this.productForm_.get('buy_price_global_')?.value || 0;

    const currentBaseUnit = this.productForm_.get('base_unit_')?.value || 'grams';

    const group = this.fb_.group({
      unit_symbol_: [unit, Validators.required],
      conversion_rate_: [conv, [Validators.required, Validators.min(0.0001)]],
      uom: [opt?.uom || currentBaseUnit, Validators.required],
      price_override_: [opt?.price_override_ || (globalPrice * conv)]
    });

    group.get('unit_symbol_')?.valueChanges.subscribe((newUnit: string | null) => {
      if (!newUnit) return;
      const suggestedConv = this.unitRegistry.getConversion(newUnit);
      const currentGlobal = this.productForm_.get('buy_price_global_')?.value || 0;
      group.patchValue({
        conversion_rate_: suggestedConv,
        price_override_: currentGlobal * suggestedConv
      }, { emitEvent: false });
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
          this.userMsgService.onSetSuccessMsg('המוצר נשמר בהצלחה');
          this.router.navigate(['/inventory/list']);
        }
      });
    }
  }

  protected onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }
}