import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryProductListComponent } from './inventory-product-list.component';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { LucideAngularModule, Search, Trash2, Pencil, PlusCircle, Menu, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-angular';
import { Product } from '@models/product.model';
import { TranslationService } from '@services/translation.service';
import { UnitRegistryService } from '@services/unit-registry.service';

describe('InventoryProductListComponent', () => {
  let component: InventoryProductListComponent;
  let fixture: ComponentFixture<InventoryProductListComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockProductsSignal = signal<Product[]>([
    {
      _id: '1',
      name_hebrew: 'Tomato',
      category_: 'Vegetables',
      supplierId_: 'Supplier A',
      allergens_: ['Gluten'],
      base_unit_: 'gram',
      buy_price_global_: 5
    } as Product,
    {
      _id: '2',
      name_hebrew: 'Milk',
      category_: 'Dairy',
      supplierId_: 'Supplier B',
      allergens_: ['milk products'],
      base_unit_: 'liter',
      buy_price_global_: 12
    } as Product
  ]);

  const mockUnitRegistry = {
    allUnitKeys_: signal(['gram', 'kg', 'liter', 'unit']),
    getConversion: (key: string) => ({ gram: 1, kg: 1000, liter: 1000, ml: 1, unit: 1 }[key] ?? 1)
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    const mockSuppliersSignal = signal([
      { _id: 'Supplier A', name_hebrew: 'Supplier A' },
      { _id: 'Supplier B', name_hebrew: 'Supplier B' }
    ]);
    const mockKitchenState = {
      products_: mockProductsSignal,
      suppliers_: mockSuppliersSignal,
      deleteProduct: jasmine.createSpy('deleteProduct'),
      saveProduct: jasmine.createSpy('saveProduct').and.returnValue({ subscribe: () => {} })
    };

    await TestBed.configureTestingModule({
      imports: [
        InventoryProductListComponent,
        LucideAngularModule.pick({ Search, Trash2, Pencil, PlusCircle, Menu, X, ArrowUpDown, ArrowUp, ArrowDown })
      ],
      providers: [
        { provide: KitchenStateService, useValue: mockKitchenState },
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
        { provide: UnitRegistryService, useValue: mockUnitRegistry }
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