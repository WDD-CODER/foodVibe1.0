import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  ElementRef,
  effect,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-list-shell',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListShellComponent {
  readonly isPanelOpen = input(true);
  readonly gridTemplate = input('');
  readonly mobileGridTemplate = input('');
  readonly dir = input<'rtl' | 'ltr'>('rtl');

  readonly panelToggle = output<void>();

  constructor() {
    const el = inject(ElementRef);
    effect(() => {
      const host = el.nativeElement as HTMLElement;
      host.style.setProperty('--list-grid', this.gridTemplate());
      host.style.setProperty('--list-grid-mobile', this.mobileGridTemplate());
    });
  }
}
