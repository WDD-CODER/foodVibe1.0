import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { PreparationRegistryService } from '@services/preparation-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TaxonomyKindManagerComponent } from '../taxonomy-kind-manager/taxonomy-kind-manager.component'

/** Preparation categories (`prepCategory` terms): the generic card plus the recipe-usage rules. */
@Component({
  selector: 'app-preparation-category-manager',
  standalone: true,
  imports: [TaxonomyKindManagerComponent],
  templateUrl: './preparation-category-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreparationCategoryManagerComponent implements OnInit {
  private readonly prepRegistry = inject(PreparationRegistryService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly dishData = inject(DishDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly translationKeyModal = inject(TranslationKeyModalService)
  private readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)
  private readonly taxonomy = inject(TaxonomyStore)

  protected readonly categories = this.prepRegistry.preparationCategories_
  /** The rename field starts from the category's Hebrew label, not its key. */
  protected readonly translateKey = (key: string): string => this.translation.translate(key)
  protected readonly lockReason = (key: string): string | null =>
    this.canEdit(key) ? null : 'taxonomy_shared_admin_only'

  ngOnInit(): void {
    void this.prepRegistry.ensureLoaded()
    // countRecipesUsingCategory() reads kitchenState.recipes_(), which is now deferred
    // (plan 304 M2) — this page isn't reached via a resolver that guarantees it.
    void this.recipeData.ensureLoaded()
    void this.dishData.ensureLoaded()
  }

  requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  private countRecipesUsingCategory(key: string): number {
    return this.kitchenState
      .recipes_()
      .filter(
        (r) =>
          (r.prepItems ?? []).some((p) => p.categoryName === key) ||
          (r.prepCategories ?? []).some((c) => c.categoryName === key)
      ).length
  }

  async onAdd(hebrewLabel: string, inputEl: HTMLInputElement): Promise<void> {
    if (!this.requireSignIn()) return
    const sanitized = hebrewLabel.trim()
    if (!sanitized) return

    const existingLabels = this.categories().map((k) => this.translation.translate(k))
    if (existingLabels.includes(sanitized)) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_category_exists'))
      return
    }

    const existingKey = this.translation.resolvePreparationCategory(sanitized)
    if (existingKey) {
      if (this.categories().includes(existingKey)) {
        this.userMsg.onSetErrorMsg(this.translation.translate('metadata_category_exists'))
        return
      }
      await this.prepRegistry.registerCategory(existingKey, sanitized)
      inputEl.value = ''
      return
    }

    const result = await this.translationKeyModal.open(sanitized, 'category')
    if (!isTranslationKeyResult(result)) return

    this.translation.updateDictionary(result.englishKey, result.hebrewLabel)
    await this.prepRegistry.registerCategory(result.englishKey, result.hebrewLabel)
    inputEl.value = ''
  }

  async onRemove(key: string): Promise<void> {
    if (!this.requireSignIn()) return

    const usageCount = this.countRecipesUsingCategory(key)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_cannot_delete_in_use').replace('{n}', String(usageCount))
      this.userMsg.onSetErrorMsg(msg)
      return
    }

    const label = this.translation.translate(key)
    const confirmMsg = `${this.translation.translate('metadata_confirm_remove_category')} "${label}"`
    const confirmed = await this.confirmModal.open(confirmMsg, { variant: 'warning' })
    if (!confirmed) return

    await this.prepRegistry.deleteCategory(key)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  /** Shared terms are read-only except for an admin (Plan 321 Phase 3); own terms are always editable. */
  canEdit(key: string): boolean {
    const term = this.taxonomy.find('prepCategory', key)
    return !term || this.taxonomy.canEdit(term)
  }

  async onRenameBlur(oldKey: string, newValue: string): Promise<void> {
    const trimmed = (newValue ?? '').trim()
    if (!trimmed) return

    const oldLabel = this.translation.translate(oldKey)
    if (trimmed === oldLabel) return

    const usageCount = this.countRecipesUsingCategory(oldKey)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_rename_affects_recipes').replace('{n}', String(usageCount))
      const confirmed = await this.confirmModal.open(msg, { variant: 'warning', saveLabel: 'save' })
      if (!confirmed) return
    } else {
      const confirmed = await this.confirmModal.open(this.translation.translate('metadata_confirm_rename_category'), {
        saveLabel: 'save'
      })
      if (!confirmed) return
    }

    await this.prepRegistry.renameCategory(oldKey, oldKey, trimmed)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }
}
