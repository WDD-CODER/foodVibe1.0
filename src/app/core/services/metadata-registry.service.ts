import { Injectable, signal, computed, inject } from '@angular/core';
import { ProductDataService } from './product-data.service';
import { UserMsgService } from './user-msg.service';
import { StorageService } from './async-storage.service';
import type { LabelDefinition } from '@models/label.model';
import {
  type MenuTypeDefinition,
  type DishFieldKey,
  DEFAULT_DISH_FIELDS,
} from '@models/menu-event.model';

@Injectable({ providedIn: 'root' })
export class MetadataRegistryService {
  //INJECTIONS
  private readonly userMsgService = inject(UserMsgService);
  private readonly productDataService = inject(ProductDataService);
  private readonly storageService = inject(StorageService);

  //PRIVATE SIGNALS
  private categories_ = signal<string[]>([]);
  private allergens_ = signal<string[]>([]);
  private labels_ = signal<LabelDefinition[]>([]);
  private menuTypes_ = signal<MenuTypeDefinition[]>([]);

  //PUBLIC SIGNALS
  public allCategories_ = this.categories_.asReadonly();
  public allAllergens_ = this.allergens_.asReadonly();
  public allLabels_ = this.labels_.asReadonly();
  public allMenuTypes_ = this.menuTypes_.asReadonly();


  constructor() {
    this.initMetadata();
  }

  private async initMetadata() {
    const DEFAULT_CATEGORIES = ['vegetables', 'dairy', 'meat', 'dry', 'fish', 'spices'];
    const DEFAULT_ALLERGENS = ['gluten', 'eggs', 'peanuts', 'nuts', 'soy', 'milk_solids', 'sesame', 'fish', 'shellfish', 'seafood'];

    // 1. Fetch Categories
    const catRegistry = await this.storageService.query<any>('KITCHEN_CATEGORIES');
    const existingCats = catRegistry[0]?.items || [];

    if (existingCats.length === 0) {
      if (catRegistry[0]?._id) {
        await this.storageService.put('KITCHEN_CATEGORIES', { ...catRegistry[0], items: DEFAULT_CATEGORIES });
      } else {
        await this.storageService.post('KITCHEN_CATEGORIES', { items: DEFAULT_CATEGORIES });
      }
      this.categories_.set(DEFAULT_CATEGORIES);
    } else {
      this.categories_.set(existingCats);
    }

    // 2. Fetch Allergens (Same Logic)
    const allergenRegistry = await this.storageService.query<any>('KITCHEN_ALLERGENS');
    const existingAllergens = allergenRegistry[0]?.items || [];

    if (existingAllergens.length === 0) {
      if (allergenRegistry[0]?._id) {
        await this.storageService.put('KITCHEN_ALLERGENS', { ...allergenRegistry[0], items: DEFAULT_ALLERGENS });
      } else {
        await this.storageService.post('KITCHEN_ALLERGENS', { items: DEFAULT_ALLERGENS });
      }
      this.allergens_.set(DEFAULT_ALLERGENS);
    } else {
      this.allergens_.set(existingAllergens);
    }

    // 3. Fetch Labels (recipe labels with color + optional auto-triggers)
    const labelRegistry = await this.storageService.query<any>('KITCHEN_LABELS');
    const existingLabels = labelRegistry[0]?.items ?? [];
    if (Array.isArray(existingLabels) && existingLabels.length > 0) {
      this.labels_.set(existingLabels);
    }

    // 4. Fetch Menu Types (serving-style config with dish-row fields)
    const defaultMenuTypes: MenuTypeDefinition[] = [
      { key: 'buffet_family', fields: [...DEFAULT_DISH_FIELDS] },
      { key: 'plated_course', fields: [...DEFAULT_DISH_FIELDS] },
      { key: 'cocktail_passed', fields: ['food_cost_pct', 'serving_portions_pct'] },
    ];
    const menuTypeRegistry = await this.storageService.query<any>('MENU_TYPES');
    const existingMenuTypes = menuTypeRegistry[0]?.items ?? [];
    if (Array.isArray(existingMenuTypes) && existingMenuTypes.length > 0) {
      this.menuTypes_.set(existingMenuTypes);
    } else {
      if (menuTypeRegistry[0]?._id) {
        await this.storageService.put('MENU_TYPES', { ...menuTypeRegistry[0], items: defaultMenuTypes });
      } else {
        await this.storageService.post('MENU_TYPES', { items: defaultMenuTypes });
      }
      this.menuTypes_.set(defaultMenuTypes);
    }
  }

