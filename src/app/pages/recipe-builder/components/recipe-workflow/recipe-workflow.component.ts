import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-recipe-workflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './recipe-workflow.component.html',
  styleUrl: './recipe-workflow.component.scss'
})
export class RecipeWorkflowComponent {
  private fb = inject(FormBuilder);

  workflowFormArray = input.required<FormArray>();
  type = input.required<'preparation' | 'dish'>();

  addItem = output<void>();
  removeItem = output<number>();

  get workflowGroups() {
    return this.workflowFormArray().controls as FormGroup[];
  }

  getMiseItems(categoryGroup: FormGroup): FormGroup[] {
    return (categoryGroup.get('items') as FormArray).controls as FormGroup[];
  }

  addMiseItemToCategory(categoryGroup: FormGroup): void {
    const itemsArray = categoryGroup.get('items') as FormArray;
    itemsArray.push(this.fb.group({
      item_name: ['', Validators.required],
      unit: ['', Validators.required]
    }));
  }
}