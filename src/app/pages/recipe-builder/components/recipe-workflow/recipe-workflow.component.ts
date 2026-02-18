import { Component, input, output, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { UnitRegistryService } from '@services/unit-registry.service'
import { PreparationSearchComponent } from '../preparation-search/preparation-search.component'
import type { PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'

@Component({
  selector: 'app-recipe-workflow',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    PreparationSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective
  ],
  templateUrl: './recipe-workflow.component.html',
  styleUrl: './recipe-workflow.component.scss'
})
export class RecipeWorkflowComponent {
  private fb = inject(FormBuilder)
  private readonly unitRegistry_ = inject(UnitRegistryService)

  workflowFormArray = input.required<FormArray>()
  type = input.required<'preparation' | 'dish'>()

  addItem = output<void>()
  removeItem = output<number>()

  get workflowGroups() {
    return this.workflowFormArray().controls as FormGroup[]
  }

  getAllUnitKeys(): string[] {
    return this.unitRegistry_.allUnitKeys_()
  }

  incrementQuantity(group: FormGroup, index: number): void {
    const ctrl = group.get('quantity')
    const val = (ctrl?.value ?? 0) + 1
    ctrl?.setValue(val)
  }

  decrementQuantity(group: FormGroup, index: number): void {
    const ctrl = group.get('quantity')
    const val = Math.max(0, (ctrl?.value ?? 0) - 1)
    ctrl?.setValue(val)
  }

  onPreparationSelected(entry: PreparationEntry, group: FormGroup): void {
    group.patchValue({
      preparation_name: entry.name,
      category_name: entry.category
    })
  }

  clearPreparation(group: FormGroup): void {
    group.patchValue({
      preparation_name: '',
      category_name: ''
    })
  }
}
