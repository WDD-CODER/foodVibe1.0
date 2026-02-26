import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './async-storage.service';
import { ProductDataService } from './product-data.service';
import { SupplierDataService } from './supplier-data.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { UserMsgService } from './user-msg.service';

const ASSETS = 'assets/data';

@Injectable({ providedIn: 'root' })
export class DemoLoaderService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly productData = inject(ProductDataService);
  private readonly supplierData = inject(SupplierDataService);
  private readonly recipeData = inject(RecipeDataService);
  private readonly dishData = inject(DishDataService);
  private readonly userMsg = inject(UserMsgService);

  /**
   * Fetches demo JSON files, replaces PRODUCT_LIST, KITCHEN_SUPPLIERS, RECIPE_LIST, and DISH_LIST
   * in localStorage, then reloads all data services. Does not touch VERSION_HISTORY or TRASH_* keys.
   */
  async loadDemoData(): Promise<void> {
    try {
      const [suppliers, products, recipes, dishes] = await Promise.all([
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-suppliers.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-products.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-recipes.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-dishes.json`)),
      ]);

      await this.storage.replaceAll('KITCHEN_SUPPLIERS', suppliers ?? []);
      await this.storage.replaceAll('PRODUCT_LIST', products ?? []);
      await this.storage.replaceAll('RECIPE_LIST', recipes ?? []);
      await this.storage.replaceAll('DISH_LIST', dishes ?? []);

      await Promise.all([
        this.supplierData.reloadFromStorage(),
        this.productData.reloadFromStorage(),
        this.recipeData.reloadFromStorage(),
        this.dishData.reloadFromStorage(),
      ]);

      this.userMsg.onSetSuccessMsg('נתוני הדגמה נטענו בהצלחה');
    } catch (err) {
      console.error('Demo load failed:', err);
      this.userMsg.onSetErrorMsg('שגיאה בטעינת נתוני הדגמה');
    }
  }
}
