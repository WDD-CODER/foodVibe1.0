import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { FormArray } from '@angular/forms'
import type { Equipment } from '@models/equipment.model'
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { TranslationService } from '@services/translation.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { filterOptionsByStartsWith } from 'src/app/core/utils/filter-starts-with.util'
import { RecipeFormService } from './recipe-form.service'

/**
 * Recipe-builder logistics/equipment picker: search + keyboard nav, quantity,
 * add to baseline, add-new-tool modal, remove chip. Component-scoped (provided
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
  readonly dropdownOpen_ = signal(false)
  readonly highlightedIndex_ = signal(-1)
  /** Selected equipment id (from dropdown); user sets quantity then presses Add. */
  readonly selectedToolId_ = signal<string | null>(null)
  /** Equipment IDs already in the logistics baseline (excluded from equipment search options). */
  private readonly baselineIds_ = signal<string[]>([])

  /** Search options: equipment only (by nameHebrew), "starts with" + Hebrew/Latin script. */
  readonly searchOptions_ = computed((): Equipment[] => {
    const raw = this.searchQuery_().trim()
    if (!raw) return []
    const alreadyAdded = new Set(this.baselineIds_())
    const allEquipment = this.equipmentData_.allEquipment_().filter((eq) => !alreadyAdded.has(eq._id))
    const filtered = filterOptionsByStartsWith(allEquipment, raw, (eq) => eq.nameHebrew)
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
    if (this.searchQuery_().trim()) {
      this.openAddNewToolModal()
    }
  }

  async openAddNewToolModal(): Promise<void> {
    this.dropdownOpen_.set(false)
    const initialName = this.searchQuery_().trim() || undefined
    const result = await this.addEquipmentModal_.open(initialName)
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
      this.selectedToolId_.set(created._id)
      this.searchQuery_.set(created.nameHebrew)
      this.quantity_.set(1)
    } catch (err) {
      this.logging_.error({
        event: 'recipe_builder.save_error',
        message: 'Recipe builder save error (add tool)',
        context: { err }
      })
      const msg =
        err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
          ? (this.translation_.translate('duplicate_equipment_name') ?? 'כלי עם שם זה כבר קיים')
          : 'שגיאה בהוספת הכלי'
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

  //UPDATE

  /** Select an option from dropdown (does not add yet; user sets quantity and presses Add). */
  selectOption(option: Equipment): void {
    this.selectedToolId_.set(option._id)
    this.quantity_.set(1)
    this.searchQuery_.set(option.nameHebrew)
    this.dropdownOpen_.set(false)
  }

  onSearchInput(value: string): void {
    this.searchQuery_.set(value)
    this.highlightedIndex_.set(-1)
    this.dropdownOpen_.set(value.trim().length > 0)
    const selectedId = this.selectedToolId_()
    if (selectedId && this.getEquipmentNameById(selectedId) !== value) {
      this.selectedToolId_.set(null)
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.dropdownOpen_()) return
    const opts = this.searchOptions_()
    const len = opts.length + 1 // +1 for 'add new tool'
    let idx = this.highlightedIndex_()

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      idx = Math.min(idx + 1, len - 1)
      this.highlightedIndex_.set(idx)
      this.scrollDropdownToItem_(idx)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      idx = Math.max(idx - 1, 0)
      this.highlightedIndex_.set(idx)
      this.scrollDropdownToItem_(idx)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (idx >= 0 && idx < opts.length) {
        this.selectOption(opts[idx])
        this.highlightedIndex_.set(-1)
      } else if (idx === opts.length) {
        this.openAddNewToolModal()
        this.highlightedIndex_.set(-1)
      }
    } else if (event.key === 'Escape') {
      this.dropdownOpen_.set(false)
      this.highlightedIndex_.set(-1)
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
    this.dropdownOpen_.set(false)
  }

  private scrollDropdownToItem_(index: number): void {
    setTimeout(() => {
      const dropdown = document.querySelector('.logistics-tool-dropdown')
      if (!dropdown) return
      const items = dropdown.querySelectorAll('.logistics-tool-option')
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' })
      }
    }, 0)
  }

  private syncBaselineIds_(value: unknown): void {
    const rows = (value ?? []) as { equipmentId?: string }[]
    this.baselineIds_.set(rows.map((r) => r.equipmentId).filter(Boolean) as string[])
  }
}
