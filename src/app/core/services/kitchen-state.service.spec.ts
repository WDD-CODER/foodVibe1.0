import { TestBed } from '@angular/core/testing';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { KitchenStateService } from './kitchen-state.service';

describe('KitchenStateService', () => {
  let service: KitchenStateService;

  // Mock Factory for Products
  const createMockProduct = (_id: string, minStock: number): Product => ({
    _id,
    min_stock_level_: minStock,
    name_hebrew: 'Test Product',
    category_: 'Dry',
    supplierId_: 's1',
    purchase_price_: 10,
    purchase_unit_: 'KG' as any,
    base_unit_: 'G' as any,
    conversion_factor_: 1000,
    yield_factor_: 1,
    is_dairy_: false,
    allergens_: [],
    expiry_days_default_: 7
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenStateService]
    });
    service = TestBed.inject(KitchenStateService);
  });

  describe('Initial State', () => {
    it('should initialize with empty arrays', () => {
      expect(service.products_()).toEqual([]);
      expect(service.recipes_()).toEqual([]);
      expect(service.suppliers_()).toEqual([]);
    });
  });

  describe('State Actions', () => {
    it('should update products_ signal via addProduct', () => {
      const product = createMockProduct('p1', 10);
      service.addProduct(product);
      
      expect(service.products_()).toContain(product);
      expect(service.products_().length).toBe(1);
    });

    it('should update recipes_ signal via addRecipe', () => {
      const recipe = { _id: 'r1' } as Recipe;
      service.addRecipe(recipe);
      
      expect(service.recipes_()).toContain(recipe);
    });

    it('should update suppliers_ signal via addSupplier', () => {
      const supplier = { _id: 's1' } as Supplier;
      service.addSupplier(supplier);
      
      expect(service.suppliers_()).toContain(supplier);
    });
  });

  describe('Computed Signals (lowStockItems_)', () => {
    it('should filter items where min_stock_level_ is greater than 0', () => {
      const lowStockItem = createMockProduct('p-low', 5);
      const normalItem = createMockProduct('p-normal', 0);

      service.addProduct(lowStockItem);
      service.addProduct(normalItem);

      const result = service.lowStockItems_();
      
      expect(result.length).toBe(1);
      expect(result[0]._id).toBe('p-low');
    });

    it('should be reactive when products_ signal changes', () => {
      expect(service.lowStockItems_().length).toBe(0);

      service.addProduct(createMockProduct('p1', 10));
      expect(service.lowStockItems_().length).toBe(1);

      service.addProduct(createMockProduct('p2', 20));
      expect(service.lowStockItems_().length).toBe(2);
    });
  });
});