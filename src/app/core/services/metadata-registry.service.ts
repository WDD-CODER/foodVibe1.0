import { Injectable, signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ProductDataService } from './product-data.service'
import { UserMsgService } from './user-msg.service'
import { StorageService, type EntityId } from './async-storage.service'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { KeyResolutionService } from './key-resolution.service'
import { LABEL_COLOR_PALETTE, type LabelDefinition } from '@models/label.model'
import type { CourseDefinition } from '@models/course.model'
import { type MenuTypeDefinition, type DishFieldKey, DEFAULT_DISH_FIELDS } from '@models/menu-event.model'

/** Single-document registry shape returned by storage for metadata keys. */
interface RegistryDoc<T> {
  _id?: string
  items: T[]
}

/** Payload for put/post (must extend EntityId). */
type RegistryPayload<T> = EntityId & { items: T[] }

/**
 * Course/category strings seeded on first load, per userId. Sourced from Plan 319's live
 * label audit (.claude/reports/label-audit/data.json) — every distinct orphan string that
 * was NOT one of the genuine dietary-label duplicates merged in Plan 320 Milestone 1.
 * Kept as-is (no course x protein-type split) per product decision.
 */
const DEFAULT_COURSES = [
  'amuse_bouche',
  'bakery',
  'bread_focaccia_savory_baking',
  'cakes_cookies_tarts',
  'charcuterie_meat_mass_meat_preps',
  'conversions_and_techniques',
  'dan_and_adi_cooking_from_the_orchard',
  'dan_and_adi_dishes_from_the_orchard',
  'desserts',
  'fermentation_curing_pickling',
  'fish_shellfish_sauce',
  'foams_hot_cold',
  'general_preps',
  'grains_side_dish',
  'ideas_dishes',
  'ideas_preparations',
  'jams_sweet_preps_syrup',
  'legume_side_dish',
  'main_dish_chicken',
  'main_dish_fish',
  'main_dish_meat',
  'main_dish_vegetarian',
  'main_seafood',
  'meat_sauce',
  'oils_and_infusions',
  'pasta_dish',
  'pasta_prep',
  'pastry_sweets',
  'pork_dish',
  'powders_spice_mixes_dry_preps',
  'pre_dessert',
  'salad_sauce',
  'salads',
  'salads_fresh_side_dish',
  'salty_baking_doughs',
  'sauces_cold_hot_savory',
  'side_dish',
  'sorbet_ice_cream_granita',
  'soups',
  'soups_stocks_cooking_liquids',
  'soups_up',
  'special_for_boss',
  'special_main_for_boss',
  'special_starter_for_boss',
  'spreads_dips_salty_creams',
  'starch_side_dish',
  'starter',
  'starter_chicken',
  'starter_fish',
  'starter_meat',
  'starter_seafood',
  'starter_vegetarian',
  'stews_cookery',
  'sweet_baking_doughs',
  'sweet_creams_custards_mousse',
  'sweet_sauce',
  'trash_category',
  'vegetable_side_dish',
  'vegetables_snacks_add_ons',
  'vinaigrettes_mayonnaise_emulsion',
  'גלייז',
  'סלט',
  'רוטב'
]

@Injectable({ providedIn: 'root' })
export class MetadataRegistryService {
  private readonly userMsgService = inject(UserMsgService)
  private readonly productDataService = inject(ProductDataService)
  private readonly storageService = inject(StorageService)
  private readonly logging = inject(LoggingService)
  private readonly translationService = inject(TranslationService)
  private readonly keyResolution = inject(KeyResolutionService)

  //PRIVATE SIGNALS
  private categories = signal<string[]>([])
  private allergens = signal<string[]>([])
  private labels = signal<LabelDefinition[]>([])
  private courseDefs_ = signal<CourseDefinition[]>([])
  private menuTypes_ = signal<MenuTypeDefinition[]>([])

