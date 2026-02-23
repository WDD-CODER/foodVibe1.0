import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [DatePipe, NgOptimizedImage],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  // now_ = signal(new Date());
  recipesCount_ = signal<number>(0);

  readonly now_ = toSignal(
    interval(1000).pipe(map(() => new Date())),
    { initialValue: new Date() }
  )
  
}
