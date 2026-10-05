import { Injectable, computed, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ProductDataService } from './product-data.service'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
import { KeyResolutionService } from './key-resolution.service'
import { TaxonomyStore } from './taxonomy-store.service'
import { LABEL_COLOR_PALETTE, type LabelDefinition } from '@models/label.model'
import type { CourseDefinition } from '@models/course.model'
import { type MenuTypeDefinition, type DishFieldKey, DEFAULT_DISH_FIELDS } from '@models/menu-event.model'

type PushableType = 'label' | 'course' | 'category' | 'allergen'
const KIND_BY_TYPE = { label: 'label', course: 'course', category: 'ingredientCategory', allergen: 'allergen' } as const

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
      .map(({ key, color }) => ({ key, color }))
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

  async deleteMenuType(key: string): Promise<void> {
    await this.run('menuType.delete', 'שגיאה במחיקת סוג התפריט', async () => {
      if (await this.taxonomy.removeByKey('menuType', key)) {
        this.userMsgService.onSetSuccessMsg(`סוג תפריט "${key}" נמחק`)
      }
    })
  }

  async renameMenuType(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.taxonomy.find('menuType', trimmed)) {
      this.userMsgService.onSetErrorMsg(`סוג תפריט "${trimmed}" כבר קיים`)
      return
    }
    await this.run('menuType.rename', 'שגיאה בשינוי שם סוג התפריט', async () => {
      if (await this.taxonomy.updateByKey('menuType', oldKey, { key: trimmed })) {
        this.userMsgService.onSetSuccessMsg(`סוג תפריט שונה ל-"${trimmed}"`)
      }
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

  async deleteLabel(key: string): Promise<void> {
    await this.run('label.delete', 'שגיאה במחיקת התווית', async () => {
      if (await this.taxonomy.removeByKey('label', key))
        this.userMsgService.onSetSuccessMsg(`תווית ${key} נמחקה בהצלחה`)
    })
  }

  async updateLabel(key: string, changes: Partial<LabelDefinition>): Promise<void> {
    const { key: newKey, ...extras } = changes
    await this.run('label.update', 'שגיאה בעדכון התווית', async () => {
      await this.taxonomy.updateByKey('label', key, { ...extras, ...(newKey !== undefined && { key: newKey }) })
    })
  }

  async renameLabel(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.taxonomy.find('label', trimmed)) {
      this.userMsgService.onSetErrorMsg(`התווית "${trimmed}" כבר קיימת`)
      return
    }
    await this.run('label.rename', 'שגיאה בשינוי שם התווית', async () => {
      if (await this.taxonomy.updateByKey('label', oldKey, { key: trimmed })) {
        this.userMsgService.onSetSuccessMsg(`התווית שונתה ל-"${trimmed}"`)
      }
    })
  }

  // ── Courses ─────────────────────────────────────────────────────────────

  async registerCourse(name: string): Promise<void> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'course')
    if (!keyToUse) return
    const sanitized = keyToUse.trim()
    if (!sanitized || this.taxonomy.find('course', sanitized)) return
    const usedColors = new Set(this.courses_().map((c) => c.color))
    const color = LABEL_COLOR_PALETTE.find((c) => !usedColors.has(c)) ?? LABEL_COLOR_PALETTE[0]
    await this.run('course.save', 'שגיאה בשמירת סוג המנה', async () => {
      await this.taxonomy.add('course', sanitized, { color })
      this.userMsgService.onSetSuccessMsg(`סוג מנה "${sanitized}" נוסף בהצלחה`)
    })
  }

  async deleteCourse(key: string): Promise<void> {
    await this.run('course.delete', 'שגיאה במחיקת סוג המנה', async () => {
      if (await this.taxonomy.removeByKey('course', key))
        this.userMsgService.onSetSuccessMsg(`סוג מנה ${key} נמחק בהצלחה`)
    })
  }

  async renameCourse(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.taxonomy.find('course', trimmed)) {
      this.userMsgService.onSetErrorMsg(`סוג המנה "${trimmed}" כבר קיים`)
      return
    }
    await this.run('course.rename', 'שגיאה בשינוי שם סוג המנה', async () => {
      if (await this.taxonomy.updateByKey('course', oldKey, { key: trimmed })) {
        this.userMsgService.onSetSuccessMsg(`סוג המנה שונה ל-"${trimmed}"`)
      }
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

  async deleteCategory(name: string): Promise<void> {
    await this.run('category.delete', 'שגיאה במחיקת הקטגוריה מהשרת', async () => {
      if (await this.taxonomy.removeByKey('ingredientCategory', name)) {
        this.userMsgService.onSetSuccessMsg(`הקטגוריה ${name} נמחקה בהצלחה`)
      }
    })
  }

  async renameCategory(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.taxonomy.find('ingredientCategory', trimmed)) {
      this.userMsgService.onSetErrorMsg(`הקטגוריה "${trimmed}" כבר קיימת`)
      return
    }
    await this.run('category.rename', 'שגיאה בשינוי שם הקטגוריה', async () => {
      if (await this.taxonomy.updateByKey('ingredientCategory', oldKey, { key: trimmed })) {
        this.userMsgService.onSetSuccessMsg(`הקטגוריה שונתה ל-"${trimmed}"`)
      }
    })
  }

  async renameAllergen(oldKey: string, newKey: string): Promise<void> {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.taxonomy.find('allergen', trimmed)) {
      this.userMsgService.onSetErrorMsg(`האלרגן "${trimmed}" כבר קיים`)
      return
    }
    await this.run('allergen.rename', 'שגיאה בשינוי שם האלרגן', async () => {
      if (await this.taxonomy.updateByKey('allergen', oldKey, { key: trimmed })) {
        this.userMsgService.onSetSuccessMsg(`האלרגן שונה ל-"${trimmed}"`)
      }
    })
  }

  async deleteAllergen(name: string): Promise<void> {
    await this.run('allergen.delete', 'שגיאה במחיקת האלרגן מהשרת', async () => {
      if (await this.taxonomy.removeByKey('allergen', name)) this.userMsgService.onSetSuccessMsg(`האלרגן ${name} נמחק`)
    })
  }

  // ── Share with everyone (admin) ─────────────────────────────────────────

  /**
   * Makes an edit apply to everyone (admin only). Plan 321 Phase 3: terms are shared live, so
   * this renames the shared term `oldKey` (the server carries the new key into every user's
   * documents), or — when no shared term has `oldKey` — turns the admin's own `newKey` term into
   * a shared one. `itemData` supplies color/autoTriggers for a label/course that isn't own yet.
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
      const course = this.taxonomy.find('course', newKey)
      await this.taxonomy.add('course', newKey, { color: course?.color ?? (itemData?.color || '#78716C') }, share)
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
