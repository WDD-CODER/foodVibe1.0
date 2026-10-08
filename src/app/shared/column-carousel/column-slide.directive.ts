import { Directive, input, signal } from '@angular/core'

/**
 * One column inside an `app-column-carousel-header` or `app-column-carousel-cell` (plan 349).
 * On desktop every slide is a normal grid cell; on mobile only the active one shows.
 */
@Directive({
  selector: '[columnSlide]',
  standalone: true,
  host: {
    class: 'column-slide',
    '[class.column-slide--active]': 'active()'
  }
})
export class ColumnSlideDirective {
  /** Label shown for this column on mobile (a dictionary key or an already-translated string). */
  readonly label = input<string>('')
  /** Set by the owning header/cell. */
  readonly active = signal(false)
}
