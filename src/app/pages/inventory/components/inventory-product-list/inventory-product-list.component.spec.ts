import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryProductListComponent } from './inventory-product-list.component';
import { KitchenStateService } from '@services/kitchen-state.service';
import { ProductDataService } from '@services/product-data.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { 
  LucideAngularModule, 
  Search, 
  Plus, 
  Trash2, 
  Pencil, // <--- Missing dependency identified
  ChevronRight 
} from 'lucide-angular';import { Product } from '@models/product.model';

describe('InventoryProductListComponent', () => {
  let component: InventoryProductListComponent;
  let fixture: ComponentFixture<InventoryProductListComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  // Rule #4: Callable Signal Mocks for SoT
  const mockProductsSignal = signal<Product[]>([
    {
      _id: '1',
      name_hebrew: 'Tomato',
      category_: 'Vegetables',
      supplierId_: 'Supplier A',
      allergens_: ['Gluten']
    } as Product,
    {
      _id: '2',
      name_hebrew: 'Milk',
      category_: 'Dairy',
      supplierId_: 'Supplier B',
      allergens_: ['milk products']
    } as Product
  ]);

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    const mockKitchenState = {
      products_: mockProductsSignal,
      deleteProduct: jasmine.createSpy('deleteProduct')
    };

    const mockProductData = {
      allProducts_: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [
        InventoryProductListComponent, 
        LucideAngularModule.pick({ 
          Search, 
          Plus, 
          Trash2, 
          Pencil, // <--- Added to satisfy the template
          ChevronRight 
        })
      ],
      providers: [
        { provide: KitchenStateService, useValue: mockKitchenState },
        { provide: ProductDataService, useValue: mockProductData },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should generate filter categories based on products in state', () => {
    const categories = (component as any).filterCategories_();
    const names = categories.map((c: any) => c.name);
    
    expect(names).toContain('Category');
    expect(names).toContain('Supplier');
    expect(names).toContain('Allergens');
  });

  it('should filter items when a filter is toggled', () => {
    // FIX: Property name matched to 'filteredProducts_'
    (component as any).toggleFilter('Category', 'Dairy');
    fixture.detectChanges();

    const results = (component as any).filteredProducts_();
    expect(results.length).toBe(1);
    expect(results[0].name_hebrew).toBe('Milk');
  });

  it('should handle multiple filter categories (AND logic)', () => {
    (component as any).toggleFilter('Category', 'Vegetables');
    (component as any).toggleFilter('Allergens', 'Gluten');
    fixture.detectChanges();

    const results = (component as any).filteredProducts_();
    expect(results.length).toBe(1);
    expect(results[0].name_hebrew).toBe('Tomato');
  });

  it('should navigate to edit page with correct absolute path', () => {
    // FIX: Aligning with Component's actual navigation logic
    component.onEditProduct('123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/edit', '123']);
  });

  it('should call deleteProduct on state service when confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const stateService = TestBed.inject(KitchenStateService);
    (stateService.deleteProduct as jasmine.Spy).and.returnValue({ subscribe: () => {} });

    (component as any).onDeleteProduct('1');
    expect(stateService.deleteProduct).toHaveBeenCalledWith('1');
  });
});