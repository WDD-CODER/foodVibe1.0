import { Component, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PreparationRegistryService } from '@services/preparation-registry.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'

@Component({
  selector: 'app-preparation-category-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './preparation-category-manager.component.html',
  styleUrl: './preparation-category-manager.component.scss'
})
export class PreparationCategoryManagerComponent {
  private readonly prepRegistry = inject(PreparationRegistryService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly translationKeyModal = inject(TranslationKeyModalService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)

  protected readonly categories_ = this.prepRegistry.preparationCategories_
  protected readonly editingKey_ = signal<string | null>(null)

  private requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  private countRecipesUsingCategory(key: string): number {
    return this.kitchenState.recipes_().filter(r =>
      (r.prep_items_ ?? []).some(p => p.category_name === key) ||
      (r.prep_categories_ ?? []).some(c => c.category_name === key)
    ).length
  }

  async onAdd(hebrewLabel: string, inputEl: HTMLInputElement): Promise<void> {
    if (!this.requireSignIn()) return
    const sanitized = hebrewLabel.trim()
    if (!sanitized) return

    const existingLabels = this.categories_().map(k => this.translation.translate(k))
    if (existingLabels.includes(sanitized)) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_category_exists'))
      return
    }

    const existingKey = this.translation.resolvePreparationCategory(sanitized);
    if (existingKey) {
      if (this.categories_().includes(existingKey)) {
        this.userMsg.onSetErrorMsg(this.translation.translate('metadata_category_exists'));
        return;
      }
      await this.prepRegistry.registerCategory(existingKey, sanitized);
      inputEl.value = '';
      return;
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
      const msg = this.translation.translate('metadata_cannot_delete_in_use')
        .replace('{n}', String(usageCount))
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

  onStartRename(key: string): void {
    if (!this.requireSignIn()) return
    this.editingKey_.set(key)
  }

  async onRenameBlur(oldKey: string, newValue: string): Promise<void> {
    this.editingKey_.set(null)
    const trimmed = (newValue ?? '').trim()
    if (!trimmed) return

    const oldLabel = this.translation.translate(oldKey)
    if (trimmed === oldLabel) return

    const usageCount = this.countRecipesUsingCategory(oldKey)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_rename_affects_recipes')
        .replace('{n}', String(usageCount))
      const confirmed = await this.confirmModal.open(msg, { variant: 'warning', saveLabel: 'save' })
      if (!confirmed) return
    } else {
      const confirmed = await this.confirmModal.open(
        this.translation.translate('metadata_confirm_rename_category'),
        { saveLabel: 'save' }
      )
      if (!confirmed) return
    }

    await this.prepRegistry.renameCategory(oldKey, oldKey, trimmed)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }
}
