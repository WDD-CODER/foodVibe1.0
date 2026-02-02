import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'home-screen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-screen.component.html',
  styleUrl: './home-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeScreenComponent {
  title = 'foodCo';
}
