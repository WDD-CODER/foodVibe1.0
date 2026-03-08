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
import { PreparationRegistryService } from './preparation-registry.service';
import { MetadataRegistryService } from './metadata-registry.service';
import { TranslationService } from './translation.service';
import { MenuSectionCategoriesService } from './menu-section-categories.service';
import { LogisticsBaselineDataService } from './logistics-baseline-data.service';
import { LoggingService } from './logging.service';

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
  private readonly preparationRegistry = inject(PreparationRegistryService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  private readonly menuSectionCategories = inject(MenuSectionCategoriesService);
  private readonly logisticsBaselineData = inject(LogisticsBaselineDataService);
  private readonly translation = inject(TranslationService);
  private readonly userMsg = inject(UserMsgService);
  private readonly logging = inject(LoggingService);

  /**
   * Fetches demo JSON files, replaces PRODUCT_LIST, KITCHEN_SUPPLIERS, RECIPE_LIST, DISH_LIST,
   * EQUIPMENT_LIST, VENUE_PROFILES, and KITCHEN_PREPARATIONS in localStorage, then reloads all data services.
   */
  async loadDemoData(): Promise<void> {
    try {
      const [suppliers, products, recipes, dishes, equipment, venues, preparations, labels, sectionCategories, logisticsBaseline] = await Promise.all([
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-suppliers.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-products.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-recipes.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-dishes.json`)),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-equipment.json`).pipe(catchError(() => of([])))),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-venues.json`).pipe(catchError(() => of([])))),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-kitchen-preparations.json`).pipe(catchError(() => of([])))),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-labels.json`).pipe(catchError(() => of([])))),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-section-categories.json`).pipe(catchError(() => of([])))),
        firstValueFrom(this.http.get<unknown[]>(`${ASSETS}/demo-logistics-baseline.json`).pipe(catchError(() => of([])))),
      ]);

      await this.storage.replaceAll('KITCHEN_SUPPLIERS', suppliers ?? []);
      await this.storage.replaceAll('PRODUCT_LIST', products ?? []);
      await this.storage.replaceAll('RECIPE_LIST', recipes ?? []);
      await this.storage.replaceAll('DISH_LIST', dishes ?? []);
      await this.storage.replaceAll('EQUIPMENT_LIST', equipment ?? []);
      await this.storage.replaceAll('VENUE_PROFILES', venues ?? []);
      await this.storage.replaceAll('KITCHEN_PREPARATIONS', Array.isArray(preparations) ? preparations : []);
      if (Array.isArray(labels) && labels.length > 0) {
        await this.storage.replaceAll('KITCHEN_LABELS', labels);
      }
      await this.storage.replaceAll('MENU_SECTION_CATEGORIES', Array.isArray(sectionCategories) ? sectionCategories : []);
      await this.storage.replaceAll('LOGISTICS_BASELINE_ITEMS', Array.isArray(logisticsBaseline) ? logisticsBaseline : []);

      await Promise.all([
        this.supplierData.reloadFromStorage(),
        this.productData.reloadFromStorage(),
        this.recipeData.reloadFromStorage(),
        this.dishData.reloadFromStorage(),
        this.equipmentData.reloadFromStorage(),
        this.venueData.reloadFromStorage(),
        this.preparationRegistry.reloadFromStorage(),
        this.metadataRegistry.reloadLabelsFromStorage(),
        this.menuSectionCategories.reloadFromStorage(),
        this.logisticsBaselineData.reloadFromStorage(),
      ]);

      await this.translation.loadGlobalDictionary();

      this.userMsg.onSetSuccessMsg('נתוני הדגמה נטענו בהצלחה');
    } catch (err) {
      this.logging.error({ event: 'demo.load_error', message: 'Demo load failed', context: { err } });
      this.userMsg.onSetErrorMsg('שגיאה בטעינת נתוני הדגמה');
    }
  }
}
