import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemDataService } from '../../../core/services/ingredient-data.service';
import type { ItemLedger, TripleUnitConversion } from '../../../core/models/ingredient.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  protected itemDataService = inject(ItemDataService);

  itemForm: FormGroup;
  isEditing = signal<boolean>(false);
  itemId: string | null = null;
  
  // Autocomplete for item name
  searchItems = signal<ItemLedger[]>([]);
  showItemDropdown = signal<boolean>(false);

  // Multi-select for allergens
  selectedAllergens = signal<string[]>([]);
  showAllergenDropdown = signal<boolean>(false);

  // Autocomplete for property keys
  propertyKeySearchTerm = signal<string>('');
  filteredPropertyKeys = signal<string[]>([]);
  selectedPropertyKeys = signal<string[]>([]); // To display selected property keys
  showPropertyKeyDropdown = signal<boolean>(false);

  // Autocomplete for top category
  topCategorySearchTerm = signal<string>('');
  filteredTopCategories = signal<string[]>([]);
  showTopCategoryDropdown = signal<boolean>(false);

  constructor() {
    this.itemForm = this.fb.group({
      itemName: ['', Validators.required],
      topCategory: ['', Validators.required],
      allergens: this.fb.array([]),
      properties: this.fb.array([]),
    });

    // Effect for item name autocomplete
    effect(() => {
      const itemNameControl = this.itemForm.get('itemName');
      if (itemNameControl) {
        itemNameControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged()
        ).subscribe(value => {
          this.onItemNameInput(value);
        });
      }
    });

    // Effect for property key autocomplete
    effect(() => {
      const propKeyControl = this.itemForm.get('newPropertyKey'); // Assuming a temporary control for new property key input
      // No direct link to properties FormArray for autocomplete. Handle it in HTML input event.
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.itemId = params.get('id');
      if (this.itemId) {
        this.isEditing.set(true);
        const item = this.itemDataService.getItemById(this.itemId);
        if (item) {
          this.itemForm.patchValue({
            itemName: item.itemName,
            topCategory: item.properties?.topCategory || '',
          });
          this.selectedAllergens.set(item.allergenIds || []);
          
          // Populate properties FormArray
          if (item.properties) {
            for (const key in item.properties) {
              if (item.properties.hasOwnProperty(key) && key !== 'topCategory' && key !== 'subCategories') {
                const values = item.properties[key];
                if (Array.isArray(values)) {
                  values.forEach(value => {
                    this.properties.push(this.createPropertyFormGroup(key, value));
                    if (!this.selectedPropertyKeys().includes(key)) {
                      this.selectedPropertyKeys.update(keys => [...keys, key]);
                    }
                  });
                } else if (typeof values === 'string') {
                  this.properties.push(this.createPropertyFormGroup(key, values));
                  if (!this.selectedPropertyKeys().includes(key)) {
                    this.selectedPropertyKeys.update(keys => [...keys, key]);
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  // Item Name Autocomplete methods
  onItemNameInput(value: string): void {
    if (value && value.length > 0) {
      this.searchItems.set(this.itemDataService.allItems().filter(item =>
        item.itemName.toLowerCase().includes(value.toLowerCase())
      ));
      this.showItemDropdown.set(true);
    } else {
      this.searchItems.set([]);
      this.showItemDropdown.set(false);
    }
  }

  selectExistingItem(item: ItemLedger): void {
    this.itemForm.patchValue({
      itemName: item.itemName,
      topCategory: item.properties?.topCategory || '',
    });
    this.selectedAllergens.set(item.allergenIds || []);
    this.properties.clear();
    this.selectedPropertyKeys.set([]);

    if (item.properties) {
      for (const key in item.properties) {
        if (item.properties.hasOwnProperty(key) && key !== 'topCategory' && key !== 'subCategories') {
          const values = item.properties[key];
          if (Array.isArray(values)) {
            values.forEach(value => {
              this.properties.push(this.createPropertyFormGroup(key, value));
              if (!this.selectedPropertyKeys().includes(key)) {
                this.selectedPropertyKeys.update(keys => [...keys, key]);
              }
            });
          } else if (typeof values === 'string') {
            this.properties.push(this.createPropertyFormGroup(key, values));
            if (!this.selectedPropertyKeys().includes(key)) {
              this.selectedPropertyKeys.update(keys => [...keys, key]);
            }
          }
        }
      }
    }
    this.showItemDropdown.set(false);
    this.isEditing.set(true); // Automatically switch to edit mode
  }

  // Allergen Multi-select methods
  toggleAllergen(allergen: string): void {
    const currentAllergens = this.selectedAllergens();
    if (currentAllergens.includes(allergen)) {
      this.selectedAllergens.set(currentAllergens.filter(a => a !== allergen));
    } else {
      this.selectedAllergens.set([...currentAllergens, allergen]);
    }
  }

  toggleAllergenDropdown(): void {
    this.showAllergenDropdown.update(val => !val);
  }

  // Dynamic Properties methods
  get properties(): FormArray {
    return this.itemForm.get('properties') as FormArray;
  }

  createPropertyFormGroup(key: string = '', value: string = ''): FormGroup {
    return this.fb.group({
      key: [key, Validators.required],
      value: [value, Validators.required]
    });
  }

  addProperty(): void {
    this.properties.push(this.createPropertyFormGroup());
  }

  removeProperty(index: number): void {
    this.properties.removeAt(index);
    // Re-evaluate selected property keys if necessary, or let it be handled on submit
  }

  // Top Category Autocomplete methods
  onTopCategoryInput(value: string): void {
    if (value && value.length > 0) {
      this.filteredTopCategories.set(this.itemDataService.allTopCategories().filter(cat =>
        cat.toLowerCase().includes(value.toLowerCase())
      ).sort());
      this.showTopCategoryDropdown.set(true);
    } else {
      this.filteredTopCategories.set([]);
      this.showTopCategoryDropdown.set(false);
    }
  }

  selectTopCategory(category: string): void {
    this.itemForm.get('topCategory')?.setValue(category);
    this.showTopCategoryDropdown.set(false);
  }

  // Property Key Autocomplete (for adding new dynamic properties)
  onPropertyKeyInput(event: Event, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;
    // Assuming a separate signal for the current property key being typed for dropdown
    // This might be better handled directly in the template with a filtered list for each property row.
    // For simplicity, let's assume the dropdown appears when user types and they select from it.
    // If no match, they can type and press 'add'.
  }

  // Submit and Cancel
  onSubmit(): void {
    if (this.itemForm.valid) {
      const formValue = this.itemForm.value;
      const newProperties: { [key: string]: string | string[] } = {};

      // Add topCategory directly to properties
      if (formValue.topCategory) {
        newProperties['topCategory'] = formValue.topCategory;
      }

      formValue.properties.forEach((prop: { key: string, value: string }) => {
        if (!newProperties[prop.key]) {
          newProperties[prop.key] = [];
        }
        (newProperties[prop.key] as string[]).push(prop.value);
      });

      const item: ItemLedger = {
        id: this.isEditing() && this.itemId ? this.itemId : `item_${Date.now()}`,
        itemName: formValue.itemName,
        units: defaultUnitConversion, // Using default for now
        allergenIds: this.selectedAllergens(),
        properties: newProperties,
      };

      if (this.isEditing()) {
        this.itemDataService.updateItem(item);
      } else {
        this.itemDataService.addItem(item);
      }
      this.router.navigate(['/inventory/list']);
    }
  }

  onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }
}
