import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemFormComponent } from './item-form.component';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ItemDataService } from '@services/items-data.service';
import { signal } from '@angular/core';
import { Product } from '@models/product.model';

describe('ItemFormComponent', () => {
  let component: ItemFormComponent;
  let fixture: ComponentFixture<ItemFormComponent>;

let mockProductsSignal = signal<Product[]>([]);
let mockAllItemsSignal = signal<any[]>([]);


 async function setupTest(initialItem: any = null) {
    mockProductsSignal = signal<Product[]>([]);
    mockAllItemsSignal = signal<any[]>([]);

    // Define the mock objects HERE so they use the fresh signals above
    const currentKitchenMock = { products_: () => mockProductsSignal() };
    const currentItemDataMock = { allItems_: () => mockAllItemsSignal() };

    await TestBed.configureTestingModule({
      imports: [ItemFormComponent],
      providers: [
        { provide: KitchenStateService, useValue: currentKitchenMock },
        { provide: ItemDataService, useValue: currentItemDataMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemFormComponent);
    component = fixture.componentInstance;

    if (initialItem) {
      fixture.componentRef.setInput('initialItem', initialItem);
    }

    fixture.detectChanges();
  }

  it('should invalidate the form when a duplicate name belongs to a different ID', async () => {
    // Setup state
    const existingProduct = { _id: 'p-other', name_hebrew: 'Tomato' } as Product;
    
    await setupTest(); 
    mockProductsSignal.set([existingProduct]);
    
    const control = component.itemForm.get('itemName');
    control?.setValue('Tomato');
    
    // Force validation after signal is updated
    control?.updateValueAndValidity();
    fixture.detectChanges();

    expect(control?.errors?.['duplicateName']).toBe(true);
  });

  it('should allow the same name when editing the same item ID', async () => {
    const existingId = 'p1';
    // Load the component with the initialItem signal already populated
    await setupTest({ _id: existingId, itemName: 'Tomato' });
    
    mockProductsSignal.set([{ _id: existingId, name_hebrew: 'Tomato' } as Product]);

    const control = component.itemForm.get('itemName');
    control?.updateValueAndValidity();
    fixture.detectChanges();

    expect(control?.errors?.['duplicateName']).toBeFalsy();
  });
});