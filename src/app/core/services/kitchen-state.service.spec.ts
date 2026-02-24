import { TestBed } from '@angular/core/testing';
import { KitchenStateService } from './kitchen-state.service';
import { ProductDataService } from './product-data.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { SupplierDataService } from './supplier-data.service';
import { UserMsgService } from './user-msg.service';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { signal, WritableSignal } from '@angular/core';
import { ActivityLogService } from './activity-log.service';

describe('KitchenStateService', () => {
  let service: KitchenStateService;
  let productDataSpy: jasmine.SpyObj<ProductDataService>;
  let recipeDataSpy: jasmine.SpyObj<RecipeDataService>;
  let userMsgSpy: jasmine.SpyObj<UserMsgService>;
  let activityLogSpy: jasmine.SpyObj<ActivityLogService>;

  const mockAllItemsSignal: WritableSignal<any[]> = signal<any[]>([]);
  const mockRecipesSignal: WritableSignal<Recipe[]> = signal<Recipe[]>([]);
  const mockDishesSignal: WritableSignal<Recipe[]> = signal<Recipe[]>([]);
  const mockSuppliersSignal: WritableSignal<Supplier[]> = signal<Supplier[]>([]);

  const createMockProduct = (_id: string): Product => ({
    _id,
    name_hebrew: 'מוצר בדיקה',
    categories_: ['Dry'],
    supplierIds_: ['s1'],
    buy_price_global_: 10,
    purchase_options_: [],
    base_unit_: 'gram',
    yield_factor_: 1,
    allergens_: [],
    min_stock_level_: 0,
    expiry_days_default_: 3
  });

  beforeEach(() => {
    mockAllItemsSignal.set([]);
    mockRecipesSignal.set([]);

    const iSpy = jasmine.createSpyObj('ProductDataService',
      ['addProduct', 'updateProduct', 'deleteProduct'],
      { allProducts_: mockAllItemsSignal }
    );
    iSpy.allProducts_ = mockAllItemsSignal;

    const rSpy = jasmine.createSpyObj('RecipeDataService',
      ['addRecipe', 'updateRecipe', 'getRecipeById'],
      { allRecipes_: mockRecipesSignal }
    );
    rSpy.allRecipes_ = mockRecipesSignal;

    const dSpy = jasmine.createSpyObj('DishDataService',
      ['addDish', 'updateDish', 'getDishById'],
      { allDishes_: mockDishesSignal }
    );
    dSpy.allDishes_ = mockDishesSignal;

    const uSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg']);

    const supplierSpy = jasmine.createSpyObj('SupplierDataService', ['addSupplier'], {
      allSuppliers_: mockSuppliersSignal
    });
    supplierSpy.addSupplier.and.callFake(async (s: Omit<Supplier, '_id'>) => {
      const saved = { ...s, _id: 's1' } as Supplier;
      mockSuppliersSignal.set([...mockSuppliersSignal(), saved]);
      return saved;
    });

    const aSpy = jasmine.createSpyObj('ActivityLogService', ['recordActivity']);

    TestBed.configureTestingModule({
      providers: [
        KitchenStateService,
        { provide: ProductDataService, useValue: iSpy },
        { provide: RecipeDataService, useValue: rSpy },
        { provide: DishDataService, useValue: dSpy },
        { provide: SupplierDataService, useValue: supplierSpy },
        { provide: UserMsgService, useValue: uSpy },
        { provide: ActivityLogService, useValue: aSpy }
      ]
    });

    service = TestBed.inject(KitchenStateService);
    productDataSpy = TestBed.inject(ProductDataService) as jasmine.SpyObj<ProductDataService>;
    recipeDataSpy = TestBed.inject(RecipeDataService) as jasmine.SpyObj<RecipeDataService>;
    userMsgSpy = TestBed.inject(UserMsgService) as jasmine.SpyObj<UserMsgService>;
    activityLogSpy = TestBed.inject(ActivityLogService) as jasmine.SpyObj<ActivityLogService>;
  });

  describe('Initialization & Sync', () => {
    it('should sync products_ signal when ProductDataService signal updates', () => {
      const mockRawItem = {
        _id: 'p1',
        name_hebrew: 'Tomato',
        categories_: ['Veg']
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
      const savedProduct = { ...product, _id: 'p-new' };
      productDataSpy.addProduct.and.returnValue(Promise.resolve(savedProduct));

      // FIXED: Method name in service is saveProduct
      service.saveProduct(product).subscribe(() => {
        expect(productDataSpy.addProduct).toHaveBeenCalled();
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('חומר גלם נוסף בהצלחה');
        expect(activityLogSpy.recordActivity).toHaveBeenCalled();
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
        expect(activityLogSpy.recordActivity).toHaveBeenCalled();
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

  describe('Recipe CRUD', () => {
    it('should call addRecipe for preparation and show success message', (done) => {
      const recipe = {
        _id: '',
        name_hebrew: 'Hummus',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'portion',
        default_station_: '',
        is_approved_: true
      } as Recipe;
      recipeDataSpy.addRecipe.and.returnValue(Promise.resolve({ ...recipe, _id: 'r1' }));

      service.saveRecipe(recipe).subscribe(() => {
        expect(recipeDataSpy.addRecipe).toHaveBeenCalled();
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('המתכון נשמר בהצלחה');
        expect(activityLogSpy.recordActivity).toHaveBeenCalled();
        done();
      });
    });

    it('should call addDish for dish and show success message', (done) => {
      const dish = {
        _id: '',
        name_hebrew: 'Salad',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'מנה',
        default_station_: '',
        is_approved_: true,
        prep_items_: [{ preparation_name: 'Chopped lettuce', category_name: 'veg', quantity: 1, unit: 'unit' }]
      } as Recipe;
      const dishDataSpy = TestBed.inject(DishDataService) as jasmine.SpyObj<DishDataService>;
      dishDataSpy.addDish.and.returnValue(Promise.resolve({ ...dish, _id: 'd1' }));

      service.saveRecipe(dish).subscribe(() => {
        expect(dishDataSpy.addDish).toHaveBeenCalled();
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('המנה נשמרה בהצלחה');
        expect(activityLogSpy.recordActivity).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Direct State Updates', () => {
    it('should sync recipes_ from RecipeDataService and DishDataService', () => {
      const recipe: Recipe = {
        _id: 'r1', name_hebrew: 'Hummus',
        ingredients_: [], steps_: [], yield_amount_: 1, yield_unit_: 'portion',
        default_station_: '', is_approved_: true
      };
      const dish: Recipe = {
        _id: 'd1', name_hebrew: 'Salad', prep_items_: [],
        ingredients_: [], steps_: [], yield_amount_: 1, yield_unit_: 'portion',
        default_station_: '', is_approved_: true
      };
      mockRecipesSignal.set([recipe]);
      mockDishesSignal.set([dish]);
      TestBed.flushEffects();
      expect(service.recipes_()).toContain(recipe);
      expect(service.recipes_()).toContain(dish);
    });

    it('should update suppliers_ signal with valid type conversion', async () => {
      const supplierInput = {
        name_hebrew: 'Osem',
        delivery_days_: [1],
        min_order_mov_: 100,
        lead_time_days_: 1
      } as Omit<Supplier, '_id'>;
      const saved = await service.addSupplier(supplierInput);
      expect(saved._id).toBeDefined();
      expect(service.suppliers_().some(s => s.name_hebrew === 'Osem')).toBe(true);
    });
  });
});