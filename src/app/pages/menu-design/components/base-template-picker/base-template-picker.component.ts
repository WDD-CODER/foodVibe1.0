import { ChangeDetectionStrategy, Component, output } from '@angular/core'
import { MENU_BASE_TEMPLATES, type MenuBaseTemplate, baseDesign } from '@schemas/menu-design/menu-base-templates'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { MenuPreviewComponent } from 'src/app/shared/menu-preview/menu-preview.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'

/** Plan 765: the popup a new design starts from: the four base looks, each drawn on the sample menu. */
@Component({
  selector: 'app-base-template-picker',
  standalone: true,
  imports: [TranslatePipe, ModalShellComponent, MenuPreviewComponent],
  templateUrl: './base-template-picker.component.html',
  styleUrl: './base-template-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseTemplatePickerComponent {
  // 3. OUTPUTS
  readonly picked = output<MenuBaseTemplate>()
  readonly dismissed = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly choices = MENU_BASE_TEMPLATES.map((id) => ({
    id,
    design: baseDesign(id),
    labelKey: `menu_design_base_${id}`,
    hintKey: `menu_design_base_hint_${id}`,
    hintId: `menu-design-base-hint-${id}`
  }))
}
