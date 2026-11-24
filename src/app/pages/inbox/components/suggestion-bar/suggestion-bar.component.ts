import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'

export type SuggestionState = 'idle' | 'loading' | 'failed'

/**
 * Plan 682: the assistant's drafted reply above the reply box — send as it is, edit first, dismiss — or the button that
 * asks for one. Presentational: the page decides when it shows and does the calls.
 */
@Component({
  selector: 'app-suggestion-bar',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './suggestion-bar.component.html',
  styleUrl: './suggestion-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuggestionBarComponent {
  /** The text to show; empty when there is none to show. */
  readonly suggestion = input('')
  readonly state = input<SuggestionState>('idle')
  /** A dictionary key for a refused send (window closed, do-not-contact, failed). */
  readonly errorKey = input<string | null>(null)
  /** The dictionary key of the failed-suggestion line. */
  readonly failKey = input('ibx_sg_failed')
  readonly busy = input(false)
  readonly send = output<void>()
  readonly edit = output<void>()
  readonly dismiss = output<void>()
  readonly ask = output<void>()
}
