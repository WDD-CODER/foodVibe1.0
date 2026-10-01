import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
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
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service'
import { ALL_DISH_FIELDS, DEFAULT_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model'
import { PreparationCategoryManagerComponent } from './components/preparation-category-manager/preparation-category-manager.component'
import { SectionCategoryManagerComponent } from './components/section-category-manager/section-category-manager.component'
import { UserManagementComponent } from './components/user-management/user-management.component'

type MetadataType = 'category' | 'allergen' | 'unit' | 'label' | 'course'
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
    UserManagementComponent
  ],
  templateUrl: './metadata-manager.page.component.html',
  styleUrl: './metadata-manager.page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetadataManagerComponent implements OnInit, AfterViewInit {
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
  protected readonly isAdmin = computed(() => this.userService.user_()?.role === 'admin')
  private readonly authModal = inject(AuthModalService)
  private readonly logging = inject(LoggingService)

  ngOnInit(): void {
    void this.menuEventData.ensureLoaded()
    // recipes_()/dishes_() (label-in-use check) are deferred — plan 304 M2. This page
    // isn't reached via a route resolver that guarantees them, so load here.
    void this.recipeData.ensureLoaded()
    void this.dishData.ensureLoaded()
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.updateJumpNavScrollState())
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
  protected editingMenuTypeKey_ = signal<string | null>(null)
  protected editingMenuTypeFields_ = signal<DishFieldKey[]>([])

  readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS
  readonly DEFAULT_DISH_FIELDS = DEFAULT_DISH_FIELDS

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

  private readonly jumpNavEl = viewChild<ElementRef<HTMLElement>>('jumpNavEl')

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

  /** Tablet-only prev/next arrows for the jump-nav row (mobile relies on touch swipe). */
  protected scrollJumpNav(direction: 'prev' | 'next'): void {
    const el = this.jumpNavEl()?.nativeElement
    if (!el) return
    const amount = Math.max(160, el.clientWidth * 0.6)
    el.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  /** Whether the jump-nav row has more content to scroll to on each side — same "hide the arrow
   *  once there's nothing left that way" behavior as this app's other carousels. */
  protected readonly canScrollNavPrev_ = signal(false)
  protected readonly canScrollNavNext_ = signal(false)

  @HostListener('window:resize')
  protected updateJumpNavScrollState(): void {
    const el = this.jumpNavEl()?.nativeElement
    if (!el) return
    const threshold = 1
    const maxScroll = el.scrollWidth - el.clientWidth
    // RTL-safe: modern browsers report scrollLeft as 0 at the start, going negative toward the
    // end — abs() makes this direction-agnostic regardless of LTR/RTL scrollLeft sign convention.
    const scrolled = Math.abs(el.scrollLeft)
    this.canScrollNavPrev_.set(scrolled > threshold)
    this.canScrollNavNext_.set(scrolled < maxScroll - threshold)
  }

  protected getLabelColor(key: string): string {
    return this.metadataRegistry.getLabelColor(key)
  }

  protected getCourseColor(key: string): string {
    return this.allCourses_().find((c) => c.key === key)?.color ?? '#78716C'
  }

  isSystemUnit(unitKey: string): boolean {
    return unitKey in SYSTEM_UNITS
  }

  //CREATE

  // addUnit(name: string): void {
  //   if (!name.trim()) return
  //   this.unitRegistry.registerUnit(name.trim(), 1)
  // }

  async onAddLabel(prefillHebrew?: string): Promise<void> {
    const result = await this.labelCreationModal.open(prefillHebrew)
    if (!result?.key || !result?.hebrewLabel) return
    const scope = await this.resolvePushScope('label')
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

    const scope = await this.resolvePushScope(type)
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
          ? recipes.filter((r) => (r.labels_ ?? []).includes(item) || (r.autoLabels_ ?? []).includes(item))
          : recipes.filter((r) => r.course_ === item)

      if (affected.length > 0) {
        const confirmed = await this.confirmModal.open(
          `מחיקת ${this.metadataTypeNames[type]} "${this.translationService.translate(item)}" תעדכן ${affected.length} מתכונים/מנות ותסיר אותה מכולם. להמשיך?`,
          { variant: 'danger' }
        )
        if (!confirmed) return
        const scope = await this.resolvePushScope(type)
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
          (p) => p.base_unit_ === item || p.purchase_options_?.some((opt) => opt.unit_symbol_ === item)
        )
        break
      case 'allergen':
        isUsed = allProducts.some((p) => p.allergens_?.includes(item))
        break
      case 'category':
        isUsed = allProducts.some((p) => (p.categories_ ?? []).includes(item))
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
    const scope = await this.resolvePushScope(type)
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
        .filter((r) => (r.labels_ ?? []).includes(key) || (r.autoLabels_ ?? []).includes(key)).length
    }
    if (type === 'course') {
      return this.kitchenState.recipes_().filter((r) => r.course_ === key).length
    }
    if (type === 'category') {
      return this.productData.allProducts_().filter((p) => (p.categories_ ?? []).includes(key)).length
    }
    if (type === 'allergen') {
      return this.productData.allProducts_().filter((p) => (p.allergens_ ?? []).includes(key)).length
    }
    return 0
  }

  private async cascadeRename(type: MetadataType, oldKey: string, newKey: string): Promise<number> {
    switch (type) {
      case 'label':
        return this.kitchenState.cascadeRenameLabelForAll(oldKey, newKey)
      case 'course':
        return this.kitchenState.cascadeRenameCourseForAll(oldKey, newKey)
      case 'category':
        return this.kitchenState.cascadeRenameCategoryForAll(oldKey, newKey)
      case 'allergen':
        return this.kitchenState.cascadeRenameAllergenForAll(oldKey, newKey)
      default:
        return 0
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
   *  Returns null if the admin cancels out of the prompt. */
  private async resolvePushScope(type: MetadataType): Promise<'me' | 'everyone' | null> {
    if (!this.isAdmin() || !(type === 'label' || type === 'course' || type === 'category' || type === 'allergen')) {
      return 'me'
    }
    const scope = await this.confirmModal.openTernary(
      this.translationService.translate('push_registry_master_message'),
      {
        headerKey: 'push_to_master_header',
        saveLabel: 'push_to_master_save_me',
        saveButtonLabel: 'push_to_master_save_everyone'
      }
    )
    if (scope === 'cancel') return null
    return scope === 'save' ? 'everyone' : 'me'
  }

  /** Confirm (only when items are affected) + cascade-rename, for category/course/allergen/label. */
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
      await this.cascadeRename(type, oldKey, newKey)
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
      const scope = await this.resolvePushScope('label')
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
      const scope = await this.resolvePushScope(type)
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

  onEditMenuType(key: string): void {
    if (!this.requireSignIn()) return
    this.editingMenuTypeKey_.set(key)
    this.editingMenuTypeFields_.set([...this.metadataRegistry.getMenuTypeFields(key)])
  }

  toggleMenuTypeField(fieldKey: DishFieldKey): void {
    this.editingMenuTypeFields_.update((fields) => {
      const has = fields.includes(fieldKey)
      if (has) return fields.filter((f) => f !== fieldKey)
      return [...fields, fieldKey]
    })
  }

  isMenuTypeFieldSelected(fieldKey: DishFieldKey): boolean {
    return this.editingMenuTypeFields_().includes(fieldKey)
  }

  getDishFieldLabelKey(fieldKey: DishFieldKey): string {
    return ALL_DISH_FIELDS.find((f) => f.key === fieldKey)?.labelKey ?? fieldKey
  }

  async onSaveMenuTypeFields(): Promise<void> {
    if (!this.requireSignIn()) return
    const key = this.editingMenuTypeKey_()
    if (!key) return
    await this.metadataRegistry.updateMenuType(key, this.editingMenuTypeFields_())
    this.editingMenuTypeKey_.set(null)
    this.editingMenuTypeFields_.set([])
  }

  onCancelEditMenuType(): void {
    this.editingMenuTypeKey_.set(null)
    this.editingMenuTypeFields_.set([])
  }

  async onRemoveMenuType(key: string): Promise<void> {
    if (!this.requireSignIn()) return
    const isUsed = this.menuEventData.allMenuEvents_().some((e) => e.serving_type_ === key)
    if (isUsed) {
      this.userMsgService.onSetErrorMsg(`לא ניתן למחוק: סוג התפריט "${key}" בשימוש בתפריטים שמורים`)
      return
    }
    await this.metadataRegistry.deleteMenuType(key)
  }

  async onMenuTypeNameBlur(oldKey: string, newName: string): Promise<void> {
    if (!this.requireSignIn()) return
    const trimmed = (newName ?? '').trim()
    if (trimmed === oldKey || !trimmed) return
    const msg = this.translationService.translate('menu_type_rename_confirm')
    const confirmed = await this.confirmModal.open(msg, { saveLabel: 'save' })
    if (!confirmed) return
    await this.metadataRegistry.renameMenuType(oldKey, trimmed)
    await this.menuEventData.updateServingTypeForAll(oldKey, trimmed)
  }

  async removeFieldFromMenuType(key: string, fieldKey: DishFieldKey): Promise<void> {
    if (!this.requireSignIn()) return
    const current = this.metadataRegistry.getMenuTypeFields(key)
    const updated = current.filter((f) => f !== fieldKey)
    await this.metadataRegistry.updateMenuType(key, updated)
  }
}
