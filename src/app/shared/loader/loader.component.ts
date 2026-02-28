import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {
  /** 'large' (48px), 'medium' (32px), 'small' (20px). Default: medium. */
  size = input<'large' | 'medium' | 'small'>('medium');
  /** Translation key for label below the pot (e.g. loader_please_wait). Shown for large/medium only. */
  label = input<string | undefined>(undefined);
  /** When true, full-area glass overlay over parent. */
  overlay = input<boolean>(false);
  /** When true, inline-flex (e.g. next to button text). */
  inline = input<boolean>(false);
}