  getMenuTypeFields(key: string): DishFieldKey[] {
    const def = this.menuTypes_().find(t => t.key === key);
    return def?.fields ?? [...DEFAULT_DISH_FIELDS];
  }

  async registerMenuType(def: MenuTypeDefinition): Promise<void> {
    const key = def.key.trim();
    if (!key || this.menuTypes_().some(t => t.key === key)) return;
    const updated = [...this.menuTypes_(), { key, fields: def.fields ?? [...DEFAULT_DISH_FIELDS] }];
    try {
      const registries = await this.storageService.query<any>('MENU_TYPES');
      const existing = registries[0];
      if (existing?._id) {
        await this.storageService.put('MENU_TYPES', { ...existing, items: updated });
      } else {
        await this.storageService.post('MENU_TYPES', { items: updated });
      }
      this.menuTypes_.set(updated);
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" נוסף בהצלחה`);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת סוג התפריט');
      console.error('MenuType Save Error:', err);
    }
  }

  async updateMenuType(key: string, fields: DishFieldKey[]): Promise<void> {
    const current = this.menuTypes_();
    const idx = current.findIndex(t => t.key === key);
    if (idx === -1) return;
    const updated = current.slice();
    updated[idx] = { ...updated[idx], fields };
    try {
      const registries = await this.storageService.query<any>('MENU_TYPES');
      const registry = registries[0];
      if (registry?._id) {
        await this.storageService.put('MENU_TYPES', { ...registry, items: updated });
      } else {
        await this.storageService.post('MENU_TYPES', { items: updated });
      }
      this.menuTypes_.set(updated);
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" עודכן`);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בעדכון סוג התפריט');
      console.error(err);
    }
  }

  async deleteMenuType(key: string): Promise<void> {
    const updated = this.menuTypes_().filter(t => t.key !== key);
    try {
      const registries = await this.storageService.query<any>('MENU_TYPES');
      const registry = registries[0];
      if (registry?._id) {
        await this.storageService.put('MENU_TYPES', { ...registry, items: updated });
      } else {
        await this.storageService.post('MENU_TYPES', { items: updated });
      }
      this.menuTypes_.set(updated);
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" נמחק`);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת סוג התפריט');
      console.error(err);
    }
  }

  getLabelColor(key: string): string {
    const def = this.labels_().find(l => l.key === key);
    return def?.color ?? '#78716C';
  }

  async registerLabel(key: string, color: string, autoTriggers?: string[]): Promise<void> {
    const sanitized = key.trim();
    if (!sanitized || this.labels_().some(l => l.key === sanitized)) return;
    const updated = [...this.labels_(), { key: sanitized, color: color || '#78716C', autoTriggers: autoTriggers ?? [] }];
    try {
      const registries = await this.storageService.query<any>('KITCHEN_LABELS');
      const existing = registries[0];
      if (existing?._id) {
        await this.storageService.put('KITCHEN_LABELS', { ...existing, items: updated });
      } else {
        await this.storageService.post('KITCHEN_LABELS', { items: updated });
      }
      this.labels_.set(updated);
      this.userMsgService.onSetSuccessMsg(`תווית "${sanitized}" נוספה בהצלחה`);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת התווית');
      console.error('Label Save Error:', err);
    }
  }

  async deleteLabel(key: string): Promise<void> {
    const updated = this.labels_().filter(l => l.key !== key);
    try {
      const registries = await this.storageService.query<any>('KITCHEN_LABELS');
      const registry = registries[0];
      if (registry?._id) {
        await this.storageService.put('KITCHEN_LABELS', { ...registry, items: updated });
      } else {
        await this.storageService.post('KITCHEN_LABELS', { items: updated });
      }
      this.labels_.set(updated);
      this.userMsgService.onSetSuccessMsg(`תווית ${key} נמחקה בהצלחה`);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת התווית');
      console.error(err);
    }
  }

