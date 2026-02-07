import { Component, OnInit, inject, signal, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ItemDataService } from '@services/items-data.service';
import type { ItemLedger, TripleUnitConversion } from '@models/ingredient.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClickOutSideDirective } from '@directives/click-out-side';

const defaultUnitConversion: TripleUnitConversion = {
  purchase: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  inventory: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  recipe: { symbol: 'g', label: 'Grams', factorToInventory: 0.001 },
};

@Component({
  selector: 'item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClickOutSideDirective],
  templateUrl: './item-form.component.html',
  styleUrl: './item-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  protected itemDataService = inject(ItemDataService);
  readonly isEditing_ = computed(() => !!this.initialItem());
  
  // Inputs/Outputs for the wrapper components
  initialItem = input<ItemLedger | null>(null);
  save = output<ItemLedger>();
  cancel = output<void>();
  switchToEdit = output<ItemLedger>();

  itemForm: FormGroup;
  searchItems_ = signal<ItemLedger[]>([]);
  showItemDropdown_ = signal<boolean>(false);
  duplicateMatch_ = signal<ItemLedger | null>(null);
  selectedAllergens_ = signal<string[]>([]);
  selectedTopCategories_ = signal<string[]>([]);
  showAllergenDropdown_ = signal<boolean>(false);
  showTopCategoryDropdown_ = signal<boolean>(false);

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
    const item = this.initialItem();
    if (item) this.populateForm(item);
  }
  
  selectExistingItem(item: ItemLedger): void {
    this.switchToEdit.emit(item);
    this.showItemDropdown_.set(false);
  }

  private populateForm(item: ItemLedger): void {
    const categories = [
      ...(item.properties?.topCategory ? [item.properties.topCategory] : []),
      ...(item.properties?.subCategories ?? []),
    ].filter(Boolean);

    this.selectedTopCategories_.set(categories);
    this.selectedAllergens_.set(item.allergenIds || []);
    
    this.itemForm.patchValue({
      itemName: item.itemName,
      topCategory: categories.length ? 'selected' : '',
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

  get properties(): FormArray { return this.itemForm.get('properties') as FormArray; }

  createPropertyFormGroup(key = '', value = ''): FormGroup {
    return this.fb.group({ key: [key, Validators.required], value: [value, Validators.required] });
  }

  onItemNameInput(value: string): void {
    if (!value) return;
    const all = this.itemDataService.allItems_();
    this.searchItems_.set(all.filter(i => i.itemName.toLowerCase().includes(value.toLowerCase())));
    this.showItemDropdown_.set(true);

    const exact = all.find(i => i.itemName.toLowerCase() === value.toLowerCase().trim());
    this.duplicateMatch_.set(exact && exact._id !== this.initialItem()?._id ? exact : null);
  }

  toggleAllergen(alg: string): void {
    this.selectedAllergens_.update(s => s.includes(alg) ? s.filter(x => x !== alg) : [...s, alg]);
  }

  toggleTopCategory(cat: string): void {
    this.selectedTopCategories_.update(s => s.includes(cat) ? s.filter(x => x !== cat) : [...s, cat]);
    this.itemForm.get('topCategory')?.setValue(this.selectedTopCategories_().length ? 'selected' : '');
  }

  onSubmit(): void {
    if (this.itemForm.invalid) return;
    const cats = this.selectedTopCategories_();
    const item: ItemLedger = {
      _id: this.initialItem()?._id || `item_${Date.now()}`,
      itemName: this.itemForm.value.itemName,
      units: defaultUnitConversion,
      allergenIds: this.selectedAllergens_(),
      properties: {
        topCategory: cats[0] || '',
        subCategories: cats.slice(1),
        ...this.itemForm.value.properties.reduce((acc: any, p: any) => {
          acc[p.key] = acc[p.key] ? [...acc[p.key], p.value] : [p.value];
          return acc;
        }, {})
      }
    };
    this.save.emit(item);
  }
}