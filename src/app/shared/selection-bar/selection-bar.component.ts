import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state'
import { BulkEditableField } from './bulk-editable-field.model'

@Component({
  selector: 'app-selection-bar',
  standalone: true,
  imports: [TranslatePipe, CustomSelectComponent, LucideAngularModule],
  templateUrl: './selection-bar.component.html',
  styleUrl: './selection-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionBarComponent {
  selectionState = input.required<ListSelectionState>()
  editableFields = input<BulkEditableField[]>([])

  bulkDelete = output<string[]>()
  bulkEdit = output<{ field: string; value: string; ids: string[] }>()
  addNewRequested = output<{ field: string }>()

  protected activeField_ = signal<BulkEditableField | null>(null)

  protected fieldOptions_ = computed(() =>
    this.editableFields().map(f => ({ value: f.key, label: f.label }))
  )

  protected onFieldSelect(key: string): void {
    this.activeField_.set(this.editableFields().find(f => f.key === key) ?? null)
  }

  protected onValueSelect(value: string): void {
    const field = this.activeField_()
    if (!field) return
    if (value === field.addNewValue) {
      this.addNewRequested.emit({ field: field.key })
    } else {
      this.bulkEdit.emit({ field: field.key, value, ids: Array.from(this.selectionState().selectedIds()) })
      this.selectionState().clear()
    }
    this.activeField_.set(null)
  }

  protected onCancelEdit(): void {
    this.activeField_.set(null)
  }

  protected onBulkDelete(): void {
    this.bulkDelete.emit(Array.from(this.selectionState().selectedIds()))
  }
}
