import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ItemDataService } from '@services/items-data.service';
import { ConversionService } from '@services/conversion.service';
import { Router } from '@angular/router';
import { UserMsgService } from '@services/user-msg.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  private readonly fb_ = inject(FormBuilder);
  private readonly itemDataService = inject(ItemDataService);
  private readonly conversionService = inject(ConversionService);
  private readonly userMsgService = inject(UserMsgService);
  private readonly router = inject(Router);

  // Signals
  protected availableUnits_ = signal<string[]>(['Bucket', 'Case', 'Bag', 'Bottle', 'Unit']);
  protected isModalOpen_ = signal(false);
  protected productForm_!: FormGroup;
  
  // Modal Fields
  protected newUnitName_ = '';
  protected newUnitValue_ = 1;
  protected basisUnit_ = 'g';
  protected customBasisName_ = '';

  /**
   * סיגנל מחושב שמציג את המחיר נטו ליחידה בזמן אמת.
   * שואב נתונים מהטופס ומעבד אותם דרך ה-Service.
   */
  protected netUnitCost_ = computed(() => {
    const props = this.productForm_?.get('properties')?.value;
    if (!props) return 0;

    return this.conversionService.calculateNetCost(
      props.gross_price_ || 0,
      props.conversion_factor_ || 0,
      props.waste_percent_ || 0
    );
  });

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
      const rawProduct = {
        ...this.productForm_.value,
        updatedAt: new Date().toISOString()
      };
      this.saveProduct(rawProduct);
    }
  }

  private async saveProduct(product: any): Promise<void> {
    try {
      await this.itemDataService.addItem(product);
      this.userMsgService.onSetSuccessMsg('פריט נשמר בהצלחה!');
      this.router.navigate(['/inventory/list']);
    } catch (error) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת הפריט');
      console.error(error);
    }
  }
}