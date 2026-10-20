import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { StationRegistryService } from '@services/station-registry.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { LoggingService } from '@services/logging.service'
import { TaxonomyKindManagerComponent } from '../taxonomy-kind-manager/taxonomy-kind-manager.component'

/** Kitchen stations (`station` terms): the generic card plus add / rename / remove rules (plan 436). */
@Component({
  selector: 'app-station-manager',
  standalone: true,
  imports: [TaxonomyKindManagerComponent],
  templateUrl: './station-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StationManagerComponent {
  private readonly stationRegistry = inject(StationRegistryService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly dishData = inject(DishDataService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly logging = inject(LoggingService)

  protected readonly stations = this.stationRegistry.stations_

  requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  /** Shared stations are read-only except for an admin; own ones are always editable. */
  protected readonly lockReason = (key: string): string | null =>
    this.stationRegistry.canEdit(key) ? null : 'taxonomy_shared_admin_only'

  //CREATE
  async onAdd(value: string, inputEl: HTMLInputElement): Promise<void> {
    if (!this.requireSignIn()) return
    const trimmed = value.trim()
    if (!trimmed) return

    if (this.stationRegistry.hasStation(trimmed)) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_station_exists'))
      return
    }

    try {
      await this.stationRegistry.addStation(trimmed)
      inputEl.value = ''
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
    } catch (err) {
      this.reportError('add', err)
    }
  }

  //UPDATE
  async onRenameBlur(oldKey: string, newValue: string): Promise<void> {
    const trimmed = (newValue ?? '').trim()
    if (!trimmed || trimmed === oldKey) return
    if (this.stationRegistry.hasStation(trimmed)) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_station_exists'))
      return
    }

    const confirmed = await this.confirmModal.open(this.translation.translate('metadata_confirm_rename_station'), {
      variant: 'warning',
      saveLabel: 'save'
    })
    if (!confirmed) return

    try {
      await this.stationRegistry.renameStation(oldKey, trimmed)
      // The server re-keyed defaultStation on the recipes and dishes; refresh the cached lists.
      await Promise.all([this.recipeData.reloadFromStorage(), this.dishData.reloadFromStorage()])
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
    } catch (err) {
      this.reportError('rename', err)
    }
  }

  //DELETE
  async onRemove(key: string): Promise<void> {
    if (!this.requireSignIn()) return

    const confirmMsg = `${this.translation.translate('metadata_confirm_remove_station')} "${key}"`
    const confirmed = await this.confirmModal.open(confirmMsg, { variant: 'warning' })
    if (!confirmed) return

    try {
      await this.stationRegistry.removeStation(key)
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
    } catch (err) {
      this.reportError('remove', err)
    }
  }

  /** Read-only and in-use come from the store as ready messages; anything else is logged and shown as a server error. */
  private reportError(what: 'add' | 'rename' | 'remove', err: unknown): void {
    const known = this.taxonomy.errorMessage(err)
    if (known) {
      this.userMsg.onSetErrorMsg(known)
      return
    }
    this.logging.error({ event: `crud.stations.${what}_error`, message: `Failed to ${what} station`, context: { err } })
    this.userMsg.onSetErrorMsg(this.translation.translate('server_error'))
  }
}
