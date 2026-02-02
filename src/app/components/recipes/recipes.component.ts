import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'recipes',
  standalone: true,
  imports: [],
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesComponent {

}
