import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

/**
 * One compact, start-aligned page header (plan 352):
 *
 *   Row 1: [back?] Title (count) ········ [search on wide] [leading/filter] [actions]
 *   Row 2 (narrow, only when search is projected): [search — full width]
 *
 * Breakpoints are container queries on the header itself. The title is the page's <h1>.
 * Slots: `[header-title]` (instead of / after `titleKey`), `[header-back]`, `[header-search]`,
 * `[header-leading]` (e.g. the filter toggle), `[header-actions]`.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  /** Dictionary key for the title; or project `[header-title]`. */
  readonly titleKey = input<string | null>(null)
  /** Optional muted line under the title (plan 353) — shown on wide headers only. */
  readonly subtitleKey = input<string | null>(null)
  /** Result count shown as a pill next to the title; null hides it. */
  readonly count = input<number | null>(null)
  /** Screen-reader text for the count (e.g. "12 מתוך 40 פריטים"). */
  readonly countLabel = input<string | null>(null)
  /** Router link for a back button; or set `showBack` and handle `(back)`. */
  readonly backLink = input<string | null>(null)
  readonly showBack = input(false)
  /** Dictionary key for the back button's label. */
  readonly backLabelKey = input('back')

  readonly back = output<void>()
}
