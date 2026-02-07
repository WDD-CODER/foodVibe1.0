import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickEditDrawerComponent } from './quick-edit-drawer.component';
import { KitchenStateService } from '@services/kitchen-state.service';
import { signal } from '@angular/core';
import { Product } from '@models/product.model';
import { of } from 'rxjs';

describe('QuickEditDrawerComponent', () => {
  let component: QuickEditDrawerComponent;
  let fixture: ComponentFixture<QuickEditDrawerComponent>;

  // 1. Mock the Service and its Signals
  const mockProductsSignal = signal<Product[]>([
    { _id: 'p123', name_hebrew: 'Tomato', purchase_price_: 10, conversion_factor_: 1 } as Product
  ]);

  const mockKitchenState = {
    products_: () => mockProductsSignal(),
    updateProduct: jasmine.createSpy('updateProduct').and.returnValue(of(null))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickEditDrawerComponent],
      providers: [
        { provide: KitchenStateService, useValue: mockKitchenState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuickEditDrawerComponent);
    component = fixture.componentInstance;

    // 2. IMPORTANT: Set required inputs BEFORE the first detectChanges()
    // This prevents the NG0950 error
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('productId', 'p123');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute selectedProduct_ correctly when productId is provided', () => {
    const selected = component.selectedProduct_();
    expect(selected).toBeTruthy();
    expect(selected?.name_hebrew).toBe('Tomato');
  });

  it('should return null for selectedProduct_ if productId does not match', () => {
    fixture.componentRef.setInput('productId', 'unknown');
    fixture.detectChanges();
    expect(component.selectedProduct_()).toBeUndefined();
  });

  it('should call updateProduct and close when onSave is triggered', () => {
    const closeSpy = spyOn(component.close, 'emit');
    const updateData = { purchase_price_: 15 };

    component.onSave(updateData);

    expect(mockKitchenState.updateProduct).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should emit close when onClose is called', () => {
    const closeSpy = spyOn(component.close, 'emit');
    component.onClose();
    expect(closeSpy).toHaveBeenCalled();
  });
});