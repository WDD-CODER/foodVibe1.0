import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItemListComponent } from './inventory-item-list.component';
import { ItemDataService } from '@services/items-data.service';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';

// Models
import type { ItemLedger } from '@models/ingredient.model';
import { FilterOption } from '@models/filter-option.model';
import { FilterCategory } from '@models/filter-category.model';
import { LucideAngularModule , Filter} from 'lucide-angular';

describe('InventoryItemListComponent', () => {
  let component: InventoryItemListComponent;
  let fixture: ComponentFixture<InventoryItemListComponent>;

  // Mock Data
  const mockItems: ItemLedger[] = [
    {
      id: '1',
      itemName: 'Tomato',
      allergenIds: ['Gluten'],
      properties: { topCategory: 'Vegetables', color: 'Red' }
    } as any,
    {
      id: '2',
      itemName: 'Milk',
      allergenIds: ['Dairy'],
      properties: { topCategory: 'Dairy' }
    } as any
  ];

  // Service Mock with Signal
  const mockItemDataService = {
    allItems_: signal<ItemLedger[]>(mockItems)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItemListComponent, FormsModule,LucideAngularModule.pick({ Filter })],
      providers: [
        { provide: ItemDataService, useValue: mockItemDataService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryItemListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); 
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate filter categories based on items', () => {
    // Accessing protected signal via bracket notation for testing
    const categories = (component as any).filterCategories();
    
    const categoryNames = categories.map((c: FilterCategory) => c.name);
    expect(categoryNames).toContain('Allergens');
    expect(categoryNames).toContain('TopCategory');
    expect(categoryNames).toContain('color');
  });

  it('should filter items when applyFilters is called', () => {
    // 1. Setup Filter State
    const categories = (component as any).filterCategories();
    const dairyCategory = categories.find((c: FilterCategory) => c.name === 'TopCategory');
    const dairyOption = dairyCategory?.options.find((o: FilterOption) => o.value === 'Dairy');
    
    if (dairyOption) {
      dairyOption.checked_ = true; // Use the underscore marker
    }

    // 2. Execute Action
    (component as any).applyFilters();
    fixture.detectChanges();

    // 3. Verify via computed signal 'filteredItems_'
    const results = (component as any).filteredItems_();
    expect(results.length).toBe(1);
    expect(results[0].itemName).toBe('Milk');
  });

  it('should show all items when no filters are selected', () => {
    (component as any).applyFilters();
    fixture.detectChanges();
    
    const results = (component as any).filteredItems_();
    expect(results.length).toBe(mockItems.length);
  });

  it('should display "No results" message when filter matches nothing', () => {
    // 1. Inject impossible filter
    component.setFilters({ 'TopCategory': ['NonExistentValue'] });
    
    // 2. Trigger reactivity
    fixture.detectChanges();
  
    const compiled = fixture.nativeElement as HTMLElement;
    
    // 3. Search for the standard Tailwind 'no-results' class
    const message = compiled.querySelector('.no-results');
    
    expect(message).toBeTruthy();
  });
});