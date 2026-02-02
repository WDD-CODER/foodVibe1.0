import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemDataService } from '../../../core/services/ingredient-data.service';
import type { ItemLedger, TripleUnitConversion } from '../../../core/models/ingredient.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClickOutsideDirective } from '../../../directives/click-out-side.directive';

const defaultUnitConversion: TripleUnitConversion = {
  purchase: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  inventory: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  recipe: { symbol: 'g', label: 'Grams', factorToInventory: 0.001 },
};

@Component({
  selector: 'app-inventory-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClickOutsideDirective],
  templateUrl: './inventory-item-form.component.html',
  styleUrl: './inventory-item-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected itemDataService = inject(ItemDataService);

  itemForm: FormGroup;
  isEditing = signal<boolean>(false);
  itemId: string | null = null;
  
  showItemDropdown = signal<boolean>(false);
  searchItems = signal<ItemLedger[]>([]);
  selectedAllergens = signal<string[]>([]);
  showAllergenDropdown = signal<boolean>(false);
  selectedTopCategories = signal<string[]>([]);
  showTopCategoryDropdown = signal<boolean>(false);

  constructor() {
    this.itemForm = this.fb.group({
      itemName: ['', Validators.required],
      topCategory: ['', Validators.required],
      properties: this.fb.array([]),
    });

    this.itemForm.get('itemName')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => this.onItemNameInput(value));
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.itemId = params.get('id');
      if (this.itemId) this.loadItem(this.itemId);
    });
  }

  private loadItem(id: string): void {
    const item = this.itemDataService.getItemById(id);
    if (!item) return;

    this.isEditing.set(true);
    const loadedCategories = [
      ...(item.properties?.topCategory ? [item.properties.topCategory] : []),
      ...(item.properties?.subCategories ?? []),
    ].filter(Boolean);

    this.selectedTopCategories.set(loadedCategories);
    this.selectedAllergens.set(item.allergenIds || []);
    
    this.itemForm.patchValue({
      itemName: item.itemName,
      topCategory: loadedCategories.length ? 'selected' : '',
    });

    this.properties.clear();
    if (item.properties) {
      Object.entries(item.properties).forEach(([key, values]) => {
        if (key === 'topCategory' || key === 'subCategories') return;
        const vals = Array.isArray(values) ? values : [values];
        vals.forEach(v => this.properties.push(this.createPropertyFormGroup(key, v as string)));
      });
    }
  }

  get properties(): FormArray {
    return this.itemForm.get('properties') as FormArray;
  }

  createPropertyFormGroup(key = '', value = ''): FormGroup {
    return this.fb.group({
      key: [key, Validators.required],
      value: [value, Validators.required]
    });
  }

  onItemNameInput(value: string): void {
    if (value?.length > 0) {
      this.searchItems.set(this.itemDataService.allItems().filter(i => 
        i.itemName.toLowerCase().includes(value.toLowerCase())));
      this.showItemDropdown.set(true);
    } else {
      this.showItemDropdown.set(false);
    }
  }

  selectExistingItem(item: ItemLedger): void {
    this.loadItem(item.id);
    this.showItemDropdown.set(false);
  }

  toggleAllergen(allergen: string): void {
    this.selectedAllergens.update(current => 
      current.includes(allergen) ? current.filter(a => a !== allergen) : [...current, allergen]);
  }

  toggleTopCategory(category: string): void {
    this.selectedTopCategories.update(current => 
      current.includes(category) ? current.filter(c => c !== category) : [...current, category]);
    this.itemForm.get('topCategory')?.setValue(this.selectedTopCategories().length ? 'selected' : '');
  }

  addProperty(): void { this.properties.push(this.createPropertyFormGroup()); }
  removeProperty(index: number): void { this.properties.removeAt(index); }

  onSubmit(): void {
    if (this.itemForm.invalid) return;
    const formValue = this.itemForm.value;
    const cats = this.selectedTopCategories();
    
    const item: ItemLedger = {
      id: this.isEditing() && this.itemId ? this.itemId : `item_${Date.now()}`,
      itemName: formValue.itemName,
      units: defaultUnitConversion,
      allergenIds: this.selectedAllergens(),
      properties: {
        topCategory: cats[0] || '',
        subCategories: cats.slice(1),
        ...formValue.properties.reduce((acc: any, p: any) => {
          acc[p.key] = acc[p.key] ? [...acc[p.key], p.value] : [p.value];
          return acc;
        }, {})
      }
    };

    this.isEditing() ? this.itemDataService.updateItem(item) : this.itemDataService.addItem(item);
    this.router.navigate(['/inventory/list']);
  }

  onCancel(): void { this.router.navigate(['/inventory/list']); }
}