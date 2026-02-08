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

interface ProductFormValue {
  productName: string;
  brand?: string;
  allergenIds?: string[];
  properties: {
    topCategory: string;
    uom: 'g' | 'ml' | 'units';
    purchase_unit_: string;
    conversion_factor_: number;
    gross_price_: number;
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
        gross_price_: data.purchase_price_,
        purchase_unit_: data.purchase_unit_,
        conversion_factor_: data.conversion_factor_,
        uom: data.base_unit_ || 'g',
        waste_percent_: (1 - (data.yield_factor_ || 1)) * 100
      }
    });
  }

  // // CREATE
  private initForm(): void {
    this.productForm_ = this.fb_.group({
      productName: ['', [Validators.required, Validators.minLength(2)]],
      brand: [''],
      allergenIds: [[]],
      properties: this.fb_.group({
        topCategory: ['', Validators.required],
        uom: ['g', Validators.required],
        purchase_unit_: ['Unit', [Validators.required]],
        conversion_factor_: [1, [Validators.required, Validators.min(0.0001)]],
        gross_price_: [0, [Validators.required, Validators.min(0)]],
        waste_percent_: [0, [Validators.min(0), Validators.max(100)]],
        waste_quantity_: [0, [Validators.min(0)]]
      })
    });

    this.setupWasteLogic();
  }

  private setupWasteLogic(): void {
    const props = this.productForm_.get('properties') as FormGroup;
    const percentCtrl = props.get('waste_percent_');
    const qtyCtrl = props.get('waste_quantity_');
    const convCtrl = props.get('conversion_factor_');

    percentCtrl?.valueChanges.subscribe(pct => {
      const newQty = this.conversionService.getWasteQuantity(pct, convCtrl?.value || 0);
      if (qtyCtrl?.value !== newQty) {
        qtyCtrl?.setValue(newQty, { emitEvent: false });
      }
    });

    qtyCtrl?.valueChanges.subscribe(qty => {
      const newPct = this.conversionService.getWastePercent(qty, convCtrl?.value || 0);
      if (percentCtrl?.value !== newPct) {
        percentCtrl?.setValue(newPct, { emitEvent: false });
      }
    });

    convCtrl?.valueChanges.subscribe(total => {
      const pct = percentCtrl?.value || 0;
      qtyCtrl?.setValue(this.conversionService.getWasteQuantity(pct, total), { emitEvent: false });
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

  private async saveProduct(formData: ProductFormValue): Promise<void> {
    try {
      const initial = this.curProduct_();
      if (!initial) throw new Error('No initial product state available');

      const productToSave: Product = {
        ...initial,
        name_hebrew: formData.productName,
        category_: formData.properties.topCategory,
        purchase_price_: formData.properties.gross_price_,
        purchase_unit_: formData.properties.purchase_unit_ as KitchenUnit,
        base_unit_: formData.properties.uom as KitchenUnit,
        conversion_factor_: formData.properties.conversion_factor_,
        yield_factor_: (100 - formData.properties.waste_percent_) / 100
      };

      // UNIFIED SAVE PROTOCOL
      // We don't need the if/else here anymore because the 
      // KitchenStateService.saveProduct handles both branches!
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