import { Component, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { MenuSectionCategoriesService } from '@services/menu-section-categories.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'

@Component({
  selector: 'app-section-category-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './section-category-manager.component.html',
  styleUrl: './section-category-manager.component.scss'
})
export class SectionCategoryManagerComponent {
  private readonly sectionCategories = inject(MenuSectionCategoriesService)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)

  protected readonly categories_ = this.sectionCategories.sectionCategories_
  protected readonly editingName_ = signal<string | null>(null)

  private requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  private countMenuEventsUsingSection(name: string): number {
    return this.menuEventData.allMenuEvents_().filter(e =>
      (e.sections_ ?? []).some(s => s.name_ === name)
    ).length
  }

  async onAdd(value: string, inputEl: HTMLInputElement): Promise<void> {
    if (!this.requireSignIn()) return
    const trimmed = value.trim()
    if (!trimmed) return

    if (this.categories_().includes(trimmed)) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_section_exists'))
      return
    }

    await this.sectionCategories.addCategory(trimmed)
    inputEl.value = ''
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  async onRemove(name: string): Promise<void> {
    if (!this.requireSignIn()) return

    const usageCount = this.countMenuEventsUsingSection(name)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_section_in_use')
        .replace('{n}', String(usageCount))
      this.userMsg.onSetErrorMsg(msg)
      return
    }

    const confirmMsg = `${this.translation.translate('metadata_confirm_remove_section')} "${name}"`
    const confirmed = await this.confirmModal.open(confirmMsg, { variant: 'warning' })
    if (!confirmed) return

    await this.sectionCategories.removeCategory(name)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  onStartRename(name: string): void {
    if (!this.requireSignIn()) return
    this.editingName_.set(name)
  }

  async onRenameBlur(oldName: string, newValue: string): Promise<void> {
    this.editingName_.set(null)
    const trimmed = (newValue ?? '').trim()
    if (!trimmed || trimmed === oldName) return

    const usageCount = this.countMenuEventsUsingSection(oldName)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_rename_affects_menus')
        .replace('{n}', String(usageCount))
      const confirmed = await this.confirmModal.open(msg, { variant: 'warning', saveLabel: 'save' })
      if (!confirmed) return
    } else {
      const confirmed = await this.confirmModal.open(
        this.translation.translate('metadata_confirm_rename_section'),
        { saveLabel: 'save' }
      )
      if (!confirmed) return
    }

    await this.sectionCategories.renameCategory(oldName, trimmed)
    await this.updateMenuEventSections(oldName, trimmed)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  private async updateMenuEventSections(oldName: string, newName: string): Promise<void> {
    const events = this.menuEventData.allMenuEvents_()
    for (const event of events) {
      const hasMatch = (event.sections_ ?? []).some(s => s.name_ === oldName)
      if (!hasMatch) continue
      const updatedSections = event.sections_.map(s =>
        s.name_ === oldName ? { ...s, name_: newName } : s
      )
      await this.menuEventData.updateMenuEvent({ ...event, sections_: updatedSections })
    }
  }
}
