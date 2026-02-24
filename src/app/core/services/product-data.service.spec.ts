import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ProductDataService } from './product-data.service';
import { StorageService } from './async-storage.service';
import { Product } from '../models/product.model';

describe('ProductDataService', () => {
  let service: ProductDataService;
  let storageSpy: jasmine.SpyObj<StorageService>;

  const ENTITY = 'PRODUCT_LIST';

  const mockProducts: Product[] = [
    { _id: '1', name_hebrew: 'Tomato', categories_: ['Veg'], supplierIds_: [], allergens_: ['dairy'], base_unit_: 'gram', buy_price_global_: 0, purchase_options_: [], yield_factor_: 1, min_stock_level_: 0, expiry_days_default_: 0 } as Product,
    { _id: '2', name_hebrew: 'Cucumber', categories_: ['Veg'], supplierIds_: [], allergens_: ['dairy'], base_unit_: 'gram', buy_price_global_: 0, purchase_options_: [], yield_factor_: 1, min_stock_level_: 0, expiry_days_default_: 0 } as Product
  ];

  beforeEach(fakeAsync(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove']);
    
    // Crucial: The constructor calls query() immediately
    storageSpy.query.and.returnValue(Promise.resolve(mockProducts));

    TestBed.configureTestingModule({
      providers: [
        ProductDataService,
        { provide: StorageService, useValue: storageSpy }
      ]
    });

    service = TestBed.inject(ProductDataService);
    
    // Resolve the constructor's loadInitialData() before ANY test runs
    tick(); 
  }));

  it('should be created and load initial data', () => {
    expect(service).toBeTruthy();
    expect(service.allProducts_().length).toBe(mockProducts.length);
    expect(service.allProducts_()[0].name_hebrew).toBe('Tomato');
    expect(service.allProducts_()[0].categories_).toEqual(['Veg']);
    expect(storageSpy.query).toHaveBeenCalledWith(ENTITY);
  });

  describe('Computed Signals', () => {
    it('should compute allTopCategories_ correctly without duplicates', () => {
      expect(service.allTopCategories_()).toEqual(['Veg']);
    });

    it('should compute allAllergens_ correctly and deduplicate', () => {
      expect(service.allAllergens_()).toEqual(['dairy']);
    });
  });

  describe('CRUD Operations', () => {
    it('should update an existing product in the signal', fakeAsync(() => {
      const updatedProduct = { ...mockProducts[0], name_hebrew: 'Rotten Tomato', categories_: ['Veg'], supplierIds_: [] } as Product;
      storageSpy.put.and.returnValue(Promise.resolve(updatedProduct));

      service.updateProduct(updatedProduct);
      tick();

      const result = service.allProducts_().find(p => p._id === '1');
      expect(result?.name_hebrew).toBe('Rotten Tomato');
    }));

    it('should delete a product and remove it from the signal', fakeAsync(() => {
      storageSpy.remove.and.returnValue(Promise.resolve());

      service.deleteProduct('1');
      tick(); // Resolve the storage.remove promise

      expect(service.allProducts_().length).toBe(1);
      expect(service.allProducts_().find(p => p._id === '1')).toBeUndefined();
    }));
  });
});