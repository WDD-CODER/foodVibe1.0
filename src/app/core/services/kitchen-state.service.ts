import { Injectable, signal, computed, inject } from '@angular/core';
import { from, throwError, of, Observable } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { UserMsgService } from './user-msg.service';
import { ProductDataService } from './product-data.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { SupplierDataService } from './supplier-data.service';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  private productDataService = inject(ProductDataService);
  private recipeDataService = inject(RecipeDataService);
  private dishDataService = inject(DishDataService);
  private supplierDataService = inject(SupplierDataService);
  private userMsgService = inject(UserMsgService);

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
    const operation$ = isUpdate
      ? from(this.productDataService.updateProduct(product))
      : from(this.productDataService.addProduct(product));

    return operation$.pipe(
      tap(() => {
        const msg = isUpdate ? 'המוצר עודכן בהצלחה' : 'חומר גלם נוסף בהצלחה';
        this.userMsgService.onSetSuccessMsg(msg);
      }),
      catchError(err => {
        const errorMsg = isUpdate ? 'שגיאה בעדכון המוצר' : 'שגיאה בהוספת המוצר';
        this.userMsgService.onSetErrorMsg(errorMsg);
        return throwError(() => err);
      })
    );
  }

  deleteProduct(_id: string): Observable<void> {
    return of(null).pipe(
      switchMap(() => {
        const exists = this.products_().some(p => p._id === _id);
        if (!exists) return throwError(() => new Error('NOT_FOUND'));

        return from(this.productDataService.deleteProduct(_id));
      }),
      tap(() => this.userMsgService.onSetSuccessMsg('חומר הגלם נמחק בהצלחה')),
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

    const operation$ = isDish
      ? (isUpdate
          ? from(this.dishDataService.updateDish(recipe))
          : from(this.dishDataService.addDish(recipe as Omit<Recipe, '_id'>)))
      : (isUpdate
          ? from(this.recipeDataService.updateRecipe(recipe))
          : from(this.recipeDataService.addRecipe(recipe as Omit<Recipe, '_id'>)));

    return operation$.pipe(
      tap((saved) => {
        const msg = isDish
          ? (isUpdate ? 'המנה עודכנה בהצלחה' : 'המנה נשמרה בהצלחה')
          : (isUpdate ? 'המתכון עודכן בהצלחה' : 'המתכון נשמר בהצלחה');
        this.userMsgService.onSetSuccessMsg(msg);
      }),
      catchError(() => {
        const errorMsg = isDish
          ? (isUpdate ? 'שגיאה בעדכון המנה' : 'שגיאה בשמירת המנה')
          : (isUpdate ? 'שגיאה בעדכון המתכון' : 'שגיאה בשמירת המתכון');
        this.userMsgService.onSetErrorMsg(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // SUPPLIER CRUD
  async addSupplier(supplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    return this.supplierDataService.addSupplier(supplier);
  }
}