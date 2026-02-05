import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule,  } from 'lucide-angular';

import { ItemDataService } from '@services/items-data.service';
import { ItemLedger } from '@models/ingredient.model';
import { Router } from '@angular/router';
import { UserMsgService } from '@services/user-msg.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  private readonly fb_ = inject(FormBuilder);
  private readonly itemDataService = inject(ItemDataService);
  private  userMsgService = inject(UserMsgService);
  private router = inject(Router);

  protected productForm_!: FormGroup;

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
        yieldFactor: [1, [Validators.required, Validators.min(0), Validators.max(1)]],
        uom: ['kg', Validators.required] 
      })
    });
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
      this.userMsgService.onSetSuccessMsg('Item saved!')
      this.router.navigate(['/inventory/list']);
    } catch (error) {
      this.userMsgService.onSetErrorMsg('Cant save item ')
      console.error('Failed to save ingredient:', error);
    }
  }
}