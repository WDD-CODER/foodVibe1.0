import { Component, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutSideDirective } from '@directives/click-out-side';

@Component({
  selector: 'app-export-toolbar-overlay',
  standalone: true,
  imports: [CommonModule, ClickOutSideDirective],
  templateUrl: './export-toolbar-overlay.component.html',
  styleUrl: './export-toolbar-overlay.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ExportToolbarOverlayComponent {
  /** Emitted when user clicks outside the overlay (e.g. to close). */
  closeRequest = output<void>();
}
