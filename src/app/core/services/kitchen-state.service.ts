import { Injectable, signal, computed, inject } from '@angular/core';
import { from, throwError, of, Observable } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';
import { UserMsgService } from './user-msg.service';
import { ProductDataService } from './product-data.service';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  private productDataService = inject(ProductDataService);
  private userMsgService = inject(UserMsgService);

  // CORE SIGNALS
  // Reactive bridge to the Data Service
  products_ = computed(() => this.productDataService.allProducts_());
  recipes_ = signal<Recipe[]>([]);
  suppliers_ = signal<Supplier[]>([]);
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

  // RECIPE CRUD
  addRecipe(recipe: Recipe) {
    this.recipes_.update(recipes => [...recipes, recipe]);
  }

  // SUPPLIER CRUD
  addSupplier(supplier: Supplier) {
    this.suppliers_.update(suppliers => [...suppliers, supplier]);
  }
}