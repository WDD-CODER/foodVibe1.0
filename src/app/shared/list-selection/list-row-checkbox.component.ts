import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-list-row-checkbox',
  standalone: true,
  templateUrl: './list-row-checkbox.component.html',
  styleUrl: './list-row-checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListRowCheckboxComponent {
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly toggle = output<void>();

  onCheckboxClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    this.toggle.emit();
  }
}
