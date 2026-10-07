import { ChangeDetectionStrategy, Component, inject, OnInit, signal, viewChild } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { MenuSectionCategoriesService } from '@services/menu-section-categories.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'

@Component({
  selector: 'app-section-category-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, RowActionsMenuComponent],
  templateUrl: './section-category-manager.component.html',
  styleUrl: './section-category-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionCategoryManagerComponent implements OnInit {
  private readonly sectionCategories = inject(MenuSectionCategoriesService)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)
  private readonly taxonomy = inject(TaxonomyStore)

  protected readonly categories = this.sectionCategories.sectionCategories_
  protected readonly editingName_ = signal<string | null>(null)
  /** Plan 340: the pill whose edit/delete menu is open. */
  protected readonly menuKey_ = signal<string | null>(null)
  private readonly actionsMenu = viewChild<RowActionsMenuComponent>('menu')

  ngOnInit(): void {
    void this.sectionCategories.ensureLoaded()
    void this.menuEventData.ensureLoaded()
  }

  private requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  private countMenuEventsUsingSection(name: string): number {
    return this.menuEventData.allMenuEvents_().filter((e) => (e.sections ?? []).some((s) => s.name === name)).length
  }

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

  /** Plan 340: tap a pill → edit/delete menu anchored to it. */
  protected openMenu(value: string, event: Event): void {
    if (!this.requireSignIn()) return
    this.menuKey_.set(value)
    this.actionsMenu()?.open(event.currentTarget as HTMLElement)
  }

  protected isMenuOpenFor(value: string): boolean {
    return this.menuKey_() === value && !!this.actionsMenu()?.opened()
  }

  protected onMenuEdit(): void {
    const value = this.takeMenuKey()
    if (value) this.onStartRename(value)
  }

  protected onMenuDelete(): void {
    const value = this.takeMenuKey()
    if (value) void this.onRemove(value)
  }

  private takeMenuKey(): string | null {
    const value = this.menuKey_()
    this.actionsMenu()?.close()
    this.menuKey_.set(null)
    return value
  }

  onStartRename(name: string): void {
    if (!this.requireSignIn() || !this.canEdit(name)) return
    this.editingName_.set(name)
  }

  /** Shared terms are read-only except for an admin (Plan 321 Phase 3); own terms are always editable. */
  canEdit(name: string): boolean {
    const term = this.taxonomy.find('sectionCategory', name)
    return !term || this.taxonomy.canEdit(term)
  }

  async onRenameBlur(oldName: string, newValue: string): Promise<void> {
    this.editingName_.set(null)
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
