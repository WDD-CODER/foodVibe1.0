import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service'
import { EquipmentCategory } from 'src/app/core/models/equipment.model'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'

const ADD_NEW_VALUE = '__add_new__'

@Component({
  selector: 'add-equipment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './add-equipment-modal.component.html',
  styleUrl: './add-equipment-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddEquipmentModalComponent {
  private modalService = inject(AddEquipmentModalService)
  private addItemModal = inject(AddItemModalService)
  private confirmModal = inject(ConfirmModalService)
  private translationService = inject(TranslationService)
  private translationKeyModal = inject(TranslationKeyModalService)

  protected isOpen_ = this.modalService.isOpen_
  protected name = signal('')
  protected category = signal<EquipmentCategory | string>('tool')
  protected customCategories_ = signal<string[]>([])
  /** Typed name from the add option (addNewChosen), read by the add flow (add-option rule 2). */
  protected readonly pendingAddName_ = signal('')

  constructor() {
    effect(() => {
      if (this.modalService.isOpen_()) {
        this.name.set(this.modalService.initialName() ?? '')
      }
    })
  }

  protected readonly fixedCategories: EquipmentCategory[] = [
    'heat_source',
    'tool',
    'container',
    'packaging',
    'infrastructure',
    'consumable'
  ]

  protected categoryOptions = computed(() => {
    const fixed = this.fixedCategories.map((c) => ({ value: c, label: c }))
    const custom = this.customCategories_().map((c) => ({ value: c, label: c }))
    return [...fixed, ...custom, { value: ADD_NEW_VALUE, label: 'add_new_category' }]
  })

  protected async onCategoryChange(value: string): Promise<void> {
    if (value === ADD_NEW_VALUE) {
      await this.openAddNewCategory()
      return
    }
    this.category.set(value as EquipmentCategory | string)
  }

  /** Add a category: a typed new name skips the name modal; cancel keeps the previous category (add-option rule 4). */
  protected async openAddNewCategory(): Promise<void> {
    const previous = this.category()
    const typed = this.pendingAddName_()
    this.pendingAddName_.set('')
    this.category.set(ADD_NEW_VALUE)
    const result =
      typed ||
      (await this.addItemModal.open({
        title: 'add_new_category',
        label: 'category',
        placeholder: 'category',
        saveLabel: 'save'
      }))
    let keyToUse = ''
    if (result?.trim()) {
      keyToUse = this.translationService.resolveCategory(result.trim()) ?? ''
      if (!keyToUse) {
        const modalResult = await this.translationKeyModal.open(result.trim(), 'category')
        if (isTranslationKeyResult(modalResult)) {
          this.translationService.addKeyAndHebrew(modalResult.englishKey, modalResult.hebrewLabel)
          keyToUse = modalResult.englishKey
        }
      }
    }
    if (!keyToUse) {
      this.category.set(previous)
      return
    }
    if (!this.customCategories_().includes(keyToUse)) {
      this.customCategories_.update((list) => [...list, keyToUse])
    }
    this.category.set(keyToUse)
  }

  protected save(): void {
    const name = this.name().trim()
    if (!name) return
    const cat = this.category()
    this.modalService.save({ name, category: cat as EquipmentCategory })
    this.reset()
  }

  protected cancel(): void {
    this.modalService.cancel()
    this.reset()
  }

  protected resetAndClose(): void {
    this.cancel()
  }

  private reset(): void {
    this.name.set('')
    this.category.set('tool')
  }
}
