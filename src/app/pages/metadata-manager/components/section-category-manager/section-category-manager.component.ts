import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { MenuSectionCategoriesService } from '@services/menu-section-categories.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TaxonomyKindManagerComponent } from '../taxonomy-kind-manager/taxonomy-kind-manager.component'

/** Menu section categories (`sectionCategory` terms): the generic card plus the menu-event rules. */
@Component({
  selector: 'app-section-category-manager',
  standalone: true,
  imports: [TaxonomyKindManagerComponent],
  templateUrl: './section-category-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionCategoryManagerComponent implements OnInit {
  private readonly sectionCategories = inject(MenuSectionCategoriesService)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)
  private readonly taxonomy = inject(TaxonomyStore)

  protected readonly categories = this.sectionCategories.sectionCategories_

  ngOnInit(): void {
    void this.sectionCategories.ensureLoaded()
    void this.menuEventData.ensureLoaded()
  }

  requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  /** Shared terms are read-only except for an admin (Plan 321 Phase 3); own terms are always editable. */
  canEdit(name: string): boolean {
    const term = this.taxonomy.find('sectionCategory', name)
    return !term || this.taxonomy.canEdit(term)
  }

  protected readonly lockReason = (name: string): string | null =>
    this.canEdit(name) ? null : 'taxonomy_shared_admin_only'

  private countMenuEventsUsingSection(name: string): number {
    return this.menuEventData.allMenuEvents_().filter((e) => (e.sections ?? []).some((s) => s.name === name)).length
  }

  //CREATE
  async onAdd(value: string, inputEl: HTMLInputElement): Promise<void> {
    if (!this.requireSignIn()) return
    const trimmed = value.trim()
    if (!trimmed) return

    if (this.categories().includes(trimmed)) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_section_exists'))
      return
    }

    await this.sectionCategories.addCategory(trimmed)
    inputEl.value = ''
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  //DELETE
  async onRemove(name: string): Promise<void> {
    if (!this.requireSignIn()) return

    const usageCount = this.countMenuEventsUsingSection(name)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_section_in_use').replace('{n}', String(usageCount))
      this.userMsg.onSetErrorMsg(msg)
      return
    }

    const confirmMsg = `${this.translation.translate('metadata_confirm_remove_section')} "${name}"`
    const confirmed = await this.confirmModal.open(confirmMsg, { variant: 'warning' })
    if (!confirmed) return

    await this.sectionCategories.removeCategory(name)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  //UPDATE
  async onRenameBlur(oldName: string, newValue: string): Promise<void> {
    const trimmed = (newValue ?? '').trim()
    if (!trimmed || trimmed === oldName) return

    const usageCount = this.countMenuEventsUsingSection(oldName)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_rename_affects_menus').replace('{n}', String(usageCount))
      const confirmed = await this.confirmModal.open(msg, { variant: 'warning', saveLabel: 'save' })
      if (!confirmed) return
    } else {
      const confirmed = await this.confirmModal.open(this.translation.translate('metadata_confirm_rename_section'), {
        saveLabel: 'save'
      })
      if (!confirmed) return
    }

    await this.sectionCategories.renameCategory(oldName, trimmed)
    await this.updateMenuEventSections(oldName, trimmed)
    this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
  }

  private async updateMenuEventSections(oldName: string, newName: string): Promise<void> {
    const events = this.menuEventData.allMenuEvents_()
    for (const event of events) {
      const hasMatch = (event.sections ?? []).some((s) => s.name === oldName)
      if (!hasMatch) continue
      const updatedSections = event.sections.map((s) => (s.name === oldName ? { ...s, name: newName } : s))
      await this.menuEventData.updateMenuEvent({ ...event, sections: updatedSections })
    }
  }
}
