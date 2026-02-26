import { Injectable, signal, computed, inject } from '@angular/core';
import { from, throwError, of, Observable } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { UserMsgService } from './user-msg.service';
import { ProductDataService } from './product-data.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { SupplierDataService } from './supplier-data.service';
import { ActivityLogService, ActivityChange } from './activity-log.service';
import { VersionHistoryService } from './version-history.service';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  private productDataService = inject(ProductDataService);
  private recipeDataService = inject(RecipeDataService);
  private dishDataService = inject(DishDataService);
  private supplierDataService = inject(SupplierDataService);
  private userMsgService = inject(UserMsgService);
  private activityLogService = inject(ActivityLogService);
  private versionHistoryService = inject(VersionHistoryService);

  // CORE SIGNALS
  products_ = computed(() => this.productDataService.allProducts_());
  /** Combined recipes (preparations) + dishes for ingredient search and lookup. */
  recipes_ = computed(() => [
    ...this.recipeDataService.allRecipes_(),
    ...this.dishDataService.allDishes_()
  ]);
  suppliers_ = computed(() => this.supplierDataService.allSuppliers_());
  selectedProductId_ = signal<string | null>(null);
  isDrawerOpen_ = signal<boolean>(false);

  // COMPUTED SIGNALS
  lowStockProducts_ = computed(() =>
    this.products_().filter(p => p.min_stock_level_ > 0)
  );

  saveProduct(product: Product): Observable<void> {
    const isUpdate = !!(product._id && product._id.trim() !== '');

    const isDuplicate = this.products_().some(p =>
      p.name_hebrew.trim() === product.name_hebrew.trim() &&
      p._id !== product._id
    );

    if (isDuplicate) {
      this.userMsgService.onSetErrorMsg('כבר קיים חומר גלם בשם זה - לא ניתן לשמור');
      return throwError(() => new Error('Duplicate product name'));
    }

    if (isUpdate) {
      const previous = this.products_().find(p => p._id === product._id) ?? null;
      const changes = previous ? this.buildProductChanges(previous, product) : [];

      return from(
        previous
          ? this.versionHistoryService.addVersion({
              entityType: 'product',
              entityId: previous._id,
              entityName: previous.name_hebrew,
              snapshot: previous,
              changes,
            })
          : Promise.resolve()
      ).pipe(
        switchMap(() => from(this.productDataService.updateProduct(product))),
        tap(() => {
          this.userMsgService.onSetSuccessMsg('המוצר עודכן בהצלחה');
          this.activityLogService.recordActivity({
            action: 'updated',
            entityType: 'product',
            entityId: product._id,
            entityName: product.name_hebrew,
            changes,
          });
        }),
        map(() => undefined as void),
        catchError(err => {
          this.userMsgService.onSetErrorMsg('שגיאה בעדכון המוצר');
          return throwError(() => err);
        })
      );
    } else {
      // Create path – use saved product to get the new _id
      return from(this.productDataService.addProduct(product as Omit<Product, '_id'>)).pipe(
        tap((saved) => {
          this.userMsgService.onSetSuccessMsg('חומר גלם נוסף בהצלחה');
          this.activityLogService.recordActivity({
            action: 'created',
            entityType: 'product',
            entityId: saved._id,
            entityName: saved.name_hebrew,
            changes: [],
          });
        }),
        map(() => undefined as void),
        catchError(err => {
          this.userMsgService.onSetErrorMsg('שגיאה בהוספת המוצר');
          return throwError(() => err);
        })
      );
    }
  }

  /** Build structured change list between two products for activity log. */
  private buildProductChanges(prev: Product, next: Product): ActivityChange[] {
    const changes: ActivityChange[] = [];

    if (prev.name_hebrew !== next.name_hebrew) {
      changes.push({
        field: 'name',
        label: 'activity_field_name',
        from: prev.name_hebrew,
        to: next.name_hebrew,
      });
    }
    if (prev.buy_price_global_ !== next.buy_price_global_) {
      changes.push({
        field: 'price',
        label: 'activity_field_price',
        from: `${prev.buy_price_global_} ₪`,
        to: `${next.buy_price_global_} ₪`,
      });
    }
    if (prev.base_unit_ !== next.base_unit_) {
      changes.push({
        field: 'unit',
        label: 'activity_field_unit',
        from: prev.base_unit_,
        to: next.base_unit_,
      });
    }
    const prevSupp = (prev.supplierIds_ ?? []).slice().sort().join(',');
    const nextSupp = (next.supplierIds_ ?? []).slice().sort().join(',');
    if (prevSupp !== nextSupp) {
      changes.push({
        field: 'supplier',
        label: 'activity_field_supplier',
        from: prevSupp || undefined,
        to: nextSupp || undefined,
      });
    }
    const prevCat = (prev.categories_ ?? []).slice().sort().join(',');
    const nextCat = (next.categories_ ?? []).slice().sort().join(',');
    if (prevCat !== nextCat) {
      changes.push({
        field: 'category',
        label: 'activity_field_category',
        from: prevCat || undefined,
        to: nextCat || undefined,
      });
    }
    const prevAll = (prev.allergens_ ?? []).slice().sort().join(',');
    const nextAll = (next.allergens_ ?? []).slice().sort().join(',');
    if (prevAll !== nextAll) {
      changes.push({
        field: 'allergens',
        label: 'activity_field_allergens',
        from: prevAll || undefined,
        to: nextAll || undefined,
      });
    }
    if ((prev.min_stock_level_ ?? 0) !== (next.min_stock_level_ ?? 0)) {
      changes.push({
        field: 'min_stock_level',
        label: 'activity_field_min_stock',
        from: String(prev.min_stock_level_ ?? 0),
        to: String(next.min_stock_level_ ?? 0),
      });
    }
    if ((prev.expiry_days_default_ ?? 0) !== (next.expiry_days_default_ ?? 0)) {
      changes.push({
        field: 'expiry_days_default',
        label: 'activity_field_expiry_days',
        from: String(prev.expiry_days_default_ ?? 0),
        to: String(next.expiry_days_default_ ?? 0),
      });
    }
    if (Math.abs((prev.yield_factor_ ?? 1) - (next.yield_factor_ ?? 1)) > 0.001) {
      changes.push({
        field: 'yield_factor',
        label: 'activity_field_yield_factor',
        from: String(prev.yield_factor_ ?? 1),
        to: String(next.yield_factor_ ?? 1),
      });
    }
    if ((prev.purchase_options_?.length ?? 0) !== (next.purchase_options_?.length ?? 0)) {
      const prevUnits = (prev.purchase_options_ ?? []).map(o => o.unit_symbol_).join(', ');
      const nextUnits = (next.purchase_options_ ?? []).map(o => o.unit_symbol_).join(', ');
      changes.push({
        field: 'purchase_options',
        label: 'activity_field_purchase_options',
        from: prevUnits || undefined,
        to: nextUnits || undefined,
      });
    } else if ((prev.purchase_options_?.length ?? 0) > 0) {
      const prevOpts = JSON.stringify(prev.purchase_options_ ?? []);
      const nextOpts = JSON.stringify(next.purchase_options_ ?? []);
      if (prevOpts !== nextOpts) {
        const prevUnits = (prev.purchase_options_ ?? []).map(o => o.unit_symbol_).join(', ');
        const nextUnits = (next.purchase_options_ ?? []).map(o => o.unit_symbol_).join(', ');
        changes.push({
          field: 'purchase_options',
          label: 'activity_field_purchase_options',
          from: prevUnits || undefined,
          to: nextUnits || undefined,
        });
      }
    }
    return changes;
  }

  deleteProduct(_id: string): Observable<void> {
    const existing = this.products_().find(p => p._id === _id);
    const entityName = existing?.name_hebrew ?? _id;

    return of(null).pipe(
      switchMap(() => {
        const exists = this.products_().some(p => p._id === _id);
        if (!exists) return throwError(() => new Error('NOT_FOUND'));

        return from(this.productDataService.deleteProduct(_id));
      }),
      tap(() => {
        this.userMsgService.onSetSuccessMsg('חומר הגלם נמחק בהצלחה');
        this.activityLogService.recordActivity({
          action: 'deleted',
          entityType: 'product',
          entityId: _id,
          entityName,
        });
      }),
      catchError(err => {
        const msg = err.message === 'NOT_FOUND' ? 'הפריט לא נמצא' : 'שגיאה בעת המחיקה';
        this.userMsgService.onSetErrorMsg(msg);
        return throwError(() => err);
      })
    );
  }

  // RECIPE / DISH CRUD
  deleteRecipe(recipe: Recipe): Observable<void> {
    const isDish = recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.mise_categories_?.length);
    const operation$ = isDish
      ? from(this.dishDataService.deleteDish(recipe._id))
      : from(this.recipeDataService.deleteRecipe(recipe._id));

    return operation$.pipe(
      tap(() => {
        const msg = isDish ? 'המנה נמחקה בהצלחה' : 'המתכון נמחק בהצלחה';
        this.userMsgService.onSetSuccessMsg(msg);
        this.activityLogService.recordActivity({
          action: 'deleted',
          entityType: isDish ? 'dish' : 'recipe',
          entityId: recipe._id,
          entityName: recipe.name_hebrew,
        });
      }),
      catchError(() => {
        const errorMsg = isDish ? 'שגיאה במחיקת המנה' : 'שגיאה במחיקת המתכון';
        this.userMsgService.onSetErrorMsg(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  saveRecipe(recipe: Recipe): Observable<Recipe> {
    const isDish = recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.mise_categories_?.length);
    const isUpdate = !!(recipe._id && recipe._id.trim() !== '');
    const previous = isUpdate ? this.recipes_().find(r => r._id === recipe._id) : null;
    const previousIsDish = previous
      ? (previous.recipe_type_ === 'dish' || !!(previous.prep_items_?.length || previous.mise_categories_?.length))
      : false;
    const typeChanged = isUpdate && !!previous && previousIsDish !== isDish;
    const entityType = isDish ? 'dish' as const : 'recipe' as const;
    const previousEntityType = previousIsDish ? 'dish' as const : 'recipe' as const;

    const recordVersion$ =
      isUpdate && previous
        ? from(
            this.versionHistoryService.addVersion({
              entityType: typeChanged ? previousEntityType : entityType,
              entityId: previous._id,
              entityName: previous.name_hebrew,
              snapshot: previous,
              changes: this.buildRecipeChanges(previous, recipe),
            })
          )
        : from(Promise.resolve());

    const operation$ = typeChanged
      ? recordVersion$.pipe(
          switchMap(() => this.deleteRecipe(previous)),
          switchMap(() => {
            const { _id: _omit, ...payload } = recipe as Recipe & { _id?: string };
            return isDish
              ? from(this.dishDataService.addDish(payload as Omit<Recipe, '_id'>))
              : from(this.recipeDataService.addRecipe(payload as Omit<Recipe, '_id'>));
          })
        )
      : recordVersion$.pipe(
          switchMap(() =>
            isDish
              ? (isUpdate
                  ? from(this.dishDataService.updateDish(recipe))
                  : from(this.dishDataService.addDish(recipe as Omit<Recipe, '_id'>)))
              : (isUpdate
                  ? from(this.recipeDataService.updateRecipe(recipe))
                  : from(this.recipeDataService.addRecipe(recipe as Omit<Recipe, '_id'>)))
          )
        );

    const fallbackErrorMsg = isDish
      ? (isUpdate ? 'שגיאה בעדכון המנה' : 'שגיאה בשמירת המנה')
      : (isUpdate ? 'שגיאה בעדכון המתכון' : 'שגיאה בשמירת המתכון');

    return operation$.pipe(
      tap((saved) => {
        const msg = typeChanged
          ? 'המתכון/המנה שונה לסוג החדש ונשמר בהצלחה'
          : isDish
            ? (isUpdate ? 'המנה עודכנה בהצלחה' : 'המנה נשמרה בהצלחה')
            : (isUpdate ? 'המתכון עודכן בהצלחה' : 'המתכון נשמר בהצלחה');
        this.userMsgService.onSetSuccessMsg(msg);
        const changes = isUpdate && previous ? this.buildRecipeChanges(previous, saved) : [];
        this.activityLogService.recordActivity({
          action: typeChanged ? 'created' : (isUpdate ? 'updated' : 'created'),
          entityType: isDish ? 'dish' : 'recipe',
          entityId: saved._id,
          entityName: saved.name_hebrew,
          changes,
        });
      }),
      catchError((err: unknown) => {
        const msg =
          (err && typeof err === 'object' && (err as { error?: { message?: string } }).error?.message) ||
          (err instanceof Error ? err.message : null) ||
          fallbackErrorMsg;
        this.userMsgService.onSetErrorMsg(String(msg));
        return throwError(() => (err instanceof Error ? err : new Error(String(msg))));
      })
    );
  }

  /** Build structured change list between two recipes/dishes for activity log. */
  private buildRecipeChanges(prev: Recipe, next: Recipe): ActivityChange[] {
    const changes: ActivityChange[] = [];

    if (prev.name_hebrew !== next.name_hebrew) {
      changes.push({
        field: 'name',
        label: 'activity_field_name',
        from: prev.name_hebrew,
        to: next.name_hebrew,
      });
    }
    if ((prev.ingredients_?.length ?? 0) !== (next.ingredients_?.length ?? 0)) {
      changes.push({
        field: 'ingredients_count',
        label: 'activity_field_ingredients_count',
        from: String(prev.ingredients_?.length ?? 0),
        to: String(next.ingredients_?.length ?? 0),
      });
    }
    if ((prev.steps_?.length ?? 0) !== (next.steps_?.length ?? 0)) {
      changes.push({
        field: 'steps_count',
        label: 'activity_field_steps_count',
        from: String(prev.steps_?.length ?? 0),
        to: String(next.steps_?.length ?? 0),
      });
    }
    if ((prev.yield_amount_ ?? 0) !== (next.yield_amount_ ?? 0) || (prev.yield_unit_ ?? '') !== (next.yield_unit_ ?? '')) {
      changes.push({
        field: 'yield',
        label: 'activity_field_yield',
        from: `${prev.yield_amount_ ?? 0} ${prev.yield_unit_ ?? ''}`.trim(),
        to: `${next.yield_amount_ ?? 0} ${next.yield_unit_ ?? ''}`.trim(),
      });
    }
    if ((prev.prep_items_?.length ?? 0) !== (next.prep_items_?.length ?? 0)) {
      changes.push({
        field: 'prep_items',
        label: 'activity_field_prep_items',
        from: String(prev.prep_items_?.length ?? 0),
        to: String(next.prep_items_?.length ?? 0),
      });
    }
    return changes;
  }

  // SUPPLIER CRUD
  async addSupplier(supplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    return this.supplierDataService.addSupplier(supplier);
  }
}