import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import {
  MENU_DESIGN_NOTE_MAX,
  MENU_DESIGN_TEXT_MAX,
  MENU_DESIGN_URL_MAX,
  type MenuDesignAiResult
} from '@schemas/ai-menu-design.schema'
import type { MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { SAMPLE_MENU_DOC } from '@schemas/menu-design/menu-doc'
import { LoggingService } from '@services/logging.service'
import { MenuDesignAiService, type MenuDesignAiReference } from '@services/menu-design-ai.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { formFromDesign } from '@utils/menu-design-form.util'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormFieldComponent } from '../../form-field/form-field.component'
import { LoaderComponent } from '../../loader/loader.component'
import { MenuPreviewComponent } from '../../menu-preview/menu-preview.component'
import { ModalShellComponent } from '../../modal-shell/modal-shell.component'
import { menuDesignAiErrorKey } from './menu-design-ai-error'

type ReferenceKind = MenuDesignAiReference['kind']

const KIND_ICONS: Record<ReferenceKind, string> = { image: 'image', url: 'link', text: 'sparkles' }

let nextPanelId = 0

/**
 * Plan 766: the chef shows the AI a picture, a link or a few words, gets three designs on the sample menu and picks
 * one. It saves nothing: the picked design is handed to the designer.
 */
@Component({
  selector: 'app-menu-design-ai-panel',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    TextareaAutoGrowDirective,
    FormFieldComponent,
    LoaderComponent,
    MenuPreviewComponent,
    ModalShellComponent
  ],
  templateUrl: './menu-design-ai-panel.component.html',
  styleUrl: './menu-design-ai-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDesignAiPanelComponent {
  // 1. INJECTED
  private readonly ai = inject(MenuDesignAiService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 2. INPUTS
  /** The designer's draft: a picked design keeps its logo and its texts. */
  readonly design = input.required<MenuDesignDraft>()

  // 3. OUTPUTS
  readonly picked = output<MenuDesignDraft>()

  // 4. SIGNALS & CONSTANTS
  protected readonly uid = `menu-design-ai-${++nextPanelId}`
  protected readonly noteMax = MENU_DESIGN_NOTE_MAX
  protected readonly urlMax = MENU_DESIGN_URL_MAX
  protected readonly textMax = MENU_DESIGN_TEXT_MAX
  protected readonly sampleDoc = SAMPLE_MENU_DOC
  protected readonly kinds = (['image', 'url', 'text'] as const).map((value) => ({
    value,
    icon: KIND_ICONS[value],
    labelKey: `menu_design_ai_ref_${value}`,
    hintKey: `menu_design_ai_ref_${value}_hint`,
    hintId: `${this.uid}-hint-${value}`
  }))
  protected readonly kind_ = signal<ReferenceKind>('image')
  protected readonly file_ = signal<File | null>(null)
  protected readonly note_ = signal('')
  protected readonly url_ = signal('')
  protected readonly text_ = signal('')
  protected readonly isBusy_ = signal(false)
  protected readonly errorKey_ = signal<string | null>(null)
  /** The offered designs while the popup is open. */
  protected readonly variants_ = signal<MenuDesignAiResult[] | null>(null)
  private isDestroyed_ = false

  // 5. COMPUTED
  /** What would be sent now; null while the picked kind is still empty. */
  protected readonly reference = computed<MenuDesignAiReference | null>(() => {
    const kind = this.kind_()
    if (kind === 'image') {
      const file = this.file_()
      const note = this.note_().trim()
      return file ? { kind, file, ...(note && { note }) } : null
    }
    if (kind === 'url') {
      const url = this.url_().trim()
      return url ? { kind, url } : null
    }
    const text = this.text_().trim()
    return text ? { kind, text } : null
  })

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.isDestroyed_ = true))
  }

  // 6. METHODS
  protected onKindPick(kind: ReferenceKind): void {
    this.kind_.set(kind)
    this.errorKey_.set(null)
  }

  protected onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    // Emptied so picking the same file again is a change.
    input.value = ''
    if (file) this.file_.set(file)
  }

  protected onNoteInput(event: Event): void {
    this.note_.set((event.target as HTMLInputElement).value)
  }

  protected onUrlInput(event: Event): void {
    this.url_.set((event.target as HTMLInputElement).value)
  }

  protected onTextInput(event: Event): void {
    this.text_.set((event.target as HTMLTextAreaElement).value)
  }

  async onSuggest(): Promise<void> {
    const reference = this.reference()
    if (!reference || this.isBusy_()) return
    this.isBusy_.set(true)
    this.errorKey_.set(null)
    try {
      const variants = await this.ai.variants(reference)
      if (!this.isDestroyed_) this.variants_.set(variants)
    } catch (err) {
      this.logging.warn({
        event: 'menu_design.ai_variants_failed',
        message: 'The AI designs could not be made',
        context: { err, kind: reference.kind }
      })
      if (this.isDestroyed_) return
      const key = menuDesignAiErrorKey(err, 'menu_design_ai_failed')
      this.errorKey_.set(key)
      this.userMsg.onSetErrorMsg(this.translation.translate(key))
    } finally {
      this.isBusy_.set(false)
    }
  }

  /** The variant's look, with the draft's own logo and texts. */
  protected onPick({ design }: MenuDesignAiResult): void {
    const { logo, fixedTexts } = this.design()
    this.picked.emit({
      ...formFromDesign(design),
      logo: { ...logo },
      fixedTexts: { ...fixedTexts },
      origin: 'ai'
    })
    this.variants_.set(null)
  }

  protected onVariantsClose(): void {
    this.variants_.set(null)
  }
}
