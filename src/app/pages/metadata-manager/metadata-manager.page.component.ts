import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, viewChild } from '@angular/core'
import { CommonModule, DOCUMENT } from '@angular/common'
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
import { normalizeHebrew } from '@utils/recipe-match.util'
import type { TaxonomyKind } from '@models/v2'
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service'
import { ALL_DISH_FIELDS, DEFAULT_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model'
import { TaxonomyKindManagerComponent } from './components/taxonomy-kind-manager/taxonomy-kind-manager.component'
import { PreparationCategoryManagerComponent } from './components/preparation-category-manager/preparation-category-manager.component'
import { SectionCategoryManagerComponent } from './components/section-category-manager/section-category-manager.component'
import { StationManagerComponent } from './components/station-manager/station-manager.component'
import { CoefficientManagerComponent } from './components/coefficient-manager/coefficient-manager.component'
import { StaffStagesManagerComponent } from './components/staff-stages-manager/staff-stages-manager.component'
import { PermissionService } from '@services/permission.service'
import { UserManagementComponent } from './components/user-management/user-management.component'
import { AiModelManagerComponent } from './components/ai-model-manager/ai-model-manager.component'
import { InlineRenameFieldComponent } from 'src/app/shared/inline-rename-field/inline-rename-field.component'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'
import { UnitEditDialogComponent, type UnitEditValue } from './components/unit-edit-dialog/unit-edit-dialog.component'

type MetadataType = 'category' | 'allergen' | 'unit' | 'label' | 'course'

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
    TaxonomyKindManagerComponent,
    PreparationCategoryManagerComponent,
    SectionCategoryManagerComponent,
    StationManagerComponent,
    CoefficientManagerComponent,
    StaffStagesManagerComponent,
    UserManagementComponent,
    AiModelManagerComponent,
    ScrollRailComponent,
    InlineRenameFieldComponent,
    RowActionsMenuComponent,
    UnitEditDialogComponent
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
  protected readonly isPlatformAdmin_ = this.userService.isPlatformAdmin_
  private readonly permission = inject(PermissionService)
  /** Plan 477: the staff-stages card is the owner's (editSettings). */
  protected readonly canEditSettings_ = computed(() => this.permission.can('editSettings'))
  private readonly authModal = inject(AuthModalService)
  private readonly logging = inject(LoggingService)
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly document = inject(DOCUMENT)

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
  /** Menu type whose tap menu (edit / delete, plan 340) is open. */
  protected readonly menuTypeMenuKey_ = signal<string | null>(null)
  /** Custom unit open in the edit dialog (plan 377), as it was when the dialog opened. */
  protected readonly editingUnit_ = signal<UnitEditValue | null>(null)

  readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS

  private readonly itemMenu = viewChild.required(RowActionsMenuComponent)
  private readonly jumpRail = viewChild(ScrollRailComponent)

  /**
   * Mobile/tablet jump-nav destinations, in page order. Built from the app's real 8 sections
   * (not the design's tab list).
   */
  private readonly _allJumpSections = [
    { id: 'mm-sec-unit', labelKey: 'metadata_units_and_conversions_title' },
    { id: 'mm-sec-category', labelKey: 'metadata_product_categories_title' },
    { id: 'mm-sec-allergen', labelKey: 'metadata_global_allergens_title' },
    { id: 'mm-sec-label', labelKey: 'metadata_recipe_labels_title' },
    { id: 'mm-sec-course', labelKey: 'metadata_recipe_courses_title' },
    { id: 'mm-sec-menu-type', labelKey: 'metadata_menu_types_title' },
    { id: 'mm-sec-coefficients', labelKey: 'metadata_coefficients_title' },
    { id: 'mm-sec-staff-stages', labelKey: 'metadata_staff_stages_title' },
    { id: 'mm-sec-preparation', labelKey: 'metadata_prep_categories' },
    { id: 'mm-sec-section', labelKey: 'metadata_section_categories_title' },
    { id: 'mm-sec-station', labelKey: 'metadata_stations_title' },
    { id: 'mm-sec-user', labelKey: 'user_management' },
    { id: 'mm-sec-ai-models', labelKey: 'ai_model_manager' }
  ] as const

  /** User management and AI models are platform-admin screens; the staff-stages card is the owner's. No tab for anyone else. */
  protected readonly jumpSections = computed(() => {
    const admin = this.isPlatformAdmin_()
    const owner = this.canEditSettings_()
    return this._allJumpSections.filter(
      (s) =>
        (admin || (s.id !== 'mm-sec-user' && s.id !== 'mm-sec-ai-models')) && (owner || s.id !== 'mm-sec-staff-stages')
    )
  })

  /** The section whose chip was tapped last (highlighted chip); null until a chip is tapped. */
  protected readonly activeSectionId_ = signal<string | null>(null)

  protected isActive(id: string): boolean {
    return this.activeSectionId_() === id
  }

  /** Plan 468: a chip scrolls its section to the top (under the header and the chip bar) and
   *  glides itself to the middle of the chip carousel. */
  protected jumpTo(id: string, chip: HTMLElement): void {
    this.activeSectionId_.set(id)
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    this.document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    this.jumpRail()?.centerChild(chip)
  }

  protected readonly labelColor = (key: string): string => this.metadataRegistry.getLabelColor(key)

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

  /** `lockReasonKey` bound per card, for the generic taxonomy card's `lockReason` input. */
  protected readonly lockReasonFor = Object.fromEntries(
    (['unit', 'category', 'allergen', 'label', 'course'] as const).map((type) => [
      type,
      (item: string) => this.lockReasonKey(type, item)
    ])
  ) as Record<MetadataType, (item: string) => string | null>

  //TAP MENU (plan 340) — menu types only; the other cards own their menu
  protected openMenuTypeMenu(event: MouseEvent, key: string): void {
    this.menuTypeMenuKey_.set(key)
    this.itemMenu().open(event.currentTarget as HTMLElement)
  }

  protected onMenuTypeMenuEdit(key: string): void {
    this.itemMenu().close()
    this.onStartRenameMenuType(key)
  }

  protected onMenuTypeMenuDelete(key: string): void {
    this.itemMenu().close()
    void this.onRemoveMenuType(key)
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
        this.userMsgService.onSetSuccessMsg(this.msg('metadata_saved_success'))
      }
    } catch (err) {
      this.logging.error({ event: 'metadata.sync_error', message: 'Metadata sync error (add label)', context: { err } })
      this.userMsgService.onSetErrorMsg(this.msg('metadata_sync_error'))
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
      this.userMsgService.onSetErrorMsg(this.msg('metadata_value_exists', { name: sanitizedHebrew }))
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
        this.userMsgService.onSetSuccessMsg(this.msg('metadata_saved_success'))
      }
    } catch (err) {
      this.logging.error({
        event: 'metadata.sync_error',
        message: 'Metadata sync error (add metadata)',
        context: { err }
      })
      this.userMsgService.onSetErrorMsg(this.msg('metadata_sync_error'))
    }
  }

  //DELETE
  /** Dictionary keys of the type names used inside messages ("היחידה", "האלרגן", ...). */
  private readonly metadataTypeKeys: Record<MetadataType, string> = {
    unit: 'metadata_type_unit',
    allergen: 'metadata_type_allergen',
    category: 'metadata_type_category',
    label: 'metadata_type_label',
    course: 'metadata_type_course'
  }

  /** Dictionary text for `key` with `{type}`, `{name}` and `{n}` filled in. */
  private msg(key: string, params: { type?: MetadataType; name?: string; n?: number } = {}): string {
    let text = this.translationService.translate(key)
    if (params.type)
      text = text.replace('{type}', this.translationService.translate(this.metadataTypeKeys[params.type]))
    if (params.name !== undefined) text = text.replace('{name}', params.name)
    if (params.n !== undefined) text = text.replace('{n}', String(params.n))
    return text
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
          this.msg('metadata_cascade_delete_confirm', {
            type,
            name: this.translationService.translate(item),
            n: affected.length
          }),
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
            this.userMsgService.onSetSuccessMsg(this.msg('metadata_deleted_updated_count', { n: updatedCount }))
          }
        } catch (err) {
          this.logging.error({
            event: 'crud.metadata.cascade_delete_error',
            message: `Failed to cascade-delete ${type}`,
            context: { err }
          })
          this.userMsgService.onSetErrorMsg(this.msg('metadata_delete_server_error'))
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
        this.msg('metadata_in_use_cannot_delete', { type, name: this.translationService.translate(item) })
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
        this.userMsgService.onSetSuccessMsg(this.msg('metadata_delete_success'))
      }
    } catch (err) {
      this.logging.error({ event: 'crud.metadata.delete_error', message: `Failed to delete ${type}`, context: { err } })
      this.userMsgService.onSetErrorMsg(this.msg('metadata_delete_server_error'))
    }
  }

  //RENAME (plan 322) — fix a typo in place instead of delete + recreate + manually re-tag
  // every recipe/product. category/allergen/course share the Hebrew+English key modal
  // label reuses its own creation modal so color/autoTriggers can be corrected too; unit has
  // its own dialog (plan 377) because it also carries a gram conversion.
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
      case 'unit':
        return this.allUnitKeys_().includes(key)
      default:
        return false
    }
  }

  /** Products and recipes/dishes that use unit `key`, over the same fields the server re-keys
   *  (`TERM_REFERENCES.unit`). */
  private unitUsage(key: string): { products: number; recipes: number } {
    const products = this.productData
      .allProducts_()
      .filter(
        (p) => p.baseUnit === key || (p.purchaseOptions ?? []).some((o) => o.unitSymbol === key || o.uom === key)
      ).length
    const recipes = this.kitchenState
      .recipes_()
      .filter(
        (r) =>
          r.yieldUnit === key ||
          (r.ingredients ?? []).some((i) => i.unit === key) ||
          (r.yieldConversions ?? []).some((c) => c.unit === key) ||
          (r.prepItems ?? []).some((i) => i.unit === key) ||
          (r.prepCategories ?? []).some((c) => (c.items ?? []).some((i) => i.unit === key))
      ).length
    return { products, recipes }
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
    if (type === 'unit') {
      const usage = this.unitUsage(key)
      return usage.products + usage.recipes
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
    } else if (type === 'unit') {
      await Promise.all([
        this.productData.reloadFromStorage(),
        this.recipeData.reloadFromStorage(),
        this.dishData.reloadFromStorage()
      ])
    }
  }

  private async registryRename(type: MetadataType, oldKey: string, newKey: string): Promise<boolean> {
    switch (type) {
      case 'label':
        return this.metadataRegistry.renameLabel(oldKey, newKey)
      case 'course':
        return this.metadataRegistry.renameCourse(oldKey, newKey)
      case 'category':
        return this.metadataRegistry.renameCategory(oldKey, newKey)
      case 'allergen':
        return this.metadataRegistry.renameAllergen(oldKey, newKey)
      default:
        return false
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
    if (
      !this.isPlatformAdmin_() ||
      !(type === 'label' || type === 'course' || type === 'category' || type === 'allergen')
    ) {
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
      this.userMsgService.onSetErrorMsg(this.msg('metadata_item_exists', { type, name: newKey }))
      return false
    }
    const affected = this.getAffectedCount(type, oldKey)
    if (affected > 0) {
      const confirmed = await this.confirmModal.open(
        this.msg('metadata_rename_confirm', { type, name: this.translationService.translate(oldKey), n: affected })
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
          affected > 0
            ? this.msg('metadata_renamed_updated_count', { n: affected })
            : this.msg('metadata_change_success')
        )
      }
      return true
    } catch (err) {
      this.logging.error({
        event: 'crud.metadata.cascade_rename_error',
        message: `Failed to cascade-rename ${type}`,
        context: { err }
      })
      this.userMsgService.onSetErrorMsg(this.msg('metadata_change_server_error'))
      return false
    }
  }

  async onRenameMetadata(item: string, type: MetadataType): Promise<void> {
    if (!this.requireSignIn()) return

    if (type === 'unit') {
      if (this.isSystemUnit(item)) return
      if (!this.canEditTerm('unit', item)) {
        this.userMsgService.onSetErrorMsg(this.translationService.translate('taxonomy_shared_admin_only'))
        return
      }
      this.editingUnit_.set({
        key: item,
        hebrewLabel: this.translationService.translate(item),
        gramRate: this.unitRegistry.getConversion(item)
      })
      return
    }

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
        this.userMsgService.onSetSuccessMsg(this.msg('metadata_update_success'))
        return
      }
      const ok = await this.confirmAndCascadeRename(type, item, result.englishKey, scope)
      if (!ok) return
      this.translationService.updateDictionary(result.englishKey, result.hebrewLabel, scope)
    }
  }

  /** Plan 475: another unit already shows this Hebrew name, so the two would look the same. */
  private unitLabelTaken(prevKey: string, next: UnitEditValue): boolean {
    const name = normalizeHebrew(next.hebrewLabel ?? '')
    if (!name) return false
    return this.allUnitKeys_().some(
      (k) => k !== prevKey && k !== next.key && normalizeHebrew(this.translationService.translate(k)) === name
    )
  }

  /** Save from the unit edit dialog. Both confirms are asked before anything is written, so a
   *  cancel never leaves half an edit. Key first, then the rate on the new key. */
  async onUnitEditSaved(next: UnitEditValue): Promise<void> {
    const prev = this.editingUnit_()
    this.editingUnit_.set(null)
    if (!prev || !this.requireSignIn()) return
    const keyChanged = next.key !== prev.key
    const rateChanged = next.gramRate !== prev.gramRate
    const labelChanged = next.hebrewLabel !== prev.hebrewLabel
    if (!keyChanged && !rateChanged && !labelChanged) return

    if (
      (keyChanged && this.registryHasKey('unit', next.key)) ||
      (labelChanged && this.unitLabelTaken(prev.key, next))
    ) {
      this.userMsgService.onSetErrorMsg(this.translationService.translate('unit_name_taken'))
      return
    }
    const usage = this.unitUsage(prev.key)
    const inUse = usage.products + usage.recipes > 0
    const withCounts = (dictKey: string): string =>
      this.translationService
        .translate(dictKey)
        .replace('{n}', String(usage.products))
        .replace('{m}', String(usage.recipes))
    if (keyChanged && inUse && !(await this.confirmModal.open(withCounts('unit_rename_confirm')))) return
    if (rateChanged && inUse && !(await this.confirmModal.open(withCounts('unit_rate_change_confirm')))) return

    const scope = await this.resolvePushScope('unit', 'save', prev.key)
    if (!scope) return

    if (keyChanged) {
      if (!(await this.unitRegistry.renameUnit(prev.key, next.key))) return
    }
    if (keyChanged || labelChanged) this.translationService.updateDictionary(next.key, next.hebrewLabel, scope)
    const rateSaved = !rateChanged || (await this.unitRegistry.updateUnitRate(next.key, next.gramRate))
    if (keyChanged) await this.reloadAfterRename('unit')
    if (rateSaved) this.userMsgService.onSetSuccessMsg(this.msg('metadata_update_success'))
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
        this.userMsgService.onSetErrorMsg(this.msg('menu_type_exists', { name: key }))
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
  }

  async onRemoveMenuType(key: string): Promise<void> {
    if (!this.requireSignIn()) return
    const isUsed = this.menuEventData.allMenuEvents_().some((e) => e.servingType === key)
    if (isUsed) {
      this.userMsgService.onSetErrorMsg(this.msg('menu_type_in_use_cannot_delete', { name: key }))
      return
    }
    await this.metadataRegistry.deleteMenuType(key)
  }

  /** Save pressed (or Enter) in the menu type's rename field. */
  async onMenuTypeRenameSaved(oldKey: string, newName: string): Promise<void> {
    this.renamingMenuTypeKey_.set(null)
    if (!this.requireSignIn()) return
    const trimmed = (newName ?? '').trim()
    if (trimmed === oldKey || !trimmed) return
    const msg = this.translationService.translate('menu_type_rename_confirm')
    const confirmed = await this.confirmModal.open(msg, { saveLabel: 'save' })
    if (!confirmed) return
    const renamed = await this.metadataRegistry.renameMenuType(oldKey, trimmed)
    // The server re-keys menuEvents.servingType; reload so the menus show the new name.
    if (renamed) await this.menuEventData.reloadFromStorage()
  }
}
