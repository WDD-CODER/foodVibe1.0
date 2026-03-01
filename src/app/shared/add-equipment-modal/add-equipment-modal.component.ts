import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { AddEquipmentModalService } from '@services/add-equipment-modal.service';
import { AddItemModalService } from '@services/add-item-modal.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { TranslationService } from '@services/translation.service';
import { EquipmentCategory } from 'src/app/core/models/equipment.model';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

const ADD_NEW_VALUE = '__add_new__';

@Component({
  selector: 'add-equipment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './add-equipment-modal.component.html',
  styleUrl: './add-equipment-modal.component.scss'
})
export class AddEquipmentModalComponent {
  private modalService = inject(AddEquipmentModalService);
  private addItemModal = inject(AddItemModalService);
  private confirmModal = inject(ConfirmModalService);
  private translationService = inject(TranslationService);

  protected isOpen_ = this.modalService.isOpen_;
  protected name_ = signal('');
  protected category_ = signal<EquipmentCategory | string>('tool');
  protected customCategories_ = signal<string[]>([]);

  constructor() {
    effect(() => {
      if (this.modalService.isOpen_()) {
        this.name_.set(this.modalService.initialName() ?? '');
      }
    });
  }

  protected readonly fixedCategories: EquipmentCategory[] = [
    'heat_source', 'tool', 'container', 'packaging', 'infrastructure', 'consumable'
  ];

  protected categoryOptions = computed(() => {
    const fixed = this.fixedCategories.map((c) => ({ value: c, label: c }));
    const custom = this.customCategories_().map((c) => ({ value: c, label: c }));
    return [...fixed, ...custom, { value: ADD_NEW_VALUE, label: 'add_new_category' }];
  });

  protected async onCategoryChange(value: string): Promise<void> {
    this.category_.set(value as EquipmentCategory | string);
    if (value === ADD_NEW_VALUE) {
      await this.openAddNewCategory();
    }
  }

  protected async openAddNewCategory(): Promise<void> {
    const result = await this.addItemModal.open({
      title: 'add_new_category',
      label: 'category',
      placeholder: 'category',
      saveLabel: 'save'
    });
    if (result?.trim()) {
      const key = result.trim();
      const baseMsg = this.translationService.translate('confirm_add_equipment_category');
      const message = `${baseMsg} "${key}"?`;
      const confirmed = await this.confirmModal.open(message, { saveLabel: 'save' });
      if (confirmed) {
        if (!this.customCategories_().includes(key)) {
          this.customCategories_.update((list) => [...list, key]);
        }
        this.category_.set(key);
      }
    }
  }

  protected save(): void {
    const name = this.name_().trim();
    if (!name) return;
    const cat = this.category_();
    this.modalService.save({ name, category: cat as EquipmentCategory });
    this.reset();
  }

  protected cancel(): void {
    this.modalService.cancel();
    this.reset();
  }

  protected resetAndClose(): void {
    this.cancel();
  }

  private reset(): void {
    this.name_.set('');
    this.category_.set('tool');
  }
}
