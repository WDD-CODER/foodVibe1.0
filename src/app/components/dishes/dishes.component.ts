import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'dishes',
  standalone: true,
  imports: [],
  templateUrl: './dishes.component.html',
  styleUrl: './dishes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DishesComponent {

}
