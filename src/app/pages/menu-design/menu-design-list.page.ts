import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import type { MenuDesign } from '@schemas/entities/menu-design.schema'
import type { MenuBaseTemplate } from '@schemas/menu-design/menu-base-templates'
import { MENU_FONTS } from '@schemas/menu-design/menu-fonts'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { BusinessService } from '@services/business.service'
import { MENU_DESIGN_NAME_MAX, MenuDesignDataService } from '@services/menu-design-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { useListControls, matchesSearch } from '@utils/list-controls.util'
import { MENU_COLOR_KEYS } from '@utils/menu-design-form.util'
import { refusalShownToUser } from '@utils/server-refusal.util'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { InlineRenameFieldComponent } from 'src/app/shared/inline-rename-field/inline-rename-field.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'
import { BaseTemplatePickerComponent } from './components/base-template-picker/base-template-picker.component'

/** Plan 765: the business's menu designs — start a new one, rename, copy, delete, or make one the default. */
@Component({
  selector: 'app-menu-design-list-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    ListShellComponent,
    RowActionsMenuComponent,
    EmptyStateComponent,
    InlineRenameFieldComponent,
    InputClearComponent,
    LoaderComponent,
    BaseTemplatePickerComponent
  ],
  templateUrl: './menu-design-list.page.html',
  styleUrl: './menu-design-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDesignListPage {
  // 1. INJECTED
  private readonly designs = inject(MenuDesignDataService)
  private readonly business = inject(BusinessService)
  private readonly permission = inject(PermissionService)
  private readonly router = inject(Router)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)
  /** Only the owner may set the default: the server refuses everyone else. */
  protected readonly isOwner_ = inject(UserService).isOwner_

  // 4. SIGNALS & CONSTANTS
  protected readonly searchQuery_ = signal('')
  protected readonly listControls = useListControls<never>({ search: this.searchQuery_ })
  protected readonly isPickerOpen_ = signal(false)
  protected readonly renamingId_ = signal<string | null>(null)
  /** The design whose rename, copy, default or delete is on its way to the server. */
  protected readonly busyId_ = signal<string | null>(null)

  // 5. COMPUTED
  protected readonly isLoadFailed = computed(() => this.designs.loadFailed_())
  protected readonly total = computed(() => this.designs.allDesigns_().length)

  protected readonly cards = computed(() => {
    const defaultId = this.designs.defaultDesign_()?._id
    return this.designs
      .allDesigns_()
      .filter((design) => matchesSearch(this.searchQuery_(), design.name))
      .map((design) => ({
        design,
        colors: MENU_COLOR_KEYS.map((key) => ({ key, value: design.colors[key] })),
        titleFont: MENU_FONTS.find((font) => font.id === design.fonts.title)?.family ?? '',
        isDefault: design._id === defaultId,
        canEdit: this.permission.can('edit', { type: 'menuDesigns', doc: design }),
        canDelete: this.permission.can('delete', { type: 'menuDesigns', doc: design })
      }))
  })

  // 6. METHODS
  protected onPickBase(base: MenuBaseTemplate): void {
    this.isPickerOpen_.set(false)
    void this.router.navigate(['/menu-design/new'], { queryParams: { base } })
  }

  protected onDuplicate(design: MenuDesign): Promise<void> {
    return this.act_(design._id, 'duplicate', () => this.designs.duplicateDesign(design._id), 'menu_design_saved')
  }

  protected onRetry(): void {
    void this.designs.ensureLoaded()
  }

  protected async onDelete(design: MenuDesign): Promise<void> {
    const question = this.translation.translate('menu_design_delete_confirm').replace('{name}', () => design.name)
    const isConfirmed = await this.confirmModal.open(question, { variant: 'danger', saveLabel: 'menu_design_confirm' })
    if (!isConfirmed) return
    await this.act_(
      design._id,
      'delete',
      () => this.designs.deleteDesign(design._id),
      'menu_design_deleted',
      'menu_design_delete_failed'
    )
  }

  protected onEdit(design: MenuDesign): void {
    void this.router.navigate(['/menu-design', design._id])
  }

  protected async onRename(design: MenuDesign, name: string): Promise<void> {
    await this.act_(
      design._id,
      'rename',
      async () => {
        await this.designs.updateDesign({ ...design, name: name.slice(0, MENU_DESIGN_NAME_MAX).trim() })
        // Closed only on success: a refused name stays in the field.
        this.renamingId_.set(null)
      },
      'menu_design_saved'
    )
  }

  protected onSetDefault(design: MenuDesign): Promise<void> {
    return this.act_(
      design._id,
      'set_default',
      () => this.business.setMenuDesignDefault(design._id),
      'menu_design_saved'
    )
  }

  /** One action on one card at a time, answered by a message. */
  private async act_(
    id: string,
    action: string,
    run: () => Promise<unknown>,
    doneKey: string,
    failedKey = 'save_failed'
  ): Promise<void> {
    if (this.busyId_()) return
    this.busyId_.set(id)
    try {
      await run()
      this.userMsg.onSetSuccessMsg(this.translation.translate(doneKey))
    } catch (err) {
      this.logging.error({
        event: `menu_design.${action}_error`,
        message: 'Menu design action failed',
        context: { err, id }
      })
      if (!refusalShownToUser(err)) this.userMsg.onSetErrorMsg(this.translation.translate(failedKey))
    } finally {
      this.busyId_.set(null)
    }
  }
}
