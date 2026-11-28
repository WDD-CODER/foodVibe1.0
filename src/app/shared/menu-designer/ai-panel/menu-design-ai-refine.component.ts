import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { MENU_DESIGN_REQUEST_MAX } from '@schemas/ai-menu-design.schema'
import type { MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { LoggingService } from '@services/logging.service'
import { MenuDesignAiService } from '@services/menu-design-ai.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormFieldComponent } from '../../form-field/form-field.component'
import { LoaderComponent } from '../../loader/loader.component'
import { menuDesignAiErrorKey } from './menu-design-ai-error'

let nextRefineId = 0

/**
 * Plan 766: «change in words» under the designer's preview, with the way back to the design from before the last AI
 * change. The designer holds that design; this box only asks.
 */
@Component({
  selector: 'app-menu-design-ai-refine',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, TextareaAutoGrowDirective, FormFieldComponent, LoaderComponent],
  templateUrl: './menu-design-ai-refine.component.html',
  styleUrl: './menu-design-ai-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDesignAiRefineComponent {
  // 1. INJECTED
  private readonly ai = inject(MenuDesignAiService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 2. INPUTS
  readonly design = input.required<MenuDesignDraft>()
  /** True while there is a design from before an AI change to go back to. */
  readonly canUndo = input(false)

  // 3. OUTPUTS
  readonly refined = output<MenuDesignDraft>()
  readonly undo = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly inputId = `menu-design-ai-refine-${++nextRefineId}`
  protected readonly requestMax = MENU_DESIGN_REQUEST_MAX
  protected readonly request_ = signal('')
  protected readonly isBusy_ = signal(false)
  protected readonly errorKey_ = signal<string | null>(null)
  private isDestroyed_ = false

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.isDestroyed_ = true))
  }

  // 6. METHODS
  protected onRequestInput(event: Event): void {
    this.request_.set((event.target as HTMLTextAreaElement).value)
  }

  async onApply(): Promise<void> {
    const request = this.request_().trim()
    if (!request || this.isBusy_()) return
    this.isBusy_.set(true)
    this.errorKey_.set(null)
    try {
      const { design, fallback } = await this.ai.refine(this.design(), request)
      if (this.isDestroyed_) return
      // The AI gave nothing usable: the design stays, and there is nothing to undo.
      if (fallback) this.fail_('menu_design_ai_refine_failed')
      else this.refined.emit(design)
    } catch (err) {
      this.logging.warn({
        event: 'menu_design.ai_refine_failed',
        message: 'The AI could not change the design',
        context: { err }
      })
      if (!this.isDestroyed_) this.fail_(menuDesignAiErrorKey(err, 'menu_design_ai_refine_failed'))
    } finally {
      this.isBusy_.set(false)
    }
  }

  protected onUndo(): void {
    this.errorKey_.set(null)
    this.undo.emit()
  }

  private fail_(key: string): void {
    this.errorKey_.set(key)
    this.userMsg.onSetErrorMsg(this.translation.translate(key))
  }
}
