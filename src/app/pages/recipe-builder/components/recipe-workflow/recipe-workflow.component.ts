import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms'; // Switch to Reactive
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-recipe-workflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule], // Import ReactiveFormsModule
  templateUrl: './recipe-workflow.component.html',
  styleUrl: './recipe-workflow.component.scss'
})
export class RecipeWorkflowComponent {
  // Pass the FormArray from the parent
  
  workflowFormArray = input.required<FormArray>();
  
  // Pivot based on preparation or dish
  type = input.required<'preparation' | 'dish'>();

  // Events for adding/removing
  addItem = output<void>();
  removeItem = output<number>();

  // Helper to treat controls as FormGroups
  get workflowGroups() {
    return this.workflowFormArray().controls as FormGroup[];
  }

  // Helper to get nested items array for Dishes
  getMiseItems(categoryGroup: FormGroup): FormGroup[] {
    return (categoryGroup.get('items') as FormArray).controls as FormGroup[];
  }
}