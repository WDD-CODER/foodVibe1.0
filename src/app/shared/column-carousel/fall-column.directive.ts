import { Directive, TemplateRef, inject, input } from '@angular/core'

/**
 * A list column that is shown either as its own cell or, when the list is too narrow, inside the switching
 * column (plan 745). Structural: `<div class="col-unit c-list-body-cell" *appFallColumn="'unit'; label: 'unit'">`.
 * It never renders itself; `app-column-carousel-header` / `-cell` render its template where it belongs.
 */
@Directive({
  selector: '[appFallColumn]',
  standalone: true
})
export class FallColumnDirective {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef)
  /** The column id, the same as the `id` in the list's declared columns. */
  readonly id = input.required<string>({ alias: 'appFallColumn' })
  /** Label shown above the value inside the switching column (a dictionary key or a translated string). */
  readonly label = input<string>('', { alias: 'appFallColumnLabel' })
}
