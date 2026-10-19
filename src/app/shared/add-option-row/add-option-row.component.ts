import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AddOptionLabel } from 'src/app/core/utils/add-option.util'

/** Icon + label for a dropdown's single "add" option (add-option rule): `הוסף "<typed>"` or `הוסף <thing> חדש/ה`. */
@Component({
  selector: 'app-add-option-row',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './add-option-row.component.html',
  styleUrl: './add-option-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddOptionRowComponent {
  // INPUTS
  label = input.required<AddOptionLabel>()
}
