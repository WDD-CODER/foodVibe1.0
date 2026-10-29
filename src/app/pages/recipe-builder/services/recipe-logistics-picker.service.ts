import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { AbstractControl, FormArray } from '@angular/forms'
import type { Equipment } from '@models/equipment.model'
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { TranslationService } from '@services/translation.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { filterOptionsByLabel } from 'src/app/core/utils/option-filter.util'
import { addOptionLabel, notifyItemAdded } from 'src/app/core/utils/add-option.util'
import { RecipeFormService } from './recipe-form.service'

/**
 * Recipe-builder logistics/equipment picker: search results, quantity, add to baseline, add-new-tool modal,
 * remove chip. The search box and its keyboard are the shared `app-search-combobox`. Component-scoped (provided
 * on RecipeBuilderPage); the page connects only the logistics baseline FormArray.
 */
@Injectable()
export class RecipeLogisticsPickerService {
  private readonly destroyRef_ = inject(DestroyRef)
  private readonly equipmentData_ = inject(EquipmentDataService)
  private readonly addEquipmentModal_ = inject(AddEquipmentModalService)
  private readonly recipeFormService_ = inject(RecipeFormService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)
  private readonly userMsg_ = inject(UserMsgService)

  private baseline_: FormArray | null = null

  readonly searchQuery_ = signal('')
  readonly quantity_ = signal(1)
  /** Selected equipment id (from dropdown); user sets quantity then presses Add. */
  readonly selectedToolId_ = signal<string | null>(null)
  /** Equipment IDs already in the logistics baseline (excluded from equipment search options). */
  private readonly baselineIds_ = signal<string[]>([])

  /** Search options: equipment only (by nameHebrew), contains, prefix matches first (rule F). */
  readonly searchOptions_ = computed((): Equipment[] => {
    const raw = this.searchQuery_().trim()
    if (!raw) return []
    const alreadyAdded = new Set(this.baselineIds_())
    const allEquipment = this.equipmentData_.allEquipment_().filter((eq) => !alreadyAdded.has(eq._id))
    const filtered = filterOptionsByLabel(allEquipment, raw, (eq) => eq.nameHebrew)
    const qLower = raw.toLowerCase()
    return filtered.slice().sort((a, b) => {
      const aName = a.nameHebrew.toLowerCase()
      const bName = b.nameHebrew.toLowerCase()
      const aStarts = aName.startsWith(qLower) ? 0 : 1
      const bStarts = bName.startsWith(qLower) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return aName.indexOf(qLower) - bName.indexOf(qLower)
    })
  })

  /** Every tool: the search box checks a typed name against these (rule X) before offering to add it. */
  readonly allTools_ = this.equipmentData_.allEquipment_

  readonly toolLabel_ = (tool: Equipment): string => tool.nameHebrew
  readonly toolKey_ = (tool: Equipment): string => tool._id

  connect(baseline: FormArray): void {
    this.baseline_ = baseline
    this.syncBaselineIds_(baseline.value)
    baseline.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef_))
      .subscribe((value: unknown) => this.syncBaselineIds_(value))
  }

  //CREATE

  /** Add button click: if something selected → add to baseline; if only search text → open add-new-equipment modal. */
  onAddClick(): void {
    if (this.selectedToolId_()) {
      this.addSelectedToBaseline_()
      return
    }
    const typed = this.searchQuery_().trim()
    if (typed) {
      const label = addOptionLabel(typed, this.allTools_(), this.toolLabel_, 'add_new_tool')
      void this.openAddNewToolModal(label.kind === 'typed' ? label.text : '')
    }
  }

  /** Always the add window, prefilled with a typed new name (rule W); '' = nothing typed. */
  async openAddNewToolModal(typed: string): Promise<void> {
    const result = await this.addEquipmentModal_.open(typed || undefined)
    if (!result?.name?.trim()) return
    try {
      const now = Date.now()
      const created = await this.equipmentData_.addEquipment({
        nameHebrew: result.name.trim(),
        category: result.category,
        ownedQuantity: 0,
        isConsumable: false,
        createdAt: now,
        updatedAt: now
      })
      // The saved tool lands selected, keeping the quantity already chosen (rule 4).
      this.selectedToolId_.set(created._id)
      this.searchQuery_.set(created.nameHebrew)
      notifyItemAdded(this.userMsg_, (k) => this.translation_.translate(k), created.nameHebrew)
    } catch (err) {
      this.logging_.error({
        event: 'recipe_builder.save_error',
        message: 'Recipe builder save error (add tool)',
        context: { err }
      })
      const msg =
        err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
          ? this.translation_.translate('duplicate_equipment_name')
          : this.translation_.translate('equipment_add_error')
      this.userMsg_.onSetErrorMsg(msg)
    }
  }

  //READ

  getEquipmentNameById(id: string): string {
    const eq = this.equipmentData_
      .allEquipment_()
      .find((e) => e._id === id || (e as { _masterId?: string })._masterId === id)
    return eq?.nameHebrew ?? id
  }

  //DELETE

  removeBaselineRow(index: number): void {
    this.baseline_?.removeAt(index)
  }

  /** Puts a removed baseline row back at its index (clamped to the list end). */
  insertBaselineRow(index: number, row: AbstractControl): void {
    this.baseline_?.insert(Math.min(index, this.baseline_.length), row)
  }

  /** Removes a baseline row and returns it so the caller can offer an undo. */
  takeBaselineRow(index: number): AbstractControl | null {
    const row = this.baseline_?.at(index) ?? null
    this.baseline_?.removeAt(index)
    return row
  }

  //UPDATE

  /** Select an option from dropdown (does not add yet; user sets quantity and presses Add). */
  selectOption(option: Equipment): void {
    this.selectedToolId_.set(option._id)
    this.quantity_.set(1)
    this.searchQuery_.set(option.nameHebrew)
  }

  onSearchInput(value: string): void {
    this.searchQuery_.set(value)
    const selectedId = this.selectedToolId_()
    if (selectedId && this.getEquipmentNameById(selectedId) !== value) {
      this.selectedToolId_.set(null)
    }
  }

  /** Add the currently selected item (with current quantity) to baseline. */
  private addSelectedToBaseline_(): void {
    const id = this.selectedToolId_()
    if (!id || !this.baseline_) return
    this.baseline_.push(
      this.recipeFormService_.createBaselineRow({
        equipmentId: id,
        quantity: this.quantity_(),
        phase: 'both',
        isCritical: true,
        notes: undefined
      })
    )
    this.selectedToolId_.set(null)
    this.searchQuery_.set('')
    this.quantity_.set(1)
  }

  private syncBaselineIds_(value: unknown): void {
    const rows = (value ?? []) as { equipmentId?: string }[]
    this.baselineIds_.set(rows.map((r) => r.equipmentId).filter(Boolean) as string[])
  }
}
