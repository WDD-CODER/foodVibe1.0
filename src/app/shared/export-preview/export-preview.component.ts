import {
  Component,
  input,
  output,
  effect,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/pipes/translation-pipe.pipe';
import type { ExportPayload } from '../../core/utils/export.util';

const BODY_PRINT_CLASS = 'export-preview-visible';

@Component({
  selector: 'app-export-preview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './export-preview.component.html',
  styleUrl: './export-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportPreviewComponent {
  /** When set, the preview is visible. */
  readonly payload = input<ExportPayload | null>(null);

  readonly exportClick = output<void>();
  readonly printClick = output<void>();
  readonly close = output<void>();

  constructor() {
    effect(() => {
      const hasPayload = !!this.payload();
      if (hasPayload) {
        document.body.classList.add(BODY_PRINT_CLASS);
      } else {
        document.body.classList.remove(BODY_PRINT_CLASS);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.payload()) this.close.emit();
  }

  onOverlayClick(): void {
    this.close.emit();
  }

  onExport(): void {
    this.exportClick.emit();
  }

  onPrint(): void {
    this.printClick.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
