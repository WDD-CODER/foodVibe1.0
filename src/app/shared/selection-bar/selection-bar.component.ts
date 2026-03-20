import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ListSelectionState } from 'src/app/shared/list-selection/list-selection.state';

@Component({
  selector: 'app-selection-bar',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './selection-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionBarComponent {
  selectionState = input.required<ListSelectionState>();
  bulkDelete = output<string[]>();

  protected onBulkDelete(): void {
    this.bulkDelete.emit(Array.from(this.selectionState().selectedIds()));
  }
}
