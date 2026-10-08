import {
  afterNextRender,
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  OnInit,
  signal,
  computed,
  viewChild
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { UnitRegistryService, SYSTEM_UNITS } from '@services/unit-registry.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { ProductDataService } from '@services/product-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { buildScopeTexts, type ScopeAction } from '@services/master-push.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { LoggingService } from '@services/logging.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import type { TaxonomyKind } from '@models/v2'
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service'
import { ALL_DISH_FIELDS, DEFAULT_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model'
import { PreparationCategoryManagerComponent } from './components/preparation-category-manager/preparation-category-manager.component'
import { SectionCategoryManagerComponent } from './components/section-category-manager/section-category-manager.component'
import { UserManagementComponent } from './components/user-management/user-management.component'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'

type MetadataType = 'category' | 'allergen' | 'unit' | 'label' | 'course'

interface MenuTarget {
  item: string
  type: MetadataType | 'menuType'
}

/** Taxonomy kind behind each Metadata Manager card (Plan 321 Phase 3). */
const KIND_BY_TYPE: Record<MetadataType | 'menuType', TaxonomyKind> = {
  category: 'ingredientCategory',
  allergen: 'allergen',
  unit: 'unit',
  label: 'label',
  course: 'course',
  menuType: 'menuType'
}
@Component({
  selector: 'app-metadata-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    PreparationCategoryManagerComponent,
    SectionCategoryManagerComponent,
    UserManagementComponent,
    ScrollRailComponent,
    RowActionsMenuComponent
  ],
  templateUrl: './metadata-manager.page.component.html',
  styleUrl: './metadata-manager.page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetadataManagerComponent implements OnInit {
  private unitRegistry = inject(UnitRegistryService)
  private metadataRegistry = inject(MetadataRegistryService)
  private productData = inject(ProductDataService)
  private confirmModal = inject(ConfirmModalService)
  private translationService = inject(TranslationService)
  private userMsgService = inject(UserMsgService)
  private translationKeyModal = inject(TranslationKeyModalService)
  private labelCreationModal = inject(LabelCreationModalService)
  private kitchenState = inject(KitchenStateService)
  private recipeData = inject(RecipeDataService)
  private dishData = inject(DishDataService)
  private menuEventData = inject(MenuEventDataService)
  private addItemModal = inject(AddItemModalService)
  private readonly userService = inject(UserService)
  protected readonly isLoggedIn = this.userService.isLoggedIn
  protected readonly isAdmin = this.userService.isAdmin_
  private readonly authModal = inject(AuthModalService)
  private readonly logging = inject(LoggingService)
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly injector = inject(Injector)

  ngOnInit(): void {
    void this.menuEventData.ensureLoaded()
    // recipes_()/dishes_() (label-in-use check) are deferred — plan 304 M2. This page
    // isn't reached via a route resolver that guarantees them, so load here.
    void this.recipeData.ensureLoaded()
    void this.dishData.ensureLoaded()
  }

  /** Returns false if not signed in (shows message and opens sign-in modal). */
  private requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsgService.onSetWarningMsg(this.translationService.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  // SIGNALS
  allUnitKeys_ = this.unitRegistry.allUnitKeys_
  allAllergens_ = this.metadataRegistry.allAllergens_
  allCategories_ = this.metadataRegistry.allCategories_
  allLabels_ = this.metadataRegistry.allLabels_
  allLabelKeys_ = computed(() => this.allLabels_().map((l) => l.key))
  allCourses_ = this.metadataRegistry.courses_
  allCourseKeys_ = computed(() => this.allCourses_().map((c) => c.key))
  allMenuTypes_ = this.metadataRegistry.allMenuTypes_
  /** Menu type whose name is being renamed inline (opened from its tap menu). */
  protected readonly renamingMenuTypeKey_ = signal<string | null>(null)
  /** The chip whose tap menu is open (plan 340) — drives the shared menu's actions. */
  protected readonly menuTarget_ = signal<MenuTarget | null>(null)

  readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS

  private readonly itemMenu = viewChild.required(RowActionsMenuComponent)
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput')

  /**
   * Mobile/tablet jump-nav destinations, in page order. Built from the app's real 8 sections
   * (not the design's tab list).
   */
  protected readonly jumpSections = [
    { id: 'mm-sec-unit', labelKey: 'metadata_units_and_conversions_title' },
    { id: 'mm-sec-category', labelKey: 'metadata_product_categories_title' },
    { id: 'mm-sec-allergen', labelKey: 'metadata_global_allergens_title' },
    { id: 'mm-sec-label', labelKey: 'metadata_recipe_labels_title' },
    { id: 'mm-sec-course', labelKey: 'metadata_recipe_courses_title' },
    { id: 'mm-sec-menu-type', labelKey: 'metadata_menu_types_title' },
    { id: 'mm-sec-preparation', labelKey: 'metadata_prep_categories' },
    { id: 'mm-sec-section', labelKey: 'metadata_section_categories_title' },
    { id: 'mm-sec-user', labelKey: 'user_management' }
  ] as const

  /** Which section (if any) has been brought to the front of the grid; null = natural page order. */
  protected readonly frontSectionId_ = signal<string | null>(null)

  protected bringToFront(id: string): void {
    this.frontSectionId_.set(id)
  }

  protected isFront(id: string): boolean {
    return this.frontSectionId_() === id
  }

  /** CSS `order` for a jump-nav section: 0 (first) when it's the front one, else its natural
   *  page-order position (1-8) — so bringing one to the front never disturbs the relative order
   *  of the rest. */
  protected orderFor(id: string): number {
    if (this.isFront(id)) return 0
    const index = this.jumpSections.findIndex((s) => s.id === id)
    return index === -1 ? 1 : index + 1
  }

  protected getLabelColor(key: string): string {
    return this.metadataRegistry.getLabelColor(key)
  }

  isSystemUnit(unitKey: string): boolean {
    return unitKey in SYSTEM_UNITS
  }

  /** Shared terms are read-only except for an admin (Human, 2026-10-05); own terms are always editable. */
  canEditTerm(type: MetadataType | 'menuType', key: string): boolean {
    const term = this.taxonomy.find(KIND_BY_TYPE[type], key)
    return !term || this.taxonomy.canEdit(term)
  }

  /** Dictionary key explaining why a chip is read-only, or null when it can be tapped. */
  protected lockReasonKey(type: MetadataType, item: string): string | null {
    if (type === 'unit' && this.isSystemUnit(item)) return 'unit_default_unremovable'
    if (!this.canEditTerm(type, item)) return 'taxonomy_shared_admin_only'
    return null
  }

  //TAP MENU (plan 340) — one shared edit/delete menu, anchored to the tapped chip
  protected openItemMenu(event: MouseEvent, item: string, type: MenuTarget['type']): void {
    this.menuTarget_.set({ item, type })
    this.itemMenu().open(event.currentTarget as HTMLElement)
  }

  protected isMenuOpenFor(item: string, type: MenuTarget['type']): boolean {
    const target = this.menuTarget_()
    return target?.item === item && target.type === type
  }

  protected onMenuEdit(target: MenuTarget): void {
    this.itemMenu().close()
    if (target.type === 'menuType') {
      this.onStartRenameMenuType(target.item)
      return
    }
    void this.onRenameMetadata(target.item, target.type)
  }

  protected onMenuDelete(target: MenuTarget): void {
    this.itemMenu().close()
    if (target.type === 'menuType') {
      void this.onRemoveMenuType(target.item)
      return
    }
    void this.onRemoveMetadata(target.item, target.type)
  }

  //CREATE

  // addUnit(name: string): void {
  //   if (!name.trim()) return
  //   this.unitRegistry.registerUnit(name.trim(), 1)
  // }

  async onAddLabel(prefillHebrew?: string): Promise<void> {
    const result = await this.labelCreationModal.open(prefillHebrew)
    if (!result?.key || !result?.hebrewLabel) return
    const scope = await this.resolvePushScope('label', 'create')
    if (!scope) return
    try {
      this.translationService.updateDictionary(result.key, result.hebrewLabel, scope)
      await this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers)
      let pushFailed = false
      if (scope === 'everyone') {
        await this.metadataRegistry
          .pushRegistryRenameToMaster('label', result.key, result.key, {
            color: result.color,
            autoTriggers: result.autoTriggers
          })
          .catch((err) => {
            pushFailed = true
            this.logging.error({
              event: 'crud.metadata.push_registry_rename_error',
              message: 'Push new label to master failed',
              context: { err }
            })
          })
      }
      if (pushFailed) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('push_registry_master_error'))
      } else {
        this.userMsgService.onSetSuccessMsg('הנתונים נשמרו בהצלחה')
      }
    } catch (err) {
      this.logging.error({ event: 'metadata.sync_error', message: 'Metadata sync error (add label)', context: { err } })
      this.userMsgService.onSetErrorMsg('שגיאה בסנכרון הנתונים')
    }
  }

  async onAddMetadata(hebrewLabel: string, type: MetadataType, inputElement: HTMLInputElement) {
    if (!this.requireSignIn()) return
    if (type === 'label') {
      await this.onAddLabel(hebrewLabel)
      return
    }
    const sanitizedHebrew = hebrewLabel.trim()
    if (!sanitizedHebrew) return

    // --- LAYER 1: REGISTRY GUARD ---
    const currentIds = this.getRegistryByType(type)
    const existingLabels = currentIds.map((id) => this.translationService.translate(id))

    if (existingLabels.includes(sanitizedHebrew)) {
      this.userMsgService.onSetErrorMsg(`הערך "${sanitizedHebrew}" כבר קיים ברשימה הזו.`)
      return
    }

    // --- LAYER 2: ENGLISH KEY GUARD (resolve first; modal only when no key) ---
    const resolveMap: Record<string, () => string | null> = {
      category: () => this.translationService.resolveCategory(sanitizedHebrew),
      allergen: () => this.translationService.resolveAllergen(sanitizedHebrew),
      unit: () => this.translationService.resolveUnit(sanitizedHebrew),
      course: () => this.translationService.resolveCourse(sanitizedHebrew)
    }
    let englishKey = resolveMap[type]?.() ?? null
    let resolvedHebrew = sanitizedHebrew
    let isNewDictionaryEntry = false

    if (!englishKey) {
      const contextMap = {
        category: 'category' as const,
        allergen: 'allergen' as const,
        unit: 'unit' as const,
        course: 'category' as const
      }
      const result = await this.translationKeyModal.open(sanitizedHebrew, contextMap[type])
      if (!isTranslationKeyResult(result)) return
      englishKey = result.englishKey
      resolvedHebrew = result.hebrewLabel
      isNewDictionaryEntry = true
    }

    const scope = await this.resolvePushScope(type, 'create')
    if (!scope) return
    if (isNewDictionaryEntry) {
      this.translationService.updateDictionary(englishKey, resolvedHebrew, scope)
    }

    // --- LAYER 3: EXECUTION ---
    try {
      if (type === 'category') {
        await this.metadataRegistry.registerCategory(resolvedHebrew)
      } else {
        await this.registerInService(englishKey, type)
      }
      let pushFailed = false
      if (scope === 'everyone' && (type === 'course' || type === 'category' || type === 'allergen')) {
        await this.metadataRegistry.pushRegistryRenameToMaster(type, englishKey, englishKey).catch((err) => {
          pushFailed = true
          this.logging.error({
            event: 'crud.metadata.push_registry_rename_error',
            message: 'Push new item to master failed',
            context: { err }
          })
        })
      }
      inputElement.value = ''
      if (pushFailed) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('push_registry_master_error'))
      } else {
        this.userMsgService.onSetSuccessMsg('הנתונים נשמרו בהצלחה')
      }
    } catch (err) {
      this.logging.error({
        event: 'metadata.sync_error',
        message: 'Metadata sync error (add metadata)',
        context: { err }
      })
      this.userMsgService.onSetErrorMsg('שגיאה בסנכרון הנתונים')
    }
  }

  //DELETE
  private readonly metadataTypeNames: Record<MetadataType, string> = {
    unit: 'היחידה',
    allergen: 'האלרגן',
    category: 'הקטגוריה',
    label: 'התווית',
    course: 'סוג המנה'
  }

  async onRemoveMetadata(item: string, type: MetadataType) {
    if (!this.requireSignIn()) return

    // label/course: cascade-clear from recipes/dishes on confirm, instead of hard-blocking.
    if (type === 'label' || type === 'course') {
      const recipes = this.kitchenState.recipes_()
      const affected =
        type === 'label'
          ? recipes.filter((r) => (r.labels ?? []).includes(item) || (r.autoLabels ?? []).includes(item))
          : recipes.filter((r) => r.course === item)

      if (affected.length > 0) {
        const confirmed = await this.confirmModal.open(
          `מחיקת ${this.metadataTypeNames[type]} "${this.translationService.translate(item)}" תעדכן ${affected.length} מתכונים/מנות ותסיר אותה מכולם. להמשיך?`,
          { variant: 'danger' }
        )
        if (!confirmed) return
        const scope = await this.resolvePushScope(type, 'delete', item)
        if (!scope) return
        try {
          const updatedCount =
            type === 'label'
              ? await this.kitchenState.cascadeClearLabelFromAll(item)
              : await this.kitchenState.cascadeClearCourseFromAll(item)
          if (type === 'label') await this.metadataRegistry.deleteLabel(item)
          else await this.metadataRegistry.deleteCourse(item)
          let pushFailed = false
          if (scope === 'everyone') {
            await this.metadataRegistry.pushRegistryDeleteToMaster(type, item).catch((err) => {
              pushFailed = true
              this.logging.error({
                event: 'crud.metadata.push_registry_delete_error',
                message: `Push ${type} delete to master failed`,
                context: { err }
              })
            })
          }
          if (pushFailed) {
            this.userMsgService.onSetErrorMsg(this.translationService.translate('push_registry_master_error'))
          } else {
            this.userMsgService.onSetSuccessMsg(`נמחק בהצלחה ועודכנו ${updatedCount} מתכונים/מנות`)
          }
        } catch (err) {
          this.logging.error({
            event: 'crud.metadata.cascade_delete_error',
            message: `Failed to cascade-delete ${type}`,
            context: { err }
          })
          this.userMsgService.onSetErrorMsg('שגיאה בביצוע המחיקה מול השרת')
        }
        return
      }
      // Not in use — fall through to the shared plain-delete block below.
    }

    // 1. DYNAMIC USAGE CHECK (category/allergen/unit only — label/course handled above)
    const allProducts = this.productData.allProducts_()
    let isUsed = false
    switch (type) {
      case 'unit':
        isUsed = allProducts.some(
          (p) => p.baseUnit === item || p.purchaseOptions?.some((opt) => opt.unitSymbol === item)
        )
        break
      case 'allergen':
        isUsed = allProducts.some((p) => p.allergens?.includes(item))
        break
      case 'category':
        isUsed = allProducts.some((p) => (p.categories ?? []).includes(item))
        break
    }

    // 2. BLOCK DELETION IF IN USE
    if (isUsed) {
      this.userMsgService.onSetErrorMsg(
        `לא ניתן למחוק את ${this.metadataTypeNames[type]} "${this.translationService.translate(item)}" - היא נמצאת בשימוש במלאי`
      )
      return
    }

    // 3. EXECUTION
    const scope = await this.resolvePushScope(type, 'delete', item)
    if (!scope) return
    try {
      switch (type) {
        case 'unit':
          await this.unitRegistry.deleteUnit(item)
          break
        case 'allergen':
          await this.metadataRegistry.deleteAllergen(item)
          break
        case 'category':
          await this.metadataRegistry.deleteCategory(item)
          break
        case 'label':
          await this.metadataRegistry.deleteLabel(item)
          break
        case 'course':
          await this.metadataRegistry.deleteCourse(item)
          break
      }
      let pushFailed = false
      if (scope === 'everyone' && type !== 'unit') {
        await this.metadataRegistry.pushRegistryDeleteToMaster(type, item).catch((err) => {
          pushFailed = true
          this.logging.error({
            event: 'crud.metadata.push_registry_delete_error',
            message: `Push ${type} delete to master failed`,
            context: { err }
          })
        })
      }
      if (pushFailed) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('push_registry_master_error'))
      } else {
        this.userMsgService.onSetSuccessMsg('המחיקה בוצעה בהצלחה')
      }
    } catch (err) {
      this.logging.error({ event: 'crud.metadata.delete_error', message: `Failed to delete ${type}`, context: { err } })
      this.userMsgService.onSetErrorMsg('שגיאה בביצוע המחיקה מול השרת')
    }
  }

  //RENAME (plan 322) — fix a typo in place instead of delete + recreate + manually re-tag
  // every recipe/product. category/allergen/course share the Hebrew+English key modal
  // label reuses its own creation modal so color/autoTriggers can be corrected too; unit is
  // out of scope (riskier — affects cost/conversion calculations elsewhere).
  private registryHasKey(type: MetadataType, key: string): boolean {
    switch (type) {
      case 'label':
        return this.allLabelKeys_().includes(key)
      case 'course':
        return this.allCourseKeys_().includes(key)
      case 'category':
        return this.allCategories_().includes(key)
      case 'allergen':
        return this.allAllergens_().includes(key)
      default:
        return false
    }
  }

  private getAffectedCount(type: MetadataType, key: string): number {
    if (type === 'label') {
      return this.kitchenState
        .recipes_()
        .filter((r) => (r.labels ?? []).includes(key) || (r.autoLabels ?? []).includes(key)).length
    }
    if (type === 'course') {
      return this.kitchenState.recipes_().filter((r) => r.course === key).length
    }
    if (type === 'category') {
      return this.productData.allProducts_().filter((p) => (p.categories ?? []).includes(key)).length
    }
    if (type === 'allergen') {
      return this.productData.allProducts_().filter((p) => (p.allergens ?? []).includes(key)).length
    }
    return 0
  }

  /** The server re-keys every document that used a renamed term (Plan 385), so the client
   *  only reloads the lists that hold those documents. */
  private async reloadAfterRename(type: MetadataType): Promise<void> {
    if (type === 'label' || type === 'course') {
      await Promise.all([this.recipeData.reloadFromStorage(), this.dishData.reloadFromStorage()])
    } else if (type === 'category' || type === 'allergen') {
      await this.productData.reloadFromStorage()
    }
  }

  private async registryRename(type: MetadataType, oldKey: string, newKey: string): Promise<void> {
    switch (type) {
      case 'label':
        return this.metadataRegistry.renameLabel(oldKey, newKey)
      case 'course':
        return this.metadataRegistry.renameCourse(oldKey, newKey)
      case 'category':
        return this.metadataRegistry.renameCategory(oldKey, newKey)
      case 'allergen':
        return this.metadataRegistry.renameAllergen(oldKey, newKey)
    }
  }

  /** Plan 322 M4: admins choose whether an edit (rename OR a Hebrew-only text fix) also
   *  publishes to everyone (registry key -> __master__, Hebrew label -> the shared global
   *  dictionary doc) or stays on their own account. Non-admins (and category/allergen/course/
   *  label are the only eligible types) always get 'me' silently — no prompt shown.
   *  Plan 321 Phase 3: editing an already-shared term `key` is always 'everyone' (admin only —
   *  there is no per-user copy any more); a non-admin gets the read-only message and null.
   *  Returns null if the admin cancels out of the prompt. `action` only picks the prompt's
   *  wording (plan 365). */
  private async resolvePushScope(
    type: MetadataType,
    action: ScopeAction,
    key?: string
  ): Promise<'me' | 'everyone' | null> {
    const term = key === undefined ? undefined : this.taxonomy.find(KIND_BY_TYPE[type], key)
    if (term && this.taxonomy.isShared(term)) {
      if (this.taxonomy.canEdit(term)) return 'everyone'
      this.userMsgService.onSetErrorMsg(this.translationService.translate('taxonomy_shared_admin_only'))
      return null
    }
    if (!this.isAdmin() || !(type === 'label' || type === 'course' || type === 'category' || type === 'allergen')) {
      return 'me'
    }
    // Plan 365: wording follows the action (add → publish, rename/text fix → update, remove → delete).
    const texts = buildScopeTexts(action, 'metadata', 1, (k) => this.translationService.translate(k))
    const scope = await this.confirmModal.openTernary(texts.message, {
      headerKey: texts.headerKey,
      saveLabel: texts.meLabelKey,
      saveButtonLabel: texts.everyoneLabelKey
    })
    if (scope === 'cancel') return null
    return scope === 'save' ? 'everyone' : 'me'
  }

  /** Confirm (only when items are affected) + rename, for category/course/allergen/label. The
   *  server carries the new key into every referencing document; the client then reloads. */
  private async confirmAndCascadeRename(
    type: MetadataType,
    oldKey: string,
    newKey: string,
    scope: 'me' | 'everyone'
  ): Promise<boolean> {
    if (this.registryHasKey(type, newKey)) {
      this.userMsgService.onSetErrorMsg(`${this.metadataTypeNames[type]} "${newKey}" כבר קיים`)
      return false
    }
    const affected = this.getAffectedCount(type, oldKey)
    if (affected > 0) {
      const confirmed = await this.confirmModal.open(
        `שינוי שם ${this.metadataTypeNames[type]} "${this.translationService.translate(oldKey)}" יעדכן ${affected} פריטים. להמשיך?`
      )
      if (!confirmed) return false
    }

    try {
      await this.registryRename(type, oldKey, newKey)
      let pushFailed = false
      if (
        scope === 'everyone' &&
        (type === 'label' || type === 'course' || type === 'category' || type === 'allergen')
      ) {
        const itemData =
          type === 'label'
            ? (({ color, autoTriggers }) => ({ color, autoTriggers }))(
                this.allLabels_().find((l) => l.key === newKey) ?? { color: undefined, autoTriggers: undefined }
              )
            : type === 'course'
              ? { color: this.allCourses_().find((c) => c.key === newKey)?.color }
              : undefined
        await this.metadataRegistry.pushRegistryRenameToMaster(type, oldKey, newKey, itemData).catch((err) => {
          pushFailed = true
          this.logging.error({
            event: 'crud.metadata.push_registry_rename_error',
            message: 'Push registry rename to master failed',
            context: { err }
          })
        })
      }
      await this.reloadAfterRename(type)
      if (pushFailed) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('push_registry_master_error'))
      } else {
        this.userMsgService.onSetSuccessMsg(
          affected > 0 ? `שונה בהצלחה ועודכנו ${affected} פריטים` : 'השינוי בוצע בהצלחה'
        )
      }
      return true
    } catch (err) {
      this.logging.error({
        event: 'crud.metadata.cascade_rename_error',
        message: `Failed to cascade-rename ${type}`,
        context: { err }
      })
      this.userMsgService.onSetErrorMsg('שגיאה בביצוע השינוי מול השרת')
      return false
    }
  }

  async onRenameMetadata(item: string, type: MetadataType): Promise<void> {
    if (!this.requireSignIn()) return

    if (type === 'label') {
      const existing = this.allLabels_().find((l) => l.key === item)
      const result = await this.labelCreationModal.open(
        this.translationService.translate(item),
        existing
          ? { englishKey: existing.key, color: existing.color, autoTriggers: existing.autoTriggers ?? [] }
          : undefined
      )
      if (!result?.key) return
      const existingTriggers = [...(existing?.autoTriggers ?? [])].sort().join(',')
      const resultTriggers = [...(result.autoTriggers ?? [])].sort().join(',')
      const unchanged =
        result.key === item &&
        result.hebrewLabel === this.translationService.translate(item) &&
        result.color === existing?.color &&
        resultTriggers === existingTriggers
      if (unchanged) return
      const scope = await this.resolvePushScope('label', 'save', item)
      if (!scope) return
      if (result.key !== item) {
        const ok = await this.confirmAndCascadeRename('label', item, result.key, scope)
        if (!ok) return
      }
      this.translationService.updateDictionary(result.key, result.hebrewLabel, scope)
      await this.metadataRegistry.updateLabel(result.key, { color: result.color, autoTriggers: result.autoTriggers })
      return
    }

    if (type === 'course' || type === 'category' || type === 'allergen') {
      const contextMap = { course: 'category' as const, category: 'category' as const, allergen: 'allergen' as const }
      const result = await this.translationKeyModal.open(
        this.translationService.translate(item),
        contextMap[type],
        item
      )
      if (!isTranslationKeyResult(result)) return
      if (result.englishKey === item && result.hebrewLabel === this.translationService.translate(item)) return
      const scope = await this.resolvePushScope(type, 'save', item)
      if (!scope) return
      if (result.englishKey === item) {
        this.translationService.updateDictionary(result.englishKey, result.hebrewLabel, scope)
        this.userMsgService.onSetSuccessMsg('העדכון בוצע בהצלחה')
        return
      }
      const ok = await this.confirmAndCascadeRename(type, item, result.englishKey, scope)
      if (!ok) return
      this.translationService.updateDictionary(result.englishKey, result.hebrewLabel, scope)
    }
  }

  //HELPERS
  private async registerInService(key: string, type: MetadataType): Promise<void> {
    switch (type) {
      case 'unit':
        await this.unitRegistry.registerUnit(key, 1)
        break
      case 'allergen':
        await this.metadataRegistry.registerAllergen(key)
        break
      case 'category':
        await this.metadataRegistry.registerCategory(key)
        break
      case 'label':
        await this.metadataRegistry.registerLabel(key, this.metadataRegistry.getLabelColor(key) || '#78716C', [])
        break
      case 'course':
        await this.metadataRegistry.registerCourse(key)
        break
    }
  }

  private getRegistryByType(type: MetadataType): string[] {
    switch (type) {
      case 'unit':
        return this.allUnitKeys_()
      case 'allergen':
        return this.allAllergens_()
      case 'category':
        return this.allCategories_()
      case 'label':
        return this.allLabelKeys_()
      case 'course':
        return this.allCourseKeys_()
      default:
        return []
    }
  }

  // Menu Types
  async onAddMenuType(): Promise<void> {
    if (!this.requireSignIn()) return
    const result = await this.addItemModal.open({
      title: 'add_new_category',
      label: 'menu_serving_style',
      placeholder: 'menu_serving_style',
      saveLabel: 'save'
    })
    if (result?.trim()) {
      const key = result.trim()
      if (this.allMenuTypes_().some((t) => t.key === key)) {
        this.userMsgService.onSetErrorMsg(`סוג תפריט "${key}" כבר קיים`)
        return
      }
      await this.metadataRegistry.registerMenuType({ key, fields: [...DEFAULT_DISH_FIELDS] })
    }
  }

  /** Tapping a field chip adds or removes it and saves at once. Fields are stored in
   *  ALL_DISH_FIELDS order so every row reads the same way; zero fields is allowed. */
  async onToggleMenuTypeField(key: string, fieldKey: DishFieldKey): Promise<void> {
    if (!this.requireSignIn()) return
    const current = this.metadataRegistry.getMenuTypeFields(key)
    const next = current.includes(fieldKey) ? current.filter((f) => f !== fieldKey) : [...current, fieldKey]
    const ordered = ALL_DISH_FIELDS.map((f) => f.key).filter((k) => next.includes(k))
    await this.metadataRegistry.updateMenuType(key, ordered)
  }

  private onStartRenameMenuType(key: string): void {
    if (!this.requireSignIn()) return
    this.renamingMenuTypeKey_.set(key)
    afterNextRender(() => this.renameInput()?.nativeElement.select(), { injector: this.injector })
  }

  async onRemoveMenuType(key: string): Promise<void> {
    if (!this.requireSignIn()) return
    const isUsed = this.menuEventData.allMenuEvents_().some((e) => e.servingType === key)
    if (isUsed) {
      this.userMsgService.onSetErrorMsg(`לא ניתן למחוק: סוג התפריט "${key}" בשימוש בתפריטים שמורים`)
      return
    }
    await this.metadataRegistry.deleteMenuType(key)
  }

  async onMenuTypeNameBlur(oldKey: string, newName: string): Promise<void> {
    this.renamingMenuTypeKey_.set(null)
    if (!this.requireSignIn()) return
    const trimmed = (newName ?? '').trim()
    if (trimmed === oldKey || !trimmed) return
    const msg = this.translationService.translate('menu_type_rename_confirm')
    const confirmed = await this.confirmModal.open(msg, { saveLabel: 'save' })
    if (!confirmed) return
    await this.metadataRegistry.renameMenuType(oldKey, trimmed)
    await this.menuEventData.updateServingTypeForAll(oldKey, trimmed)
  }
}
