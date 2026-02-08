import { Component, inject, OnInit, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ProductDataService } from '@services/product-data.service';
import { ConversionService } from '@services/conversion.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserMsgService } from '@services/user-msg.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Product } from '@models/product.model';
import { KitchenUnit } from '@models/units.enum';
import { ClickOutSideDirective } from "@directives/click-out-side";
import { UtilService } from '@services/util.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { FormArray } from '@angular/forms';

interface ProductFormValue {
  productName: string;
  brand?: string;
  allergenIds?: string[];
  properties: {
    topCategory: string;
    uom: string; // Base Unit (g/ml/units) [cite: 59, 101]
    purchase_unit_: string;
    conversion_factor_: number;
    gross_price_: number; // This maps to buy_price_global_ [cite: 288]
    waste_percent_: number;
    waste_quantity_: number;
  };
}

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
  private readonly productDataService = inject(ProductDataService);
  private readonly conversionService = inject(ConversionService);
  private readonly userMsgService = inject(UserMsgService);
  private readonly router = inject(Router);
  private route = inject(ActivatedRoute);
  private kitchenStateService = inject(KitchenStateService);
  private utilService = inject(UtilService);
  private unitRegistry = inject(UnitRegistryService)


  protected availableUnits_ = signal<string[]>(['Bucket', 'Case', 'Bag', 'Bottle', 'Unit']);
  protected isModalOpen_ = signal(false);
  protected productForm_!: FormGroup;
  protected isEditMode_ = signal<boolean>(false);
  protected curProduct_ = signal<Product | null>(null);

  protected newUnitName_ = '';
  protected newUnitValue_ = 1;
  protected basisUnit_ = 'g';
  protected customBasisName_ = '';

  protected netUnitCost_ = computed(() => {
    const props = this.productForm_?.get('properties')?.value;
    if (!props) return 0;

    return this.conversionService.calculateNetCost(
      props.gross_price_ || 0,
      props.conversion_factor_ || 0,
      props.waste_percent_ || 0
    );
  });

  // // LIST
  ngOnInit(): void {
    this.initForm();

    // 2. We use an 'effect' or 'ngOnInit' logic to watch the input
    // This replaces the Route.data subscription
    const productData = this.initialProduct_();

    if (productData) {
      console.log("📝 Form Hydrated via Input Binding:", productData);
      this.isEditMode_.set(true);
      this.curProduct_.set(productData);
      this.loadProductData(productData);
    } else {
      // 3. Fallback: If no input, check the Resolver just in case
      this.route.data.subscribe(({ product }) => {
        console.log("🚀 ~ ProductFormComponent ~ ngOnInit ~ product:", product)
        if (product) {
          this.isEditMode_.set(true);
          this.curProduct_.set(product);
          this.loadProductData(product);
        } else {
          this.isEditMode_.set(false);
          this.curProduct_.set(this.utilService.getEmptyProduct());
          console.log("🚀 ~ ProductFormComponent ~ ngOnInit ~ this.utilService.getEmptyProduct():", this.utilService.getEmptyProduct())
        }
      });
    }
  }

  private handleNavigationSuccess(): void {
    this.userMsgService.onSetSuccessMsg('המוצר נשמר בהצלחה ');
    this.router.navigate(['/inventory/list']);
  }

  protected onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }

  // // READ
  private loadProductData(data: Product): void {
    this.productForm_.patchValue({
      productName: data.name_hebrew,
      properties: {
        topCategory: data.category_,
        // Change data.purchase_price_ to data.buy_price_global_
        gross_price_: data.buy_price_global_,
        // Ensure these follow your new interface naming convention
        purchase_unit_: data.purchase_options_[0]?.unit_symbol_ || '',
        conversion_factor_: data.purchase_options_[0]?.conversion_rate_ || 1,
        uom: data.base_unit_ || 'g',
        waste_percent_: (1 - (data.yield_factor_ || 1)) * 100
      }
    });
  }

  // // CREATE
  private initForm(): void {
    this.productForm_ = this.fb_.group({
      productName: ['', [Validators.required]],
      brand: [''],
      base_unit_: ['g', Validators.required], // Single Source of Truth [cite: 210]
      buy_price_global_: [0, [Validators.required, Validators.min(0)]],
      category_: ['', Validators.required],
      yield_factor_: [1, [Validators.required]],
      // This array will hold our "Tomato Boxes", "Crates", etc. 
      purchase_options_: this.fb_.array([])
    });
    this.setupWasteLogic();
  }

  get purchaseOptions_(): FormArray {
    return this.productForm_.get('purchase_options_') as FormArray;
  }

 private setupWasteLogic(): void {
  // Update: These now sit directly on the root of productForm_
  const percentCtrl = this.productForm_.get('waste_percent_'); // You'll need to add this control to initForm
  const qtyCtrl = this.productForm_.get('waste_quantity_');    // You'll need to add this control to initForm
  
  // Note: For waste quantity, we usually compare it against the 'base_unit_' 
  // or a standard 1000g reference.
  const referenceMass = 1000; 

  percentCtrl?.valueChanges.subscribe(pct => {
    const newQty = (pct / 100) * referenceMass;
    if (qtyCtrl?.value !== newQty) {
      qtyCtrl?.setValue(newQty, { emitEvent: false });
    }
    // Update the yield_factor_ (100% - 10% waste = 0.9 yield)
    this.productForm_.get('yield_factor_')?.setValue((100 - pct) / 100, { emitEvent: false });
  });

  qtyCtrl?.valueChanges.subscribe(qty => {
    const newPct = (qty / referenceMass) * 100;
    if (percentCtrl?.value !== newPct) {
      percentCtrl?.setValue(newPct, { emitEvent: false });
    }
  });
}

  protected onUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'NEW_UNIT') {
      this.openNewUnitModal();
      select.value = '';
    }
  }

  protected openNewUnitModal(): void {
    console.log('variable')

    this.isModalOpen_.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen_.set(false);
    this.newUnitName_ = '';
    this.newUnitValue_ = 1;
    this.customBasisName_ = '';
  }

  protected saveNewUnit(): void {
    const finalBasis = this.basisUnit_ === 'CUSTOM_BASIS' ? this.customBasisName_ : this.basisUnit_;

    if (this.newUnitName_ && finalBasis) {
      this.availableUnits_.update(units => {
        const updated = [...units, this.newUnitName_];
        if (this.basisUnit_ === 'CUSTOM_BASIS' && !units.includes(this.customBasisName_)) {
          updated.push(this.customBasisName_);
        }
        return updated;
      });

      const props = this.productForm_.get('properties') as FormGroup;
      props.get('purchase_unit_')?.setValue(this.newUnitName_);

      this.closeModal();
    }
  }

  // // UPDATE
  protected onSubmit(): void {
    if (this.productForm_.valid) {
      const typedValue = this.productForm_.getRawValue() as ProductFormValue;
      this.saveProduct(typedValue);
    }
  }

  protected addPurchaseOption(unitSymbol: string): void {
    const conversion = this.unitRegistry.getConversion(unitSymbol);
    const globalPrice = this.productForm_.get('buy_price_global_')?.value || 0;

    // Suggested price based on global rate * conversion [cite: 78, 211]
    const suggestedPrice = globalPrice * conversion;

    const optionGroup = this.fb_.group({
      unit_symbol_: [unitSymbol, Validators.required],
      conversion_rate_: [conversion, [Validators.required, Validators.min(0.0001)]],
      price_override_: [suggestedPrice] // Editable: allows for the bulk discount [cite: 12]
    });

    this.purchaseOptions_.push(optionGroup);
  }

  private async saveProduct(formData: ProductFormValue): Promise<void> {
    try {
      const initial = this.curProduct_();
      if (!initial) throw new Error('No initial product state available');

      // BUILD THE REFACTORED PRODUCT OBJECT
      const productToSave: Product = {
        ...initial,
        name_hebrew: formData.productName,
        category_: formData.properties.topCategory,
        base_unit_: formData.properties.uom, // The "Single Source of Truth" [cite: 61, 210]
        buy_price_global_: formData.properties.gross_price_, // Unified pricing [cite: 211, 288]
        yield_factor_: (100 - formData.properties.waste_percent_) / 100, // 

        // Map the current form unit into the first slot of our new array
        purchase_options_: [
          {
            unit_symbol_: formData.properties.purchase_unit_,
            conversion_rate_: formData.properties.conversion_factor_,
            // Initially, we can leave price_override_ undefined so it uses global
          }
        ]
      };

      this.kitchenStateService.saveProduct(productToSave).subscribe({
        next: () => this.handleNavigationSuccess(),
        error: () => this.userMsgService.onSetErrorMsg('שגיאה בשמירת המוצר')
      });

    } catch (error) {
      console.error("Critical Failure in Product Save Protocol", error);
    }
  }

  // // DELETE
}