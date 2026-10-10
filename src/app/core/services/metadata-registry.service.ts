import { Injectable, computed, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ProductDataService } from './product-data.service'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
import { KeyResolutionService } from './key-resolution.service'
import { TaxonomyStore } from './taxonomy-store.service'
import type { TaxonomyKind } from '@models/v2'
import type { LabelDefinition } from '@models/label.model'
import type { CourseDefinition } from '@models/course.model'
import { type MenuTypeDefinition, type DishFieldKey, DEFAULT_DISH_FIELDS } from '@models/menu-event.model'

type PushableType = 'label' | 'course' | 'category' | 'allergen'
const KIND_BY_TYPE = { label: 'label', course: 'course', category: 'ingredientCategory', allergen: 'allergen' } as const
/** Dish types have no color (plan 375); the taxonomyTerms schema still requires one, so every course gets this. */
const COURSE_NEUTRAL_COLOR = '#78716C'

/**
 * Plan 321 Phase 3 — thin facade over TaxonomyStore for ingredient categories, allergens,
 * labels, courses and menu types. Same public API as the old single-doc registry service,
 * so call sites don't change. Shared terms come from master; there is no per-user seeding.
 */
@Injectable({ providedIn: 'root' })
export class MetadataRegistryService {
  private readonly userMsgService = inject(UserMsgService)
  private readonly productDataService = inject(ProductDataService)
  private readonly logging = inject(LoggingService)
  private readonly keyResolution = inject(KeyResolutionService)
  private readonly taxonomy = inject(TaxonomyStore)

  //PUBLIC SIGNALS
  public allCategories_ = computed(() =>
    this.taxonomy
      .terms('ingredientCategory')()
      .map((t) => t.key)
  )
  public allAllergens_ = computed(() =>
    this.taxonomy
      .terms('allergen')()
      .map((t) => t.key)
  )
  public allLabels_ = computed<LabelDefinition[]>(() =>
    this.taxonomy
      .terms('label')()
      .map(({ key, color, autoTriggers }) => ({ key, color, autoTriggers }))
  )
  public courses_ = computed<CourseDefinition[]>(() =>
    this.taxonomy
      .terms('course')()
      .map(({ key }) => ({ key }))
  )
  public allMenuTypes_ = computed<MenuTypeDefinition[]>(() =>
    this.taxonomy
      .terms('menuType')()
      .map(({ key, fields }) => ({ key, fields }))
  )

  constructor() {
    this.taxonomy.ensureLoaded().catch((err: unknown) => this.logLoadError(err))
  }

  /** Reload all metadata from storage (e.g. after a backup import/restore). */
  async reloadFromStorage(): Promise<void> {
    await this.taxonomy.reload().catch((err: unknown) => this.logLoadError(err))
  }

  /** Reload labels from storage (e.g. after demo data load). */
  reloadLabelsFromStorage(): Promise<void> {
    return this.reloadFromStorage()
  }

  /** Reload courses from storage (e.g. after demo data load). */
  reloadCoursesFromStorage(): Promise<void> {
    return this.reloadFromStorage()
  }

  // ── Menu types ──────────────────────────────────────────────────────────

  getMenuTypeFields(key: string): DishFieldKey[] {
    return this.taxonomy.find('menuType', key)?.fields ?? [...DEFAULT_DISH_FIELDS]
  }

  async registerMenuType(def: MenuTypeDefinition): Promise<void> {
    const key = def.key.trim()
    if (!key || this.taxonomy.find('menuType', key)) return
    await this.run('menuType.save', 'שגיאה בשמירת סוג התפריט', async () => {
      await this.taxonomy.add('menuType', key, { fields: def.fields ?? [...DEFAULT_DISH_FIELDS] })
      this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" נוסף בהצלחה`)
    })
  }

  async updateMenuType(key: string, fields: DishFieldKey[]): Promise<void> {
    await this.run('menuType.update', 'שגיאה בעדכון סוג התפריט', async () => {
      if (await this.taxonomy.updateByKey('menuType', key, { fields })) {
        this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" עודכן`)
      }
    })
  }

  deleteMenuType(key: string): Promise<void> {
    return this.removeTerm('menuType', key, 'שגיאה במחיקת סוג התפריט', `סוג תפריט "${key}" נמחק`)
  }

  renameMenuType(oldKey: string, newKey: string): Promise<void> {
    return this.renameTerm('menuType', oldKey, newKey, {
      exists: (k) => `סוג תפריט "${k}" כבר קיים`,
      error: 'שגיאה בשינוי שם סוג התפריט',
      success: (k) => `סוג תפריט שונה ל-"${k}"`
    })
  }

