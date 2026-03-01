import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { AddEquipmentModalService } from '@services/add-equipment-modal.service';
import { EquipmentCategory } from 'src/app/core/models/equipment.model';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

@Component({
  selector: 'add-equipment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './add-equipment-modal.component.html',
  styleUrl: './add-equipment-modal.component.scss'
})
export class AddEquipmentModalComponent {
  private modalService = inject(AddEquipmentModalService);

  protected isOpen_ = this.modalService.isOpen_;
  protected name_ = signal('');
  protected category_ = signal<EquipmentCategory>('tool');

  protected readonly categories: EquipmentCategory[] = [
    'heat_source', 'tool', 'container', 'packaging', 'infrastructure', 'consumable'
  ];
  protected readonly categoryOptions: { value: string; label: string }[] = this.categories.map((c) => ({ value: c, label: c }));

  protected save(): void {
    const name = this.name_().trim();
    if (!name) return;
    this.modalService.save({ name, category: this.category_() });
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
