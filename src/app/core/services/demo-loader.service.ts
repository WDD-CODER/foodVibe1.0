import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StorageService } from './async-storage.service';
import { ProductDataService } from './product-data.service';
import { SupplierDataService } from './supplier-data.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { EquipmentDataService } from './equipment-data.service';
import { VenueDataService } from './venue-data.service';
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
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly venueData = inject(VenueDataService);
  private readonly userMsg = inject(UserMsgService);

  /**
   * Fetches demo JSON files, replaces PRODUCT_LIST, KITCHEN_SUPPLIERS, RECIPE_LIST, DISH_LIST,
   * EQUIPMENT_LIST, and VENUE_PROFILES in localStorage, then reloads all data services.
   */
  async loadDemoData(): Promise<void> {
    try {
      const [suppliers, products, recipes, dishes, equipment, venues] = await Promise.all([
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-suppliers.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-products.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-recipes.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-dishes.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-equipment.json`).pipe(catchError(() => of([])))),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-venues.json`).pipe(catchError(() => of([])))),
      ]);

      await this.storage.replaceAll('KITCHEN_SUPPLIERS', suppliers ?? []);
      await this.storage.replaceAll('PRODUCT_LIST', products ?? []);
      await this.storage.replaceAll('RECIPE_LIST', recipes ?? []);
      await this.storage.replaceAll('DISH_LIST', dishes ?? []);
      await this.storage.replaceAll('EQUIPMENT_LIST', equipment ?? []);
      await this.storage.replaceAll('VENUE_PROFILES', venues ?? []);

      await Promise.all([
        this.supplierData.reloadFromStorage(),
        this.productData.reloadFromStorage(),
        this.recipeData.reloadFromStorage(),
        this.dishData.reloadFromStorage(),
        this.equipmentData.reloadFromStorage(),
        this.venueData.reloadFromStorage(),
      ]);

      this.userMsg.onSetSuccessMsg('נתוני הדגמה נטענו בהצלחה');
    } catch (err) {
      console.error('Demo load failed:', err);
      this.userMsg.onSetErrorMsg('שגיאה בטעינת נתוני הדגמה');
    }
  }
}
