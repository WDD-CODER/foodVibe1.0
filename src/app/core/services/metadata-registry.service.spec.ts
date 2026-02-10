import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MetadataRegistryService } from './metadata-registry.service';
import { ProductDataService } from './product-data.service';
import { signal } from '@angular/core';
import { Product } from '../models/product.model';
import { KitchenUnit } from '../models/units.enum';

describe('MetadataRegistryService', () => {
  let service: MetadataRegistryService;
  let productDataSpy: jasmine.SpyObj<ProductDataService>;
  
  // Rule #4: Signal Mock for Dependency
  const mockProductsSignal = signal<Product[]>([]);

  beforeEach(() => {
    const pSpy = jasmine.createSpyObj('ProductDataService', ['updateProduct'], {
      allProducts_: mockProductsSignal
    });

    TestBed.configureTestingModule({
      providers: [
        MetadataRegistryService,
        { provide: ProductDataService, useValue: pSpy }
      ]
    });

    service = TestBed.inject(MetadataRegistryService);
    productDataSpy = TestBed.inject(ProductDataService) as jasmine.SpyObj<ProductDataService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Signal Management', () => {
    it('should register a new allergen if it does not exist', () => {
      const initialCount = service.allAllergens_().length;
      // LOGIC CHANGE: Use English Key
      service.registerAllergen('shellfish');
      
      expect(service.allAllergens_()).toContain('shellfish');
      expect(service.allAllergens_().length).toBe(initialCount + 1);
    });

    it('should not register duplicate allergens', () => {
      const initialCount = service.allAllergens_().length;
      // LOGIC CHANGE: Use English Key (Match the default set in Service)
      service.registerAllergen('gluten'); 
      
      expect(service.allAllergens_().length).toBe(initialCount);
    });
  });

  describe('Async Logic: purgeGlobalUnit', () => {
    it('should update all products using the purged unit to the English "grams" key', fakeAsync(() => {
      // LOGIC CHANGE: Standardized English keys for units [cite: 407, 413]
      const productA = { _id: '1', name_hebrew: 'קמח', base_unit_: 'kg' } as Product;
      const productB = { _id: '2', name_hebrew: 'מלח', base_unit_: 'kg' } as Product;
      const productC = { _id: '3', name_hebrew: 'מים', base_unit_: 'liter' } as Product;
      
      mockProductsSignal.set([productA, productB, productC]);
      productDataSpy.updateProduct.and.returnValue(Promise.resolve());

      // LOGIC CHANGE: Trigger purge with English key
      service.purgeGlobalUnit('kg');
      tick(); // Resolve the async loop [cite: 412, 431]

      // Only the 2 products with 'kg' should have been updated
      expect(productDataSpy.updateProduct).toHaveBeenCalledTimes(2);
      
      // LOGIC CHANGE: Verify fallback uses the standardized English 'gram' [cite: 407]
      expect(productDataSpy.updateProduct).toHaveBeenCalledWith(
        jasmine.objectContaining({ _id: '1', base_unit_: 'gram' })
      );
      expect(productDataSpy.updateProduct).toHaveBeenCalledWith(
        jasmine.objectContaining({ _id: '2', base_unit_: 'gram' })
      );
    }));
  });
});