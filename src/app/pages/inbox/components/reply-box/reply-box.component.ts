import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { ConversationDataService } from '@services/conversation-data.service'
import type { Conversation } from '@models/conversation.model'
import { PHONE_QUERY } from '@utils/breakpoints'

const TEXT_MAX = 4000
const TEMPLATE_MAX = 200
const TEMPLATE_NAME = 'need_more_info'
const oneLine = (v: string): string => v.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ')

/**
 * Plan 677: the reply box of the inbox thread — the "I'll answer" line while the assistant holds the conversation, the
 * free-text box while the 24-hour window is open, and the one allowed template (need_more_info) once it is closed.
 */
@Component({
  selector: 'app-reply-box',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent, FormFieldComponent],
  templateUrl: './reply-box.component.html',
  styleUrl: './reply-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReplyBoxComponent {
  private readonly data = inject(ConversationDataService)

  readonly conversation = input.required<Conversation>()
  /** The server's clock at the last thread read (epoch ms). */
  readonly now = input.required<number>()
  /** The text typed so far, kept by the page per conversation. */
  readonly draft = input('')
  readonly draftChange = output<string>()
  /** A 409 BAD_STATUS on the reply: the conversation was closed meanwhile. */
  readonly closedMeanwhile = output<void>()
  /** A take-over that the server refused with BAD_STATUS. */
  readonly actionFailed = output<void>()

  protected readonly textMax = TEXT_MAX
  protected readonly templateMax = TEMPLATE_MAX
  protected readonly templateName = TEMPLATE_NAME
  protected readonly templateOptions = [{ value: TEMPLATE_NAME, label: 'tpl_need_more_info' }]
  protected readonly busy_ = signal(false)
  protected readonly errorKey_ = signal<string | null>(null)
  private readonly forcedTemplate_ = signal<string | null>(null)
  private readonly templateText_ = signal('')
  private readonly textBox = viewChild<ElementRef<HTMLTextAreaElement>>('textBox')
  private readonly templateBox = viewChild<ElementRef<HTMLInputElement>>('templateBox')

  protected readonly isBot_ = computed(() => this.conversation().status === 'bot')
  protected readonly windowOpen_ = computed(
    () => this.now() < this.conversation().windowExpiresAt && this.forcedTemplate_() !== this.conversation()._id
  )
  protected readonly rows_ = computed(() => Math.min(4, Math.max(1, this.draft().split('\n').length)))
  protected readonly canSend_ = computed(() => !this.busy_() && this.draft().trim().length > 0)
  protected readonly templateValue_ = computed(() => this.templateText_())
  protected readonly canSendTemplate_ = computed(() => !this.busy_() && this.templateText_().trim().length > 0)

  protected onDraft(value: string): void {
    this.errorKey_.set(null)
    this.draftChange.emit(value)
  }

  protected onTemplateText(value: string): void {
    this.errorKey_.set(null)
    this.templateText_.set(oneLine(value).slice(0, TEMPLATE_MAX))
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    if (typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches) return
    event.preventDefault()
    void this.send()
  }

  protected async takeOver(): Promise<void> {
    const res = await this.data.takeOver(this.conversation()._id)
    if (!res.ok) {
      this.actionFailed.emit()
      return
    }
    setTimeout(() => (this.textBox() ?? this.templateBox())?.nativeElement.focus(), 0)
  }

  protected async send(): Promise<void> {
    if (!this.canSend_()) return
    const id = this.conversation()._id
    const text = this.draft().trim()
    this.busy_.set(true)
    this.errorKey_.set(null)
    const res = await this.data.reply(id, text)
    this.busy_.set(false)
    if (res.ok) {
      this.draftChange.emit('')
      setTimeout(() => this.textBox()?.nativeElement.focus(), 0)
      return
    }
    if (res.code === 'WINDOW_CLOSED') {
      this.forcedTemplate_.set(id)
      this.templateText_.set(oneLine(text).trim().slice(0, TEMPLATE_MAX))
      this.errorKey_.set('ibx_window_closed_now')
    } else if (res.code === 'DO_NOT_CONTACT') this.errorKey_.set('ibx_do_not_contact')
    else if (res.code === 'BAD_STATUS') this.closedMeanwhile.emit()
    else this.errorKey_.set('ibx_send_failed')
  }

  protected async sendTemplate(): Promise<void> {
    if (!this.canSendTemplate_()) return
    this.busy_.set(true)
    this.errorKey_.set(null)
    const res = await this.data.sendTemplate(this.conversation()._id, TEMPLATE_NAME, {
      text: this.templateText_().trim()
    })
    this.busy_.set(false)
    if (res.ok) {
      this.templateText_.set('')
      return
    }
    if (res.code === 'BAD_STATUS') this.closedMeanwhile.emit()
    else if (res.code === 'DO_NOT_CONTACT') this.errorKey_.set('ibx_do_not_contact')
    else this.errorKey_.set('ibx_send_failed')
  }
}
