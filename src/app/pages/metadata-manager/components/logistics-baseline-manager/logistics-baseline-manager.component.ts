import { Component, inject, signal, computed } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LogisticsBaselineDataService } from '@services/logistics-baseline-data.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import type { LogisticsBaselineItem, EquipmentPhase } from '@models/logistics.model'

@Component({
  selector: 'app-logistics-baseline-manager',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './logistics-baseline-manager.component.html',
  styleUrl: './logistics-baseline-manager.component.scss'
})
export class LogisticsBaselineManagerComponent {
  private readonly baselineData = inject(LogisticsBaselineDataService)
  private readonly equipmentData = inject(EquipmentDataService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly authModal = inject(AuthModalService)

  protected readonly items_ = this.baselineData.allItems_
  protected readonly equipment_ = this.equipmentData.allEquipment_
  protected readonly editingId_ = signal<string | null>(null)
  protected readonly isAdding_ = signal(false)

  protected readonly equipmentMap_ = computed(() => {
    const map = new Map<string, string>()
    for (const eq of this.equipment_()) {
      map.set(eq._id, eq.name_hebrew ?? eq._id)
    }
    return map
  })

  private requireSignIn(): boolean {
    if (this.isLoggedIn()) return true
    this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
    this.authModal.open('sign-in')
    return false
  }

  protected resolveEquipmentName(id: string): string {
    return this.equipmentMap_().get(id) ?? id
  }

  protected getPhaseLabel(phase: EquipmentPhase): string {
    const key = phase === 'prep' ? 'metadata_phase_prep'
      : phase === 'service' ? 'metadata_phase_service'
      : 'metadata_phase_both'
    return this.translation.translate(key)
  }

  private countRecipesUsingBaseline(equipmentId: string): number {
    return this.kitchenState.recipes_().filter(r =>
      (r.logistics_?.baseline_ ?? []).some(b => b.equipment_id_ === equipmentId)
    ).length
  }

  protected onToggleAdd(): void {
    if (!this.requireSignIn()) return
    this.isAdding_.update(v => !v)
    this.editingId_.set(null)
  }

  protected async onSaveNew(
    equipmentSelect: HTMLSelectElement,
    qtyInput: HTMLInputElement,
    phaseSelect: HTMLSelectElement,
    criticalCheckbox: HTMLInputElement
  ): Promise<void> {
    const equipmentId = equipmentSelect.value
    const quantity = parseFloat(qtyInput.value)
    const phase = phaseSelect.value as EquipmentPhase
    const isCritical = criticalCheckbox.checked

    if (!equipmentId) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_select_equipment'))
      return
    }
    if (isNaN(quantity) || quantity <= 0) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_baseline_quantity'))
      return
    }

    try {
      await this.baselineData.add({
        equipment_id_: equipmentId,
        quantity_: quantity,
        phase_: phase,
        is_critical_: isCritical
      })
      this.isAdding_.set(false)
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_save_failed'))
    }
  }

  protected async onRemove(item: LogisticsBaselineItem): Promise<void> {
    if (!this.requireSignIn()) return

    const usageCount = this.countRecipesUsingBaseline(item.equipment_id_)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_cannot_delete_in_use')
        .replace('{n}', String(usageCount))
      this.userMsg.onSetErrorMsg(msg)
      return
    }

    const eqName = this.resolveEquipmentName(item.equipment_id_)
    const confirmMsg = `${this.translation.translate('metadata_confirm_remove_baseline')} "${eqName}"`
    const confirmed = await this.confirmModal.open(confirmMsg, { variant: 'warning' })
    if (!confirmed) return

    try {
      await this.baselineData.remove(item._id)
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_save_failed'))
    }
  }

  protected onStartEdit(item: LogisticsBaselineItem): void {
    if (!this.requireSignIn()) return
    this.editingId_.set(item._id)
    this.isAdding_.set(false)
  }

  protected onCancelEdit(): void {
    this.editingId_.set(null)
  }

  protected async onSaveEdit(
    item: LogisticsBaselineItem,
    qtyInput: HTMLInputElement,
    phaseSelect: HTMLSelectElement,
    criticalCheckbox: HTMLInputElement
  ): Promise<void> {
    const quantity = parseFloat(qtyInput.value)
    const phase = phaseSelect.value as EquipmentPhase
    const isCritical = criticalCheckbox.checked

    if (isNaN(quantity) || quantity <= 0) {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_baseline_quantity'))
      return
    }

    const usageCount = this.countRecipesUsingBaseline(item.equipment_id_)
    if (usageCount > 0) {
      const msg = this.translation.translate('metadata_rename_affects_recipes')
        .replace('{n}', String(usageCount))
      const confirmed = await this.confirmModal.open(msg, { variant: 'warning', saveLabel: 'save' })
      if (!confirmed) return
    }

    try {
      await this.baselineData.update({
        ...item,
        quantity_: quantity,
        phase_: phase,
        is_critical_: isCritical
      })
      this.editingId_.set(null)
      this.userMsg.onSetSuccessMsg(this.translation.translate('metadata_updated_success'))
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('metadata_save_failed'))
    }
  }
}
