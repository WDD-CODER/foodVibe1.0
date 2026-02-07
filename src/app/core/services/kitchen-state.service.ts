import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { from, throwError, of, Observable } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { UserMsgService } from './user-msg.service';
import { KitchenUnit } from '@models/units.enum';
import { ItemDataService } from './items-data.service';

const ENTITY = 'item_list';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {

  // INJECTIONS
  private itemsDataService = inject(ItemDataService);
  private userMsgService = inject(UserMsgService);

  // CORE SIGNALS
  products_ = signal<Product[]>([]);
  recipes_ = signal<Recipe[]>([]);
  suppliers_ = signal<Supplier[]>([]);
  selectedProductId_ = signal<string | null>(null);
  isDrawerOpen_ = signal<boolean>(false);

  // COMPUTED SIGNALS
  lowStockItems_ = computed(() =>
    this.products_().filter(p => p.min_stock_level_ > 0)
  );

  // INITIALIZATION
  constructor() {
    this._initProductStream();
  }


  private _initProductStream(): void {
    effect(() => {
      try {
        const rawItems = this.itemsDataService.allItems_();

        // If warehouse is empty, kitchen is empty
        if (!rawItems || rawItems.length === 0) {
          this.products_.set([]);
          return;
        }

        // Map raw ItemLedger[] to Product[]
        const migratedProducts = rawItems.map(item => this._mapToProduct(item));

        this.products_.set(migratedProducts);

      } catch (err) {
        this.userMsgService.onSetErrorMsg('שגיאה בסנכרון נתוני המטבח');
        console.error('Migration Sync Error:', err);
      }
    });
  }



  // CREATE
  addProduct(product: Product) {
    // 1. Prepare: Convert the Product model back to the ItemLedger (legacy) schema if needed
    // This ensures the ItemDataService receives the data shape it expects
    const rawItem = this._mapProductToLedger(product);

    // 2. The Pipeline: Use from() to wrap the Promise from ItemDataService
    return from(this.itemsDataService.addItem(rawItem)).pipe(
      tap(() => {
        // SUCCESS: The Signal (products_) will update automatically 
        // because it's a computed() signal watching itemDataService.allItems_()
        this.userMsgService.onSetSuccessMsg('חומר גלם נוסף בהצלחה');
      }),
      catchError(err => {
        // ERROR: System feedback
        this.userMsgService.onSetErrorMsg('שגיאה בתהליך הוספת המוצר');
        return throwError(() => err);
      })
    );
  }


  // UPDATE
  updateProduct(updatedProduct: Product) {
    // 1. Prepare: Convert the Product model back to the ItemLedger schema
    const rawItem = this._mapProductToLedger(updatedProduct);

    // 2. The Pipeline: Delegate the storage work to the Data Service
    return from(this.itemsDataService.updateItem(rawItem)).pipe(
      tap(() => {
        // SUCCESS: The computed products_ signal updates automatically
        // because ItemDataService.updateItem internally updates its itemsStore_
        this.userMsgService.onSetSuccessMsg('המוצר עודכן בהצלחה');
      }),
      catchError(err => {
        // ERROR: System feedback
        this.userMsgService.onSetErrorMsg('שגיאה בעדכון המוצר');
        return throwError(() => err);
      })
    );
  }

  // DELETE
  deleteProduct(_id: string): Observable<void> {
    // Use 'defer' or 'of' to ensure the logic runs only upon subscription
    return of(null).pipe(
      switchMap(() => {
        const exists = this.products_().some(p => p._id === _id);
        console.log("🚀 ~ KitchenStateService ~ deleteProduct ~ exists:", exists)

        if (!exists) {
          // We throw a proper error object to the catch block
          return throwError(() => new Error('NOT_FOUND'));
        }

        // Delegate the actual DB removal to the 'Worker'
        return from(this.itemsDataService.deleteItem(_id));
      }),
      tap(() => {
        console.log('deleteItem')

        // Logic for Day 14: Success feedback only triggers if deletion worked [cite: 15]
        this.userMsgService.onSetSuccessMsg('חומר הגלם נמחק בהצלחה');
      }),
      catchError(err => {
        const msg = err.message === 'NOT_FOUND'
          ? 'הפריט לא נמצא במלאי'
          : 'שגיאת מערכת בעת המחיקה';

        this.userMsgService.onSetErrorMsg(msg);
        return throwError(() => err);
      })
    );
  }

  // RECIPE CRUD OPERATIONS
  addRecipe(recipe: Recipe) {
    this.recipes_.update(recipes => [...recipes, recipe]);
  }

  // SUPPLIER CRUD OPERATIONS
  addSupplier(supplier: Supplier) {
    this.suppliers_.update(suppliers => [...suppliers, supplier]);
  }

  // HELPERS
  private _mapToProduct(item: any): Product {
    const props = item['properties'] || {};
    const units = item['units'] || {};

    return {
      _id: item['_id'] || item['id'],
      name_hebrew: item['itemName'] || 'ללא שם',
      category_: props['topCategory'] || 'כללי',
      supplierId_: 'ספק כללי',
      purchase_price_: Number(props['gross_price_'] || 0),
      purchase_unit_: (units['purchase']?.['symbol'] || props['purchase_unit_'] || 'ק"ג') as KitchenUnit,
      base_unit_: (units['recipe']?.['symbol'] || props['uom'] || 'גרם') as KitchenUnit,
      conversion_factor_: Number(props['conversion_factor_'] || 1000),
      yield_factor_: Number(props['yieldFactor'] || 1),
      allergens_: item['allergenIds'] || [],
      min_stock_level_: 0,
      is_dairy_: false,
      expiry_days_default_: 3
    };
  }

  private _mapProductToLedger(product: Product): any {
    return {
      _id: product._id,
      itemName: product.name_hebrew,
      allergenIds: product.allergens_,
      properties: {
        topCategory: product.category_,
        purchasePrice: product.purchase_price_,
        conversion_factor_: product.conversion_factor_,
        yieldFactor: product.yield_factor_,
        waste_percent_: (1 - product.yield_factor_) * 100
      },
      units: {
        purchase: { symbol: product.purchase_unit_ },
        recipe: { symbol: product.base_unit_ }
      }
    };
  }

}