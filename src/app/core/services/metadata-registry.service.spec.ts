import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MetadataRegistryService } from './metadata-registry.service';
import { ProductDataService } from './product-data.service';
import { StorageService } from './async-storage.service';
import { UserMsgService } from './user-msg.service';
import { signal } from '@angular/core';
import { Product } from '../models/product.model';

describe('MetadataRegistryService', () => {
  let service: MetadataRegistryService;
  let productDataSpy: jasmine.SpyObj<ProductDataService>;
  const mockProductsSignal = signal<Product[]>([]);

  beforeEach(fakeAsync(() => {
    const pSpy = jasmine.createSpyObj('ProductDataService', ['updateProduct'], {
      allProducts_: mockProductsSignal
    });

    const storageSpy = jasmine.createSpyObj('StorageService', ['query', 'put', 'post']);
    storageSpy.query.and.callFake((entity: string) => {
      if (entity === 'KITCHEN_CATEGORIES') {
        return Promise.resolve([{ _id: 'c1', items: ['vegetables', 'dairy', 'meat', 'dry', 'fish'] }]);
      }
      if (entity === 'KITCHEN_ALLERGENS') {
        return Promise.resolve([{ _id: 'a1', items: ['gluten', 'eggs', 'peanuts', 'nuts', 'soy', 'milk solids', 'sesame'] }]);
      }
      return Promise.resolve([]);
    });
    storageSpy.put.and.returnValue(Promise.resolve());
    storageSpy.post.and.returnValue(Promise.resolve());

    const userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg']);

    TestBed.configureTestingModule({
      providers: [
        MetadataRegistryService,
        { provide: ProductDataService, useValue: pSpy },
        { provide: StorageService, useValue: storageSpy },
        { provide: UserMsgService, useValue: userMsgSpy }
      ]
    });

    service = TestBed.inject(MetadataRegistryService);
    productDataSpy = TestBed.inject(ProductDataService) as jasmine.SpyObj<ProductDataService>;
    tick(); // let initMetadata() complete
  }));

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Signal Management', () => {
    it('should register a new allergen if it does not exist', fakeAsync(() => {
      const initialCount = service.allAllergens_().length;
      service.registerAllergen('shellfish');
      tick();
      expect(service.allAllergens_()).toContain('shellfish');
      expect(service.allAllergens_().length).toBe(initialCount + 1);
    }));

    it('should not register duplicate allergens', fakeAsync(() => {
      const initialCount = service.allAllergens_().length;
      service.registerAllergen('gluten');
      tick();
      expect(service.allAllergens_().length).toBe(initialCount);
    }));
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