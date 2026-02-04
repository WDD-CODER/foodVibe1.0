import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItemListComponent } from './inventory-item-list.component';
import { ItemDataService } from '../../../core/services/items-data.service';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { ItemLedger } from '../../../core/models/ingredient.model';

describe('InventoryItemListComponent', () => {
  let component: InventoryItemListComponent;
  let fixture: ComponentFixture<InventoryItemListComponent>;

  // נתונים דמה לבדיקה
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

  // יצירת Mock לסרוויס עם Signal
  const mockItemDataService = {
    allItems_: signal(mockItems)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItemListComponent, FormsModule],
      providers: [
        { provide: ItemDataService, useValue: mockItemDataService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryItemListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // מפעיל את ה-effect ב-constructor
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate filter categories based on items', () => {
    const categories = component['filterCategories']();
    
    // בדיקה שקטגוריות נוצרו (Allergens, TopCategory, color)
    const categoryNames = categories.map(c => c.name);
    expect(categoryNames).toContain('Allergens');
    expect(categoryNames).toContain('TopCategory');
    expect(categoryNames).toContain('color');
  });

  it('should filter items when applyFilters is called', () => {
    // 1. סימולציית בחירת פילטר (בחירת 'Dairy' בקטגוריית 'TopCategory')
    const categories = component['filterCategories']();
    const dairyCategory = categories.find(c => c.name === 'TopCategory');
    const dairyOption = dairyCategory?.options.find(o => o.value === 'Dairy');
    
    if (dairyOption) dairyOption.checked = true;

    // 2. הפעלת הסינון
    component['applyFilters']();
    fixture.detectChanges();

    // 3. וידוא שרק 'Milk' נשאר ברשימה
    expect(component['filteredItems']().length).toBe(1);
    expect(component['filteredItems']()[0].itemName).toBe('Milk');
  });

  it('should show all items when no filters are selected', () => {
    component['applyFilters']();
    expect(component['filteredItems']().length).toBe(mockItems.length);
  });

  it('should display "No results" message when filter matches nothing', () => {
    // 1. Use the new public method to update the protected signal
    component.setFilters({ 'TopCategory': ['NonExistentValue'] });
    
    // 2. Trigger change detection to update the computed signal (filteredItems_) 
    // and re-render the template
    fixture.detectChanges();
  
    const compiled = fixture.nativeElement as HTMLElement;
    
    // 3. Match the selector exactly as it appears in your HTML
    // If your HTML uses <div class="no-results">, use '.no-results'
    const message = compiled.querySelector('.no-results') || compiled.querySelector('.no-results-msg');
    
    expect(message).toBeTruthy();
  });
});