  // ── Labels ──────────────────────────────────────────────────────────────

  getLabelColor(key: string): string {
    return this.taxonomy.find('label', key)?.color ?? '#78716C'
  }

  async registerLabel(key: string, color: string, autoTriggers?: string[]): Promise<void> {
    const sanitized = key.trim()
    if (!sanitized || this.taxonomy.find('label', sanitized)) return
    await this.run('label.save', 'שגיאה בשמירת התווית', async () => {
      await this.taxonomy.add('label', sanitized, { color: color || '#78716C', autoTriggers: autoTriggers ?? [] })
      this.userMsgService.onSetSuccessMsg(`תווית "${sanitized}" נוספה בהצלחה`)
    })
  }

  deleteLabel(key: string): Promise<void> {
    return this.removeTerm('label', key, 'שגיאה במחיקת התווית', `תווית ${key} נמחקה בהצלחה`)
  }

  async updateLabel(key: string, changes: Partial<LabelDefinition>): Promise<void> {
    const { key: newKey, ...extras } = changes
    await this.run('label.update', 'שגיאה בעדכון התווית', async () => {
      await this.taxonomy.updateByKey('label', key, { ...extras, ...(newKey !== undefined && { key: newKey }) })
    })
  }

  renameLabel(oldKey: string, newKey: string): Promise<void> {
    return this.renameTerm('label', oldKey, newKey, {
      exists: (k) => `התווית "${k}" כבר קיימת`,
      error: 'שגיאה בשינוי שם התווית',
      success: (k) => `התווית שונתה ל-"${k}"`
    })
  }

  // ── Courses ─────────────────────────────────────────────────────────────

