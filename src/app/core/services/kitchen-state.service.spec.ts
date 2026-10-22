import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { KitchenStateService } from './kitchen-state.service'
import { ProductDataService } from './product-data.service'
import { RecipeDataService } from './recipe-data.service'
import { DishDataService } from './dish-data.service'
import { SupplierDataService } from './supplier-data.service'
import { UserMsgService } from './user-msg.service'
import { Product } from '../models/product.model'
import { Recipe } from '../models/recipe.model'
import { Supplier } from '@models/supplier.model'
import { signal, WritableSignal } from '@angular/core'
import { ActivityLogService } from './activity-log.service'

describe('KitchenStateService', () => {
  let service: KitchenStateService
  let productDataSpy: jasmine.SpyObj<ProductDataService>
  let recipeDataSpy: jasmine.SpyObj<RecipeDataService>
  let userMsgSpy: jasmine.SpyObj<UserMsgService>
  let activityLogSpy: jasmine.SpyObj<ActivityLogService>

  const mockAllItemsSignal: WritableSignal<any[]> = signal<any[]>([])
  const mockRecipesSignal: WritableSignal<Recipe[]> = signal<Recipe[]>([])
  const mockDishesSignal: WritableSignal<Recipe[]> = signal<Recipe[]>([])
  const mockSuppliersSignal: WritableSignal<Supplier[]> = signal<Supplier[]>([])

  const createMockProduct = (_id: string): Product => ({
    _id,
    nameHebrew: 'מוצר בדיקה',
    categories: ['Dry'],
    sources: [{ supplierId: 's1', price: 10, addedAt: Date.now() }],
    purchaseOptions: [],
    baseUnit: 'gram',
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 3
  })

  beforeEach(() => {
    mockAllItemsSignal.set([])
    mockRecipesSignal.set([])

    const iSpy = jasmine.createSpyObj('ProductDataService', ['addProduct', 'updateProduct', 'deleteProduct'], {
      allProducts_: mockAllItemsSignal
    })
    iSpy.allProducts_ = mockAllItemsSignal

    const rSpy = jasmine.createSpyObj('RecipeDataService', ['addRecipe', 'updateRecipe', 'getRecipeById'], {
      allRecipes_: mockRecipesSignal
    })
    rSpy.allRecipes_ = mockRecipesSignal

    const dSpy = jasmine.createSpyObj('DishDataService', ['addDish', 'updateDish', 'getDishById'], {
      allDishes_: mockDishesSignal
    })
    dSpy.allDishes_ = mockDishesSignal

    const uSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])

    const supplierSpy = jasmine.createSpyObj('SupplierDataService', ['addSupplier'], {
      allSuppliers_: mockSuppliersSignal
    })
    supplierSpy.addSupplier.and.callFake(async (s: Omit<Supplier, '_id'>) => {
      const saved = { ...s, _id: 's1' } as Supplier
      mockSuppliersSignal.set([...mockSuppliersSignal(), saved])
      return saved
    })

    const aSpy = jasmine.createSpyObj('ActivityLogService', ['recordActivity'])

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        KitchenStateService,
        { provide: ProductDataService, useValue: iSpy },
        { provide: RecipeDataService, useValue: rSpy },
        { provide: DishDataService, useValue: dSpy },
        { provide: SupplierDataService, useValue: supplierSpy },
        { provide: UserMsgService, useValue: uSpy },
        { provide: ActivityLogService, useValue: aSpy }
      ]
    })

    service = TestBed.inject(KitchenStateService)
    productDataSpy = TestBed.inject(ProductDataService) as jasmine.SpyObj<ProductDataService>
    recipeDataSpy = TestBed.inject(RecipeDataService) as jasmine.SpyObj<RecipeDataService>
    userMsgSpy = TestBed.inject(UserMsgService) as jasmine.SpyObj<UserMsgService>
    activityLogSpy = TestBed.inject(ActivityLogService) as jasmine.SpyObj<ActivityLogService>
  })

  describe('Initialization & Sync', () => {
    it('should sync products_ signal when ProductDataService signal updates', () => {
      const mockRawItem = {
        _id: 'p1',
        nameHebrew: 'Tomato',
        categories: ['Veg']
      } as any

      // Update signal and trigger Angular effects
      mockAllItemsSignal.set([mockRawItem])
      TestBed.flushEffects()

      expect(service.products_().length).toBe(1)
      expect(service.products_()[0].nameHebrew).toBe('Tomato')
    })
  })

  describe('Product CRUD', () => {
    it('should call saveProduct (add) and show success message', (done) => {
      const product = createMockProduct('') // Empty ID triggers add
      const savedProduct = { ...product, _id: 'p-new' }
      productDataSpy.addProduct.and.returnValue(Promise.resolve(savedProduct))

      // FIXED: Method name in service is saveProduct
      void service.saveProduct(product).then(() => {
        expect(productDataSpy.addProduct).toHaveBeenCalled()
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('product_added_success')
        expect(activityLogSpy.recordActivity).toHaveBeenCalled()
        done()
      })
    })

    it('plan 484: an update that keeps the name saves even when a twin has it', async () => {
      const mine = { ...createMockProduct('p1'), nameHebrew: 'מלפפון' }
      const twin = { ...createMockProduct('p2'), nameHebrew: 'מלפפון' }
      mockAllItemsSignal.set([mine, twin])
      TestBed.flushEffects()
      productDataSpy.updateProduct.and.returnValue(Promise.resolve())
      await service.saveProduct({ ...mine, buy_price_global_: 5 } as Product)
      expect(productDataSpy.updateProduct).toHaveBeenCalled()
      expect(userMsgSpy.onSetErrorMsg).not.toHaveBeenCalledWith('product_duplicate_name_error')
    })

    it('plan 484: an update renamed to a taken name is refused', async () => {
      const mine = { ...createMockProduct('p1'), nameHebrew: 'מלפפון' }
      const other = { ...createMockProduct('p2'), nameHebrew: 'כרובית' }
      mockAllItemsSignal.set([mine, other])
      TestBed.flushEffects()
      await expectAsync(service.saveProduct({ ...mine, nameHebrew: ' כרובית' })).toBeRejected()
      expect(productDataSpy.updateProduct).not.toHaveBeenCalled()
      expect(userMsgSpy.onSetErrorMsg).toHaveBeenCalledWith('product_duplicate_name_error')
    })

    it('plan 485: a server name clash shows the duplicate-name message', async () => {
      mockAllItemsSignal.set([])
      TestBed.flushEffects()
      productDataSpy.addProduct.and.returnValue(
        Promise.reject(new HttpErrorResponse({ status: 409, error: { error: 'PRODUCT_NAME_TAKEN' } }))
      )
      await expectAsync(service.saveProduct({ ...createMockProduct(''), nameHebrew: 'מלפפון' })).toBeRejected()
      expect(userMsgSpy.onSetErrorMsg).toHaveBeenCalledWith('product_duplicate_name_error')
    })

    it('should delete product if exists and show success', (done) => {
      const mockProduct = createMockProduct('p-del')
      mockAllItemsSignal.set([mockProduct])

      // FIXED: ProductDataService uses deleteProduct
      productDataSpy.deleteProduct.and.returnValue(Promise.resolve())

      void service.deleteProduct('p-del').then(() => {
        expect(productDataSpy.deleteProduct).toHaveBeenCalledWith('p-del')
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('product_deleted_success')
        expect(activityLogSpy.recordActivity).toHaveBeenCalled()
        done()
      })
    })

    it('should throw error and show message if deleting non-existent product', (done) => {
      mockAllItemsSignal.set([])
      TestBed.flushEffects()

      service.deleteProduct('none').catch((err: Error) => {
        expect(err.message).toBe('NOT_FOUND')
        // FIX: Align with the actual string in kitchen-state.service.ts
        expect(userMsgSpy.onSetErrorMsg).toHaveBeenCalledWith('item_not_found_error')
        done()
      })
    })
  })

  describe('Recipe CRUD', () => {
    it('should call addRecipe for preparation and show success message', (done) => {
      const recipe = {
        _id: '',
        nameHebrew: 'Hummus',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'portion',
        defaultStation: '',
        isApproved: true
      } as Recipe
      recipeDataSpy.addRecipe.and.returnValue(Promise.resolve({ ...recipe, _id: 'r1' }))

      void service.saveRecipe(recipe).then(() => {
        expect(recipeDataSpy.addRecipe).toHaveBeenCalled()
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('recipe_saved_success')
        expect(activityLogSpy.recordActivity).toHaveBeenCalled()
        done()
      })
    })

    it('should call addDish for dish and show success message', (done) => {
      const dish = {
        _id: '',
        nameHebrew: 'Salad',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'מנה',
        defaultStation: '',
        isApproved: true,
        prepItems: [{ preparationName: 'Chopped lettuce', categoryName: 'veg', quantity: 1, unit: 'unit' }]
      } as Recipe
      const dishDataSpy = TestBed.inject(DishDataService) as jasmine.SpyObj<DishDataService>
      dishDataSpy.addDish.and.returnValue(Promise.resolve({ ...dish, _id: 'd1' }))

      void service.saveRecipe(dish).then(() => {
        expect(dishDataSpy.addDish).toHaveBeenCalled()
        expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledWith('dish_saved_success')
        expect(activityLogSpy.recordActivity).toHaveBeenCalled()
        done()
      })
    })

    it('should send an empty logistics baseline instead of a legacy null (plan 403)', (done) => {
      const legacy = {
        _id: 'r1',
        nameHebrew: 'Hummus',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'portion',
        defaultStation: '',
        isApproved: true,
        logistics: null
      } as unknown as Recipe
      recipeDataSpy.updateRecipe.and.callFake((r: Recipe) => Promise.resolve(r))

      void service.saveRecipe(legacy).then(() => {
        expect(recipeDataSpy.updateRecipe).toHaveBeenCalledWith(
          jasmine.objectContaining({ logistics: { baseline: [] } })
        )
        done()
      })
    })
  })

  describe('Direct State Updates', () => {
    it('should sync recipes_ from RecipeDataService and DishDataService', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Hummus',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'portion',
        defaultStation: '',
        isApproved: true
      }
      const dish: Recipe = {
        _id: 'd1',
        nameHebrew: 'Salad',
        prepItems: [],
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'portion',
        defaultStation: '',
        isApproved: true
      }
      mockRecipesSignal.set([recipe])
      mockDishesSignal.set([dish])
      TestBed.flushEffects()
      expect(service.recipes_()).toContain(recipe)
      expect(service.recipes_()).toContain(dish)
    })

    it('should update suppliers_ signal with valid type conversion', async () => {
      const supplierInput = {
        nameHebrew: 'Osem',
        deliveryDays: [1],
        minOrderMov: 100,
        leadTimeDays: 1
      } as Omit<Supplier, '_id'>
      const saved = await service.addSupplier(supplierInput)
      expect(saved._id).toBeDefined()
      expect(service.suppliers_().some((s) => s.nameHebrew === 'Osem')).toBe(true)
    })
  })
})
