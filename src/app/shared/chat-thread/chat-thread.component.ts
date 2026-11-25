import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { MESSAGE_TEMPLATES } from '@schemas/front-desk/message-templates'
import { TranslationService } from '@services/translation.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import type { Message, MessageStatus } from '@models/conversation.model'

const TIME_ZONE = 'Asia/Jerusalem'
const dayKey = (ms: number): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(ms))
const timeFmt = new Intl.DateTimeFormat('he-IL', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})
const dayFmt = new Intl.DateTimeFormat('he-IL', { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' })

const STATUS_ICON: Record<MessageStatus, string> = {
  queued: 'clock',
  sent: 'check',
  delivered: 'check-check',
  read: 'check-check',
  failed: 'x'
}
const AUTHOR_KEY: Record<string, string> = { ai: 'chat_by_ai', member: 'chat_by_member', server: 'chat_by_server' }

export interface ChatItem {
  id: string
  dayLine: string | null
  mine: boolean
  body: string
  author: string | null
  /** True for a message the assistant wrote. */
  byAi: boolean
  time: string
  statusIcon: string | null
  statusKey: string | null
  status: MessageStatus
  buttons: { id: string; title: string }[]
}

/**
 * Plan 677: the one read-only message thread the inbox and the simulator both draw. No service of its own: the page gives
 * it the messages and the server's clock. Template messages show their dictionary body with the values filled in.
 */
@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './chat-thread.component.html',
  styleUrl: './chat-thread.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatThreadComponent {
  private readonly translation = inject(TranslationService)

  readonly messages = input.required<readonly Message[]>()
  /** The server's clock (epoch ms). */
  readonly now = input<number>(0)
  /** Whose messages sit at the inline end: outbound for `business`, inbound for `guest`. */
  readonly perspective = input<'business' | 'guest'>('business')
  readonly buttonsEnabled = input(false)
  readonly buttonTapped = output<string>()
  /** Plan 682: shows "fix this answer" under every message the assistant wrote. */
  readonly fixable = input(false)
  readonly fixRequested = output<string>()
  /** Plan 735: shows the other side's 'writing…' bubble after the last message. */
  readonly typing = input(false)

  protected readonly items_ = computed<ChatItem[]>(() => {
    const list = this.messages()
    const lastOutId = [...list].reverse().find((m) => m.direction === 'out')?._id
    let prevDay = ''
    return list.map((m) => {
      const day = dayKey(m.at)
      const dayLine = day !== prevDay ? dayFmt.format(new Date(m.at)) : null
      prevDay = day
      const out = m.direction === 'out'
      return {
        id: m._id,
        dayLine,
        mine: this.perspective() === 'business' ? out : !out,
        body: this.bodyOf(m),
        author: out ? (AUTHOR_KEY[m.author] ?? null) : null,
        byAi: out && m.author === 'ai',
        time: timeFmt.format(new Date(m.at)),
        statusIcon: out ? STATUS_ICON[m.status] : null,
        statusKey: out ? 'chat_st_' + m.status : null,
        status: m.status,
        buttons:
          m._id === lastOutId
            ? (m.buttons ?? []).map((b) => ({ id: b.id, title: this.translation.translate(b.title) }))
            : []
      }
    })
  })

  protected tap(id: string): void {
    if (this.buttonsEnabled()) this.buttonTapped.emit(id)
  }

  private bodyOf(m: Message): string {
    if (m.kind === 'button') {
      const title = m.text || m.buttonId || ''
      return this.translation.translate('chat_button_tapped').replace('{title}', this.translation.translate(title))
    }
    if (m.kind !== 'template' || !m.template) return m.text
    const def = Object.prototype.hasOwnProperty.call(MESSAGE_TEMPLATES, m.template.name)
      ? MESSAGE_TEMPLATES[m.template.name]
      : undefined
    if (!def) return m.text
    const body = this.translation.translate(def.bodyKey)
    if (body === def.bodyKey) return m.text
    return def.params.reduce((text, p, i) => text.split(`{${p}}`).join(m.template?.params[i] ?? ''), body)
  }
}
