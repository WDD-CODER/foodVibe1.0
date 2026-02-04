import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ItemFormComponent } from './item-form.component';
import { ItemDataService } from '@services/items-data.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { signal } from '@angular/core';
import { ItemLedger } from '@models/ingredient.model';

describe('ItemFormComponent', () => {
  let component: ItemFormComponent;
  let fixture: ComponentFixture<ItemFormComponent>;

  // נתונים דמה לבדיקה
  const mockItems: ItemLedger[] = [
    { id: '1', itemName: 'Tomato', properties: { topCategory: 'Veg' } } as any
  ];

  // יצירת Mock לסרוויס
  const mockItemDataService = {
    allItems_: signal(mockItems)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemFormComponent, ReactiveFormsModule, ClickOutSideDirective],
      providers: [
        { provide: ItemDataService, useValue: mockItemDataService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an empty form', () => {
    expect(component.itemForm.get('itemName')?.value).toBe('');
    expect(component.itemForm.valid).toBeFalse();
  });

  it('should search for items when itemName changes', fakeAsync(() => {
    // 1. הזנת ערך לשדה השם
    component.itemForm.get('itemName')?.setValue('Tom');
    
    // 2. קידום הזמן בגלל ה-debounceTime(300)
    tick(350);
    
    // 3. בדיקה שה-Signal של החיפוש התעדכן
    expect(component.searchItems_().length).toBe(1);
    expect(component.searchItems_()[0].itemName).toBe('Tomato');
    expect(component.showItemDropdown_()).toBeTrue();
  }));

  it('should detect duplicate item names', fakeAsync(() => {
    component.itemForm.get('itemName')?.setValue('Tomato');
    tick(350);
    
    expect(component.duplicateMatch_()).toBeTruthy();
    expect(component.duplicateMatch_()?.itemName).toBe('Tomato');
  }));

  it('should emit save event when form is valid and submitted', () => {
    spyOn(component.save, 'emit');
    
    // מילוי טופס תקין
    component.itemForm.patchValue({
      itemName: 'Cucumber',
      topCategory: 'Vegetables'
    });
    
    component.onSubmit();

    expect(component.save.emit).toHaveBeenCalled();
    const emittedItem = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
    expect(emittedItem.itemName).toBe('Cucumber');
  });

  it('should populate form when initialItem input is provided', () => {
    const existingItem: ItemLedger = {
      id: '123',
      itemName: 'Old Item',
      properties: { topCategory: 'Old Cat' }
    } as any;

    // הגדרת ה-Input באופן ידני (מדמה @Input() או input() signal)
    fixture.componentRef.setInput('initialItem', existingItem);
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.itemForm.get('itemName')?.value).toBe('Old Item');
    expect(component.isEditing_()).toBeTrue();
  });
});