  async registerCourse(name: string): Promise<void> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'course')
    if (!keyToUse) return
    const sanitized = keyToUse.trim()
    if (!sanitized || this.taxonomy.find('course', sanitized)) return
    await this.run('course.save', 'שגיאה בשמירת סוג המנה', async () => {
      await this.taxonomy.add('course', sanitized, { color: COURSE_NEUTRAL_COLOR })
      this.userMsgService.onSetSuccessMsg(`סוג מנה "${sanitized}" נוסף בהצלחה`)
    })
  }

  deleteCourse(key: string): Promise<void> {
    return this.removeTerm('course', key, 'שגיאה במחיקת סוג המנה', `סוג מנה ${key} נמחק בהצלחה`)
  }

  renameCourse(oldKey: string, newKey: string): Promise<void> {
    return this.renameTerm('course', oldKey, newKey, {
      exists: (k) => `סוג המנה "${k}" כבר קיים`,
      error: 'שגיאה בשינוי שם סוג המנה',
      success: (k) => `סוג המנה שונה ל-"${k}"`
    })
  }

  // ── Units (product cleanup only — the unit list itself is UnitRegistryService) ──

  async purgeGlobalUnit(unitSymbol: string): Promise<void> {
    const affectedProducts = this.productDataService.allProducts_().filter((p) => p.baseUnit === unitSymbol)
    for (const p of affectedProducts) {
      await this.productDataService.updateProduct({ ...p, baseUnit: 'gram' })
    }
  }

  // ── Categories & allergens ──────────────────────────────────────────────

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
    if (this.taxonomy.find('allergen', keyToUse)) return keyToUse
    const ok = await this.run('allergen.save', 'שגיאה בשמירת האלרגן', async () => {
      await this.taxonomy.add('allergen', keyToUse, {})
      this.userMsgService.onSetSuccessMsg(`אלרגן "${keyToUse}" נוסף בהצלחה`)
    })
    return ok ? keyToUse : null
  }

  async registerCategory(name: string): Promise<string | null> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'category')
    if (!keyToUse) return null
    if (this.taxonomy.find('ingredientCategory', keyToUse)) return keyToUse
    const ok = await this.run('category.save', 'שגיאה בשמירת הקטגוריה', async () => {
      await this.taxonomy.add('ingredientCategory', keyToUse, {})
      this.userMsgService.onSetSuccessMsg(`הקטגוריה "${keyToUse}" נוספה בהצלחה`)
    })
    return ok ? keyToUse : null
  }

  deleteCategory(name: string): Promise<void> {
    return this.removeTerm('ingredientCategory', name, 'שגיאה במחיקת הקטגוריה מהשרת', `הקטגוריה ${name} נמחקה בהצלחה`)
  }

  renameCategory(oldKey: string, newKey: string): Promise<void> {
    return this.renameTerm('ingredientCategory', oldKey, newKey, {
      exists: (k) => `הקטגוריה "${k}" כבר קיימת`,
      error: 'שגיאה בשינוי שם הקטגוריה',
      success: (k) => `הקטגוריה שונתה ל-"${k}"`
    })
  }

  renameAllergen(oldKey: string, newKey: string): Promise<void> {
    return this.renameTerm('allergen', oldKey, newKey, {
      exists: (k) => `האלרגן "${k}" כבר קיים`,
      error: 'שגיאה בשינוי שם האלרגן',
      success: (k) => `האלרגן שונה ל-"${k}"`
    })
  }

  deleteAllergen(name: string): Promise<void> {
    return this.removeTerm('allergen', name, 'שגיאה במחיקת האלרגן מהשרת', `האלרגן ${name} נמחק`)
  }

  // ── Share with everyone (admin) ─────────────────────────────────────────

  /**
   * Makes an edit apply to everyone (admin only). Plan 321 Phase 3: terms are shared live, so
   * this renames the shared term `oldKey` (the server carries the new key into every user's
   * documents), or — when no shared term has `oldKey` — turns the admin's own `newKey` term into
   * a shared one. `itemData` supplies color/autoTriggers for a label that isn't own yet.
   */
  async pushRegistryRenameToMaster(
    type: PushableType,
    oldKey: string,
    newKey: string,
    itemData?: { color?: string; autoTriggers?: string[] }
  ): Promise<void> {
    const kind = KIND_BY_TYPE[type]
    const shared = this.taxonomy.find(kind, oldKey)
    if (shared && this.taxonomy.isShared(shared)) {
      if (oldKey !== newKey) await this.taxonomy.update(shared, { key: newKey })
      return
    }
    const own = this.taxonomy.find(kind, newKey)
    if (own && this.taxonomy.isShared(own)) return
    const share = { shared: true }
    if (kind === 'label') {
      const label = this.taxonomy.find('label', newKey)
      await this.taxonomy.add(
        'label',
        newKey,
        {
          color: label?.color ?? (itemData?.color || '#78716C'),
          autoTriggers: label?.autoTriggers ?? itemData?.autoTriggers ?? []
        },
        share
      )
    } else if (kind === 'course') {
      await this.taxonomy.add('course', newKey, { color: COURSE_NEUTRAL_COLOR }, share)
    } else {
      await this.taxonomy.add(kind, newKey, {}, share)
    }
  }

  /**
   * Deletes a term for everyone (admin only). Blocked by the server while any user's document
   * still uses it (Human, 2026-10-05) — the error says which ones.
   */
  async pushRegistryDeleteToMaster(type: PushableType, key: string): Promise<void> {
    const term = this.taxonomy.find(KIND_BY_TYPE[type], key)
    if (term && this.taxonomy.isShared(term)) await this.taxonomy.remove(term)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Deletes the term `key` of `kind`; `success` shows only when there was such a term. */
  private async removeTerm(kind: TaxonomyKind, key: string, error: string, success: string): Promise<void> {
    await this.run(`${kind}.delete`, error, async () => {
      if (await this.taxonomy.removeByKey(kind, key)) this.userMsgService.onSetSuccessMsg(success)
    })
  }

  /** Re-keys a term (the server carries the new key into the documents that use it). A no-op for
   *  an empty or unchanged key; refused with `exists` when `kind` already has the new key. */
  private async renameTerm(
    kind: TaxonomyKind,
    oldKey: string,
    newKey: string,
    msgs: { exists: (key: string) => string; error: string; success: (key: string) => string }
  ): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.taxonomy.find(kind, trimmed)) {
      this.userMsgService.onSetErrorMsg(msgs.exists(trimmed))
      return
    }
    await this.run(`${kind}.rename`, msgs.error, async () => {
      if (await this.taxonomy.updateByKey(kind, oldKey, { key: trimmed })) {
        this.userMsgService.onSetSuccessMsg(msgs.success(trimmed))
      }
    })
  }

  /** Runs a write; shows the store's own message (read-only / in use) or `fallbackMsg`. True on success. */
  private async run(event: string, fallbackMsg: string, write: () => Promise<void>): Promise<boolean> {
    try {
      await write()
      return true
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return false
      this.userMsgService.onSetErrorMsg(this.taxonomy.errorMessage(err) ?? fallbackMsg)
      this.logging.error({
        event: `crud.metadata.${event}_error`,
        message: `Metadata ${event} error`,
        context: { err }
      })
      return false
    }
  }

  private logLoadError(err: unknown): void {
    this.logging.error({ event: 'crud.metadata.hydrate_error', message: 'Failed to load metadata', context: { err } })
  }
}