  //PUBLIC SIGNALS
  public allCategories_ = this.categories.asReadonly()
  public allAllergens_ = this.allergens.asReadonly()
  public allLabels_ = this.labels.asReadonly()
  public courses_ = this.courseDefs_.asReadonly()
  public allMenuTypes_ = this.menuTypes_.asReadonly()

  private initPromise_: Promise<void> | null = null

  constructor() {
    this.initPromise_ = this.initMetadata()
      .catch(() => {})
      .finally(() => {
        this.initPromise_ = null
      })
  }

  /** Reload all metadata signals from storage after a backup import/restore. */
  async reloadFromStorage(): Promise<void> {
    if (this.initPromise_) {
      // A load is already in flight — e.g. this service was just constructed via
      // injector.get() and its constructor's initMetadata() hasn't resolved yet.
      // Await it instead of firing a redundant concurrent fetch for the same data.
      await this.initPromise_
      return
    }
    await this.initMetadata()
  }

  private async persistRegistry<T>(storageKey: string, items: T[]): Promise<void> {
    const registries = await this.storageService.query<RegistryDoc<T>>(storageKey)
    const existing = registries[0]
    if (existing?._id) {
      await this.storageService.put(storageKey, { ...existing, items } as RegistryPayload<T>)
    } else {
      await this.storageService.post(storageKey, { items } as RegistryPayload<T>)
    }
  }

