import { ChangeDetectionStrategy, Component, TemplateRef, input } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'

/**
 * The one tooltip box (plan 744). Created by `TooltipDirective`, appended to <body> and shown in the browser
 * top layer. Its look is the global `.c-tooltip` engine class in styles.scss; this component has no stylesheet.
 */
@Component({
  selector: 'app-tooltip-box',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {
    class: 'c-tooltip',
    role: 'tooltip',
    popover: 'manual',
    '[attr.id]': 'boxId()',
    '[attr.dir]': 'direction()'
  },
  templateUrl: './tooltip-box.component.html'
})
export class TooltipBoxComponent {
  readonly boxId = input<string>('')
  readonly direction = input<string>('rtl')
  readonly content = input<string | TemplateRef<unknown> | null>(null)

  asTemplate(value: string | TemplateRef<unknown> | null): TemplateRef<unknown> | null {
    return value !== null && typeof value !== 'string' ? value : null
  }
}
