import { TestBed } from '@angular/core/testing';
import { KitchenStateService } from './kitchen-state.service';
import { ProductDataService } from './product-data.service';
import { UserMsgService } from './user-msg.service';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { KitchenUnit } from '@models/units.enum';
import { signal, WritableSignal } from '@angular/core';

describe('KitchenStateService', () => {
  let service: KitchenStateService;
  let productDataSpy: jasmine.SpyObj<ProductDataService>;
  let userMsgSpy: jasmine.SpyObj<UserMsgService>;

  // 1. Declare at describe level so all tests and beforeEach share the same instance
  const mockAllItemsSignal: WritableSignal<any[]> = signal<any[]>([]);

  const createMockProduct = (_id: string): Product => ({
    _id,
    name_hebrew: 'מוצר בדיקה',
    category_: 'Dry',
    supplierId_: 's1',
    buy_price_global_: 10, // FIXED: Correct property name
    purchase_options_: [], // FIXED: Required by interface
    base_unit_: 'gram',
    yield_factor_: 1,
    allergens_: [],
    min_stock_level_: 0,
    is_dairy_: false,
    expiry_days_default_: 3
  });

  beforeEach(() => {
    // 2. Reset signal state before each test
    mockAllItemsSignal.set([]);

    const iSpy = jasmine.createSpyObj('ProductDataService',
      ['addProduct', 'updateProduct', 'deleteProduct'],
      { allProducts_: mockAllItemsSignal }
    );
    const uSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg']);

    // 3. Directly assign the signal to the spy property so calling iSpy.allProducts_() works
    iSpy.allProducts_ = mockAllItemsSignal;

    TestBed.configureTestingModule({
      providers: [
        KitchenStateService,
        { provide: ProductDataService, useValue: iSpy },
        { provide: UserMsgService, useValue: uSpy }
      ]
    });

    service = TestBed.inject(KitchenStateService);
    productDataSpy = TestBed.inject(ProductDataService) as jasmine.SpyObj<ProductDataService>;
    userMsgSpy = TestBed.inject(UserMsgService) as jasmine.SpyObj<UserMsgService>;
  });

  describe('Initialization & Sync', () => {
    it('should sync products_ signal when ProductDataService signal updates', () => {
      const mockRawItem = {
        _id: 'p1',
        name_hebrew: 'Tomato',
        category_: 'Veg'
      } as any;

      // Update signal and trigger Angular effects
      mockAllItemsSignal.set([mockRawItem]);
      TestBed.flushEffects();

      expect(service.products_().length).toBe(1);
      expect(service.products_()[0].name_hebrew).toBe('Tomato');

    });
  });

  describe('Product CRUD', () => {
    it('should call saveProduct (add) and show success message', (done) => {
      const product = createMockProduct(''); // Empty ID triggers add
      productDataSpy.addProduct.and.returnValue(Promise.resolve());

      // FIXED: Method name in service is saveProduct
      service.saveProduct(product).subscribe(() => {
        expect(productDataSpy.addProduct).toHaveBeenCalled();
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('חומר גלם נוסף בהצלחה');
        done();
      });
    });

    it('should delete product if exists and show success', (done) => {
      const mockProduct = createMockProduct('p-del');
      mockAllItemsSignal.set([mockProduct]);

      // FIXED: ProductDataService uses deleteProduct
      productDataSpy.deleteProduct.and.returnValue(Promise.resolve());

      service.deleteProduct('p-del').subscribe(() => {
        expect(productDataSpy.deleteProduct).toHaveBeenCalledWith('p-del');
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('חומר הגלם נמחק בהצלחה');
        done();
      });
    });


    it('should throw error and show message if deleting non-existent product', (done) => {
      mockAllItemsSignal.set([]);
      TestBed.flushEffects();

      service.deleteProduct('none').subscribe({
        error: (err) => {
          expect(err.message).toBe('NOT_FOUND');
          // FIX: Align with the actual string in kitchen-state.service.ts
          expect(userMsgSpy.onSetErrorMsg).toHaveBeenCalledWith('הפריט לא נמצא');
          done();
        }
      });
    });
  });

  describe('Direct State Updates', () => {
    it('should update recipes_ signal', () => {
      const recipe = { _id: 'r1', name_hebrew: 'Hummus' } as Recipe;
      service.addRecipe(recipe);
      expect(service.recipes_()).toContain(recipe);
    });

    it('should update suppliers_ signal with valid type conversion', () => {
      const supplier: Supplier = {
        _id: 's1',
        name_hebrew: 'Osem',
        delivery_days_: [1],
        min_order_mov_: 100,
        lead_time_days_: 1
      };
      service.addSupplier(supplier);
      expect(service.suppliers_()).toContain(supplier);
    });
  });
});