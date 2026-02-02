import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [DatePipe, NgOptimizedImage],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  now_ = signal(new Date());
  recipesCount = signal(0);

  constructor() {
    setInterval(() => {
      this.now_.set(new Date());
    }, 1000);
  }
}