  async updateLabel(key: string, changes: Partial<LabelDefinition>): Promise<void> {
    const current = this.labels_();
    const idx = current.findIndex(l => l.key === key);
    if (idx === -1) return;
    const updated = current.slice();
    updated[idx] = { ...updated[idx], ...changes };
    try {
      const registries = await this.storageService.query<any>('KITCHEN_LABELS');
      const registry = registries[0];
      if (registry?._id) {
        await this.storageService.put('KITCHEN_LABELS', { ...registry, items: updated });
      } else {
        await this.storageService.post('KITCHEN_LABELS', { items: updated });
      }
      this.labels_.set(updated);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בעדכון התווית');
      console.error(err);
    }
  }

  async purgeGlobalUnit(unitSymbol: string): Promise<void> {
    const affectedProducts = this.productDataService.allProducts_()
      .filter(p => p.base_unit_ === unitSymbol);

    // LOGIC CHANGE: Standardized fallback to English 'gram' [cite: 407, 413]
    for (const p of affectedProducts) {
      await this.productDataService.updateProduct({ ...p, base_unit_: 'gram' });
    }
  }

  async registerAllergen(name: string): Promise<void> {
    const sanitized = name.trim();
    if (!sanitized || this.allergens_().includes(sanitized)) return;

    const updated = [...this.allergens_(), sanitized];

    try {
      const registries = await this.storageService.query<any>('KITCHEN_ALLERGENS');
      const registry = registries[0];

      if (registry?._id) {
        await this.storageService.put('KITCHEN_ALLERGENS', { ...registry, items: updated });
      } else {
        await this.storageService.post('KITCHEN_ALLERGENS', { items: updated });
      }

      this.allergens_.set(updated);
      this.userMsgService.onSetSuccessMsg(`אלרגן "${sanitized}" נוסף בהצלחה`);
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת האלרגן');
    }
  }

  async registerCategory(name: string): Promise<void> {
    const sanitized = name.trim();
    // Validation: Check if empty or already exists in the signal
    if (!sanitized || this.categories_().includes(sanitized)) return;

    // 1. Calculate the new state
    const updatedCategories = [...this.categories_(), sanitized];

    try {
      // 2. Persistence Logic (POST vs PUT)
      // Query the storageService for the metadata collection
      const registries = await this.storageService.query<any>('KITCHEN_CATEGORIES');
      const existingRegistry = registries[0]; // We maintain one document for categories

      if (existingRegistry && existingRegistry._id) {
        // Registry exists -> Update it (PUT)
        await this.storageService.put('KITCHEN_CATEGORIES', {
          ...existingRegistry,
          items: updatedCategories
        });
      } else {
        // Registry doesn't exist -> Create it (POST)
        await this.storageService.post('KITCHEN_CATEGORIES', {
          items: updatedCategories
        });
      }

      // 3. Update the Signal for UI reactivity
      this.categories_.set(updatedCategories);
      this.userMsgService.onSetSuccessMsg(`הקטגוריה "${sanitized}" נוספה בהצלחה`);

    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת הקטגוריה');
      console.error('Category Save Error:', err);
    }
  }

async deleteCategory(name: string): Promise<void> {
  // 1. מחשבים את הרשימה החדשה (יכולה להיות [])
  const updated = this.categories_().filter(c => c !== name);

  try {
    // 2. סנכרון מול ה-Storage
    const registries = await this.storageService.query<any>('KITCHEN_CATEGORIES');
    const registry = registries[0];

    if (registry?._id) {
      await this.storageService.put('KITCHEN_CATEGORIES', {
        ...registry,
        items: updated // כאן אנחנו שומרים את המערך כפי שהוא, גם אם הוא ריק
      });

      // 3. עדכון ה-UI
      this.categories_.set(updated);
      this.userMsgService.onSetSuccessMsg(`הקטגוריה ${name} נמחקה בהצלחה`);
    }
  } catch (err) {
    this.userMsgService.onSetErrorMsg('שגיאה במחיקת הקטגוריה מהשרת');
    console.error(err);
  }
}

  async deleteAllergen(name: string): Promise<void> {
    // 1. Update UI immediately
    this.allergens_.update(list => list.filter(a => a !== name));

    try {
      // 2. Sync with "Server"
      const registries = await this.storageService.query<any>('KITCHEN_ALLERGENS');
      const registry = registries[0];

      if (registry?._id) {
        await this.storageService.put('KITCHEN_ALLERGENS', {
          ...registry,
          items: this.allergens_()
        });
        this.userMsgService.onSetSuccessMsg(`האלרגן ${name} נמחק`);
      }
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת האלרגן מהשרת');
    }
  }
}