  private async initMetadata() {
    try {
      const DEFAULT_CATEGORIES = ['vegetables', 'dairy', 'meat', 'dry', 'fish', 'spices']
      const DEFAULT_ALLERGENS = [
        'gluten',
        'eggs',
        'peanuts',
        'nuts',
        'soy',
        'milk_solids',
        'sesame',
        'fish',
        'shellfish',
        'seafood'
      ]

      // 1. Fetch Categories
      const catRegistry = await this.storageService.query<RegistryDoc<string>>('KITCHEN_CATEGORIES')
      const existingCats = catRegistry[0]?.items || []

      if (existingCats.length === 0) {
        await this.persistRegistry('KITCHEN_CATEGORIES', DEFAULT_CATEGORIES)
        this.categories.set(DEFAULT_CATEGORIES)
      } else {
        this.categories.set(existingCats)
      }

      // 2. Fetch Allergens (Same Logic)
      const allergenRegistry = await this.storageService.query<RegistryDoc<string>>('KITCHEN_ALLERGENS')
      const existingAllergens = allergenRegistry[0]?.items || []

      if (existingAllergens.length === 0) {
        await this.persistRegistry('KITCHEN_ALLERGENS', DEFAULT_ALLERGENS)
        this.allergens.set(DEFAULT_ALLERGENS)
      } else {
        this.allergens.set(existingAllergens)
      }

      // 3. Fetch Labels (recipe labels with color + optional auto-triggers)
      await this.reloadLabelsFromStorage()

      // 4. Fetch Courses (recipe course/category, single-select) — seed defaults if empty
      const courseRegistry = await this.storageService.query<RegistryDoc<CourseDefinition>>('KITCHEN_COURSES')
      const existingCourses = courseRegistry[0]?.items ?? []
      if (existingCourses.length === 0) {
        const seeded = DEFAULT_COURSES.map((key, i) => ({
          key,
          color: LABEL_COLOR_PALETTE[i % LABEL_COLOR_PALETTE.length]
        }))
        await this.persistRegistry('KITCHEN_COURSES', seeded)
        this.courseDefs_.set(seeded)
      } else {
        this.courseDefs_.set(existingCourses)
      }

      // 5. Fetch Menu Types (serving-style config with dish-row fields)
      const defaultMenuTypes: MenuTypeDefinition[] = [
        { key: 'buffet_family', fields: [...DEFAULT_DISH_FIELDS] },
        { key: 'plated_course', fields: [...DEFAULT_DISH_FIELDS] },
        { key: 'cocktail_passed', fields: ['food_cost_pct', 'serving_portions_pct'] }
      ]
      const menuTypeRegistry = await this.storageService.query<RegistryDoc<MenuTypeDefinition>>('MENU_TYPES')
      const existingMenuTypes = menuTypeRegistry[0]?.items ?? []
      if (Array.isArray(existingMenuTypes) && existingMenuTypes.length > 0) {
        this.menuTypes_.set(existingMenuTypes)
      } else {
        await this.persistRegistry('MENU_TYPES', defaultMenuTypes)
        this.menuTypes_.set(defaultMenuTypes)
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.metadata.hydrate_error', message: 'Failed to load metadata', context: { err } })
    }
  }

  getMenuTypeFields(key: string): DishFieldKey[] {
    const def = this.menuTypes_().find((t) => t.key === key)
    return def?.fields ?? [...DEFAULT_DISH_FIELDS]
  }

  async registerMenuType(def: MenuTypeDefinition): Promise<void> {
    const key = def.key.trim()
    if (!key || this.menuTypes_().some((t) => t.key === key)) return
    const updated = [...this.menuTypes_(), { key, fields: def.fields ?? [...DEFAULT_DISH_FIELDS] }]
    try {
      await this.persistRegistry('MENU_TYPES', updated)
      this.menuTypes_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" נוסף בהצלחה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת סוג התפריט')
      this.logging.error({
        event: 'crud.metadata.menuType.save_error',
        message: 'MenuType save error',
        context: { err }
      })
    }
  }

  async updateMenuType(key: string, fields: DishFieldKey[]): Promise<void> {
    const current = this.menuTypes_()
    const idx = current.findIndex((t) => t.key === key)
    if (idx === -1) return
    const updated = current.slice()
    updated[idx] = { ...updated[idx], fields }
    try {
      await this.persistRegistry('MENU_TYPES', updated)
      this.menuTypes_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" עודכן`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בעדכון סוג התפריט')
      this.logging.error({
        event: 'crud.metadata.menuType.update_error',
        message: 'MenuType update error',
        context: { err }
      })
    }
  }

  async deleteMenuType(key: string): Promise<void> {
    const updated = this.menuTypes_().filter((t) => t.key !== key)
    try {
      await this.persistRegistry('MENU_TYPES', updated)
      this.menuTypes_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" נמחק`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת סוג התפריט')
      this.logging.error({
        event: 'crud.metadata.menuType.delete_error',
        message: 'MenuType delete error',
        context: { err }
      })
    }
  }

  async renameMenuType(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.menuTypes_().some((t) => t.key === trimmed)) {
      this.userMsgService.onSetErrorMsg(`סוג תפריט "${trimmed}" כבר קיים`)
      return
    }
    const current = this.menuTypes_()
    const idx = current.findIndex((t) => t.key === oldKey)
    if (idx === -1) return
    const def = current[idx]
    const updated = current.slice()
    updated[idx] = { key: trimmed, fields: def.fields }
    try {
      await this.persistRegistry('MENU_TYPES', updated)
      this.menuTypes_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג תפריט שונה ל-"${trimmed}"`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשינוי שם סוג התפריט')
      this.logging.error({
        event: 'crud.metadata.menuType.rename_error',
        message: 'MenuType rename error',
        context: { err }
      })
    }
  }

  getLabelColor(key: string): string {
    const def = this.labels().find((l) => l.key === key)
    return def?.color ?? '#78716C'
  }

  /** Reload labels from storage (e.g. after demo data load). */
  async reloadLabelsFromStorage(): Promise<void> {
    try {
      const labelRegistry = await this.storageService.query<RegistryDoc<LabelDefinition>>('KITCHEN_LABELS')
      const items = labelRegistry[0]?.items ?? []
      this.labels.set(Array.isArray(items) ? items : [])
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({
        event: 'crud.metadata.labels.hydrate_error',
        message: 'Failed to load labels',
        context: { err }
      })
    }
  }

  async registerLabel(key: string, color: string, autoTriggers?: string[]): Promise<void> {
    const sanitized = key.trim()
    if (!sanitized || this.labels().some((l) => l.key === sanitized)) return
    const updated = [...this.labels(), { key: sanitized, color: color || '#78716C', autoTriggers: autoTriggers ?? [] }]
    try {
      await this.persistRegistry('KITCHEN_LABELS', updated)
      this.labels.set(updated)
      this.userMsgService.onSetSuccessMsg(`תווית "${sanitized}" נוספה בהצלחה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת התווית')
      this.logging.error({ event: 'crud.metadata.label.save_error', message: 'Label save error', context: { err } })
    }
  }

