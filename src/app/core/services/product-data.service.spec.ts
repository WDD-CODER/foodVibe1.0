import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ProductDataService } from './product-data.service';
import { StorageService } from './async-storage.service';
import { Product } from '../models/product.model';

describe('ProductDataService', () => {
  let service: ProductDataService;
  let storageSpy: jasmine.SpyObj<StorageService>;

  const ENTITY = 'PRODUCT_LIST';

  const mockProducts: Product[] = [
    { _id: '1', name_hebrew: 'Tomato', category_: 'Veg', allergens_: ['dairy'] } as Product,
    { _id: '2', name_hebrew: 'Cucumber', category_: 'Veg', allergens_: ['dairy'] } as Product
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
    // No tick() needed here, it's handled in beforeEach
    expect(service).toBeTruthy();
    expect(service.allProducts_()).toEqual(mockProducts);
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
      const updatedProduct = { ...mockProducts[0], name_hebrew: 'Rotten Tomato' };
      storageSpy.put.and.returnValue(Promise.resolve(updatedProduct));

      service.updateProduct(updatedProduct);
      tick(); // Resolve the storage.put promise

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