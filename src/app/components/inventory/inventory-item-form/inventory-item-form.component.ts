import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IngredientDataService } from '../../../core/services/ingredient-data.service';
import type { IngredientLedger, TripleUnitConversion } from '../../../core/models/ingredient.model';

const defaultUnitConversion: TripleUnitConversion = {
  purchase: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  inventory: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  recipe: { symbol: 'g', label: 'Grams', factorToInventory: 0.001 },
};

@Component({
  selector: 'app-inventory-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory-item-form.component.html',
  styleUrl: './inventory-item-form.component.scss'
})
export class InventoryItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ingredientDataService = inject(IngredientDataService);

  ingredientForm: FormGroup;
  isEditing = signal<boolean>(false);
  ingredientId: string | null = null;

  constructor() {
    this.ingredientForm = this.fb.group({
      name: ['', Validators.required],
      allergenIds: [''],
      properties: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ingredientId = params.get('id');
      if (this.ingredientId) {
        this.isEditing.set(true);
        const ingredient = this.ingredientDataService.getIngredientById(this.ingredientId);
        if (ingredient) {
          this.ingredientForm.patchValue({
            name: ingredient.name,
            allergenIds: ingredient.allergenIds ? ingredient.allergenIds.join(', ') : '',
          });
          if (ingredient.properties) {
            for (const key in ingredient.properties) {
              if (ingredient.properties.hasOwnProperty(key)) {
                ingredient.properties[key].forEach(value => {
                  this.properties.push(this.fb.group({
                    key: [key, Validators.required],
                    value: [value, Validators.required]
                  }));
                });
              }
            }
          }
        }
      }
    });
  }

  get properties(): FormArray {
    return this.ingredientForm.get('properties') as FormArray;
  }

  addProperty(): void {
    this.properties.push(this.fb.group({
      key: ['', Validators.required],
      value: ['', Validators.required]
    }));
  }

  removeProperty(index: number): void {
    this.properties.removeAt(index);
  }

  onSubmit(): void {
    if (this.ingredientForm.valid) {
      const formValue = this.ingredientForm.value;
      const newProperties: { [key: string]: string[] } = {};
      formValue.properties.forEach((prop: { key: string, value: string }) => {
        if (!newProperties[prop.key]) {
          newProperties[prop.key] = [];
        }
        newProperties[prop.key].push(prop.value);
      });

      const ingredient: IngredientLedger = {
        id: this.isEditing() && this.ingredientId ? this.ingredientId : `ing_${Date.now()}`,
        name: formValue.name,
        units: defaultUnitConversion, // Using default for now
        allergenIds: formValue.allergenIds ? formValue.allergenIds.split(',').map((s: string) => s.trim()) : [],
        properties: newProperties,
      };

      if (this.isEditing()) {
        this.ingredientDataService.updateIngredient(ingredient);
      } else {
        this.ingredientDataService.addIngredient(ingredient);
      }
      this.router.navigate(['/inventory/list']);
    }
  }

  onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }
}
