import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/** Plan 555: the business's logo and name at the top of a public page. Guest-visible text is interpolated, never HTML. */
@Component({
  selector: 'app-public-brand',
  standalone: true,
  templateUrl: './public-brand.component.html',
  styleUrl: './public-brand.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicBrandComponent {
  readonly name = input.required<string>()
  readonly logoUrl = input<string | null | undefined>(null)
}