  async deleteLabel(key: string): Promise<void> {
    const updated = this.labels().filter((l) => l.key !== key)
    try {
      await this.persistRegistry('KITCHEN_LABELS', updated)
      this.labels.set(updated)
      this.userMsgService.onSetSuccessMsg(`תווית ${key} נמחקה בהצלחה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת התווית')
      this.logging.error({ event: 'crud.metadata.label.delete_error', message: 'Label delete error', context: { err } })
    }
  }

  async updateLabel(key: string, changes: Partial<LabelDefinition>): Promise<void> {
    const current = this.labels()
    const idx = current.findIndex((l) => l.key === key)
    if (idx === -1) return
    const updated = current.slice()
    updated[idx] = { ...updated[idx], ...changes }
    try {
      await this.persistRegistry('KITCHEN_LABELS', updated)
      this.labels.set(updated)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בעדכון התווית')
      this.logging.error({ event: 'crud.metadata.label.update_error', message: 'Label update error', context: { err } })
    }
  }

  async renameLabel(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.labels().some((l) => l.key === trimmed)) {
      this.userMsgService.onSetErrorMsg(`התווית "${trimmed}" כבר קיימת`)
      return
    }
    const current = this.labels()
    const idx = current.findIndex((l) => l.key === oldKey)
    if (idx === -1) return
    const updated = current.slice()
    updated[idx] = { ...updated[idx], key: trimmed }
    try {
      await this.persistRegistry('KITCHEN_LABELS', updated)
      this.labels.set(updated)
      this.userMsgService.onSetSuccessMsg(`התווית שונתה ל-"${trimmed}"`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשינוי שם התווית')
      this.logging.error({ event: 'crud.metadata.label.rename_error', message: 'Label rename error', context: { err } })
    }
  }

  /** Reload courses from storage (e.g. after demo data load). */
  async reloadCoursesFromStorage(): Promise<void> {
    try {
      const courseRegistry = await this.storageService.query<RegistryDoc<CourseDefinition>>('KITCHEN_COURSES')
      const items = courseRegistry[0]?.items ?? []
      this.courseDefs_.set(Array.isArray(items) ? items : [])
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({
        event: 'crud.metadata.courses.hydrate_error',
        message: 'Failed to load courses',
        context: { err }
      })
    }
  }

  async registerCourse(name: string): Promise<void> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'course')
    if (!keyToUse) return
    const sanitized = keyToUse.trim()
    if (!sanitized || this.courseDefs_().some((c) => c.key === sanitized)) return
    const usedColors = new Set(this.courseDefs_().map((c) => c.color))
    const color = LABEL_COLOR_PALETTE.find((c) => !usedColors.has(c)) ?? LABEL_COLOR_PALETTE[0]
    const updated = [...this.courseDefs_(), { key: sanitized, color }]
    try {
      await this.persistRegistry('KITCHEN_COURSES', updated)
      this.courseDefs_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג מנה "${sanitized}" נוסף בהצלחה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת סוג המנה')
      this.logging.error({ event: 'crud.metadata.course.save_error', message: 'Course save error', context: { err } })
    }
  }

  async deleteCourse(key: string): Promise<void> {
    const updated = this.courseDefs_().filter((c) => c.key !== key)
    try {
      await this.persistRegistry('KITCHEN_COURSES', updated)
      this.courseDefs_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג מנה ${key} נמחק בהצלחה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת סוג המנה')
      this.logging.error({
        event: 'crud.metadata.course.delete_error',
        message: 'Course delete error',
        context: { err }
      })
    }
  }

  async renameCourse(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.courseDefs_().some((c) => c.key === trimmed)) {
      this.userMsgService.onSetErrorMsg(`סוג המנה "${trimmed}" כבר קיים`)
      return
    }
    const current = this.courseDefs_()
    const idx = current.findIndex((c) => c.key === oldKey)
    if (idx === -1) return
    const updated = current.slice()
    updated[idx] = { ...updated[idx], key: trimmed }
    try {
      await this.persistRegistry('KITCHEN_COURSES', updated)
      this.courseDefs_.set(updated)
      this.userMsgService.onSetSuccessMsg(`סוג המנה שונה ל-"${trimmed}"`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשינוי שם סוג המנה')
      this.logging.error({
        event: 'crud.metadata.course.rename_error',
        message: 'Course rename error',
        context: { err }
      })
    }
  }

  async purgeGlobalUnit(unitSymbol: string): Promise<void> {
    const affectedProducts = this.productDataService.allProducts_().filter((p) => p.baseUnit === unitSymbol)

    // LOGIC CHANGE: Standardized fallback to English 'gram' [cite: 407, 413]
    for (const p of affectedProducts) {
      await this.productDataService.updateProduct({ ...p, baseUnit: 'gram' })
    }
  }

  /** Resolves a category name to its canonical key (may open the translation modal) without registering it. */
  resolveCategoryKey(name: string): Promise<string | null> {
    return this.keyResolution.ensureKeyForContext(name, 'category')
  }

  /** Resolves an allergen name to its canonical key (may open the translation modal) without registering it. */
  resolveAllergenKey(name: string): Promise<string | null> {
    return this.keyResolution.ensureKeyForContext(name, 'allergen')
  }

  async registerAllergen(name: string): Promise<string | null> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'allergen')
    if (!keyToUse) return null
    if (this.allergens().includes(keyToUse)) return keyToUse

    const updated: string[] = [...this.allergens(), keyToUse]

    try {
      await this.persistRegistry('KITCHEN_ALLERGENS', updated)
      this.allergens.set(updated)
      this.userMsgService.onSetSuccessMsg(`אלרגן "${keyToUse}" נוסף בהצלחה`)
      return keyToUse
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return null
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת האלרגן')
      this.logging.error({
        event: 'crud.metadata.allergen.save_error',
        message: 'Allergen save error',
        context: { err }
      })
      return null
    }
  }

  async registerCategory(name: string): Promise<string | null> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'category')
    if (!keyToUse) return null
    if (this.categories().includes(keyToUse)) return keyToUse

    const updatedCategories: string[] = [...this.categories(), keyToUse]

    try {
      await this.persistRegistry('KITCHEN_CATEGORIES', updatedCategories)
      this.categories.set(updatedCategories)
      this.userMsgService.onSetSuccessMsg(`הקטגוריה "${keyToUse}" נוספה בהצלחה`)
      return keyToUse
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return null
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת הקטגוריה')
      this.logging.error({
        event: 'crud.metadata.category.save_error',
        message: 'Category save error',
        context: { err }
      })
      return null
    }
  }

  async deleteCategory(name: string): Promise<void> {
    const updated = this.categories().filter((c) => c !== name)

    try {
      await this.persistRegistry('KITCHEN_CATEGORIES', updated)
      this.categories.set(updated)
      this.userMsgService.onSetSuccessMsg(`הקטגוריה ${name} נמחקה בהצלחה`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת הקטגוריה מהשרת')
      this.logging.error({
        event: 'crud.metadata.category.delete_error',
        message: 'Category delete error',
        context: { err }
      })
    }
  }

  async renameCategory(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.categories().includes(trimmed)) {
      this.userMsgService.onSetErrorMsg(`הקטגוריה "${trimmed}" כבר קיימת`)
      return
    }
    const current = this.categories()
    if (!current.includes(oldKey)) return
    const updated = current.map((c) => (c === oldKey ? trimmed : c))
    try {
      await this.persistRegistry('KITCHEN_CATEGORIES', updated)
      this.categories.set(updated)
      this.userMsgService.onSetSuccessMsg(`הקטגוריה שונתה ל-"${trimmed}"`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשינוי שם הקטגוריה')
      this.logging.error({
        event: 'crud.metadata.category.rename_error',
        message: 'Category rename error',
        context: { err }
      })
    }
  }

  /** Plan 322 (+ M4 fix, 2026-09-30): pushes this item into __master__'s own registry doc —
   *  renames it in place if master already has `oldKey`, otherwise ADDS it as a new entry
   *  (upsert). The plain rename-only version silently 404'd for any label/course the admin
   *  created themselves and never pushed before, which is the common case, not an edge case —
   *  "save for everyone" must work for a brand-new item too, not just a correction to one
   *  master already had. `itemData` carries color/autoTriggers for the object-shaped registries
   *  (label/course) so a first-time add doesn't lose them; category/allergen are plain strings. */
  async pushRegistryRenameToMaster(
    type: 'label' | 'course' | 'category' | 'allergen',
    oldKey: string,
    newKey: string,
    itemData?: { color?: string; autoTriggers?: string[] }
  ): Promise<void> {
    const entityType = {
      label: 'KITCHEN_LABELS',
      course: 'KITCHEN_COURSES',
      category: 'KITCHEN_CATEGORIES',
      allergen: 'KITCHEN_ALLERGENS'
    }[type]
    await this.storageService.pushRegistryRenameToMaster(entityType, oldKey, newKey, itemData)
  }

  /** Plan 322 M10: mirror of pushRegistryRenameToMaster above, for DELETE. Removes `key` from
   *  __master__'s own registry doc, then (per Human's explicit 2026-09-30 decision, same class
   *  of cross-user operation as M8's purgeProductIngredientEverywhere) also strips it from every
   *  OTHER user's own recipes/dishes/products. Dev-only, deliberate exception — see the server
   *  route's own comment. */
  async pushRegistryDeleteToMaster(type: 'label' | 'course' | 'category' | 'allergen', key: string): Promise<void> {
    const entityType = {
      label: 'KITCHEN_LABELS',
      course: 'KITCHEN_COURSES',
      category: 'KITCHEN_CATEGORIES',
      allergen: 'KITCHEN_ALLERGENS'
    }[type]
    await this.storageService.pushRegistryDeleteToMaster(entityType, key)
  }

  async renameAllergen(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.allergens().includes(trimmed)) {
      this.userMsgService.onSetErrorMsg(`האלרגן "${trimmed}" כבר קיים`)
      return
    }
    const current = this.allergens()
    if (!current.includes(oldKey)) return
    const updated = current.map((a) => (a === oldKey ? trimmed : a))
    try {
      await this.persistRegistry('KITCHEN_ALLERGENS', updated)
      this.allergens.set(updated)
      this.userMsgService.onSetSuccessMsg(`האלרגן שונה ל-"${trimmed}"`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה בשינוי שם האלרגן')
      this.logging.error({
        event: 'crud.metadata.allergen.rename_error',
        message: 'Allergen rename error',
        context: { err }
      })
    }
  }

  async deleteAllergen(name: string): Promise<void> {
    const updated = this.allergens().filter((a) => a !== name)

    try {
      await this.persistRegistry('KITCHEN_ALLERGENS', updated)
      this.allergens.set(updated)
      this.userMsgService.onSetSuccessMsg(`האלרגן ${name} נמחק`)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת האלרגן מהשרת')
      this.logging.error({
        event: 'crud.metadata.allergen.delete_error',
        message: 'Allergen delete error',
        context: { err }
      })
    }
  }
}
