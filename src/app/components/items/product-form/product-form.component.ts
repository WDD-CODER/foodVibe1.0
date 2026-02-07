import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ItemDataService } from '@services/items-data.service';
import { ConversionService } from '@services/conversion.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserMsgService } from '@services/user-msg.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Product } from '@models/product.model';
import { KitchenUnit } from '@models/units.enum';
interface ProductFormValue {
  itemName: string;
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
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  // // INJECTIONS
  private readonly fb_ = inject(FormBuilder);
  private readonly itemDataService = inject(ItemDataService);
  private readonly conversionService = inject(ConversionService);
  private readonly userMsgService = inject(UserMsgService);
  private readonly router = inject(Router);
  private route = inject(ActivatedRoute);
  private kitchenStateService = inject(KitchenStateService);

  // Signals
  protected availableUnits_ = signal<string[]>(['Bucket', 'Case', 'Bag', 'Bottle', 'Unit']);
  protected isModalOpen_ = signal(false);
  protected productForm_!: FormGroup;
  protected isEditMode_ = signal<boolean>(false);
  protected initialItem_ = signal<Product | null>(null);

  // Modal Fields
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

// // INITIALIZATION
constructor() {
  const id = this.route.snapshot.paramMap.get('id');
  
  if (id) {
    this.isEditMode_.set(true);
    const item = this.kitchenStateService.products_().find(p => p._id === id);
    if (item) {
      this.initialItem_.set(item);
      
      effect(() => {
        const data = this.initialItem_();
        if (data && this.productForm_) {
          // FIX: Aligning keys with the initForm() definition
          this.productForm_.patchValue({
            itemName: data.name_hebrew, // Corrected from name_hebrew
            properties: {
              topCategory: data.category_,
              gross_price_: data.purchase_price_,
              conversion_factor_: data.conversion_factor_,
              uom: data.base_unit_ || 'g'
            }
          });
          console.log('Form Patched with Single Source of Truth:', data.name_hebrew);
        }
      });
    }
  }
}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.productForm_ = this.fb_.group({
      itemName: ['', [Validators.required, Validators.minLength(2)]],
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

  /**
   * סינכרון שדות הפחת (כמות/אחוז) באמצעות ה-Service
   */
  private setupWasteLogic(): void {
    const props = this.productForm_.get('properties') as FormGroup;
    const percentCtrl = props.get('waste_percent_');
    const qtyCtrl = props.get('waste_quantity_');
    const convCtrl = props.get('conversion_factor_');

    // אחוז משתנה -> עדכון כמות
    percentCtrl?.valueChanges.subscribe(pct => {
      const newQty = this.conversionService.getWasteQuantity(pct, convCtrl?.value || 0);
      if (qtyCtrl?.value !== newQty) {
        qtyCtrl?.setValue(newQty, { emitEvent: false });
      }
    });

    // כמות משתנה -> עדכון אחוז
    qtyCtrl?.valueChanges.subscribe(qty => {
      const newPct = this.conversionService.getWastePercent(qty, convCtrl?.value || 0);
      if (percentCtrl?.value !== newPct) {
        percentCtrl?.setValue(newPct, { emitEvent: false });
      }
    });

    // שינוי בכמות הכללית -> עדכון הכמות היחסית של הפחת לפי האחוז הקיים
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

  protected onSubmit(): void {
   if (this.productForm_.valid) {
    // Cast the raw value to our strict interface
    const typedValue = this.productForm_.getRawValue() as ProductFormValue;
    this.saveProduct(typedValue);
  }
  }

// // CREATE / UPDATE / DELETE
private async saveProduct(formData: ProductFormValue): Promise<void> {
  try {
    const initial = this.initialItem_();
    console.log("🚀 ~ ProductFormComponent ~ saveProduct ~ initial:", initial)

    // Now TypeScript knows exactly what is inside formData
    const productToSave: Product = {
      ...initial!, 
      _id: initial!._id, 
      name_hebrew: formData.itemName,
      category_: formData.properties.topCategory,
      purchase_price_: formData.properties.gross_price_,
      purchase_unit_: formData.properties.purchase_unit_ as KitchenUnit,
      conversion_factor_: formData.properties.conversion_factor_,
      base_unit_: formData.properties.uom as KitchenUnit,
      // yield_factor calculation is now protected by type-safe numbers
      yield_factor_: (100 - formData.properties.waste_percent_) / 100 
    };

    if (this.isEditMode_()) {
      this.kitchenStateService.updateProduct(productToSave).subscribe({
        next: () => this.handleNavigationSuccess(),
        error: () => this.userMsgService.onSetErrorMsg('שגיאה בעדכון המוצר')
      });
    } else {
      // For Add mode, we pass the typed data
      // כרגע הבעיה שלי היא פה שאני מקבל ערך ריק ובעצם הפונקציה לא מראה שהיא מצאה באמת את המוצר שאנחנו רוצים לערוך ולא מחלאה גם את כל המידע שלו !
      
      console.log("🚀 ~ ProductFormComponent ~ saveProduct ~ formData:", formData)
      // await this.itemDataService.addItem(formData);
      // this.handleNavigationSuccess();
    }
  } catch (error) {
    throw new Error('Critical Failure in Product Save Protocol'); // Use Station Protocol Error Handling
  }
}

private handleNavigationSuccess(): void {
  this.userMsgService.onSetSuccessMsg('המוצר נשמר בהצלחה [cite: 28]');
  this.router.navigate(['/inventory/list']);
}
}