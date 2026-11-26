import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, model, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { GeminiService, type VoicePurpose } from '@services/gemini.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { VOICE_MAX_SECONDS, VOICE_MIME_TYPES, VOICE_TRANSCRIPT_MAX } from '@schemas/ai-voice.schema'

/** What the host gets when the person presses the send button. */
export interface VoiceNoteSend {
  text: string
  source: 'voice' | 'text'
  fileId: string | null
}

type VoiceState = 'idle' | 'recording' | 'recorded' | 'transcribing'

const PREFERRED_MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

/**
 * Plan 623: record a spoken note (up to 3 minutes) or type / paste it; the recording is transcribed into the text box.
 * The host decides what to do with the text through `send`. Falls back to the text box when the browser cannot record.
 */
@Component({
  selector: 'app-voice-note',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, TextareaAutoGrowDirective, LoaderComponent, DisabledWhyDirective],
  templateUrl: './voice-note.component.html',
  styleUrl: './voice-note.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoiceNoteComponent {
  // 1. INJECTED
  private readonly gemini = inject(GeminiService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  // 2. INPUTS / OUTPUTS
  readonly purpose = input.required<VoicePurpose>()
  readonly placeholderKey = input('')
  readonly sendLabelKey = input.required<string>()
  readonly busyLabelKey = input('')
  readonly busy = input(false)
  readonly disabled = input(false)
  /** Why the note cannot be used (translated). With a reason its controls are blocked and say why (plan 747). */
  readonly disabledWhy = input<string | null>(null)
  readonly text = model('')
  readonly send = output<VoiceNoteSend>()

  // 4. SIGNALS & CONSTANTS
  protected readonly maxChars = VOICE_TRANSCRIPT_MAX
  protected readonly canRecord_ =
    typeof MediaRecorder !== 'undefined' && !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia)
  protected readonly state_ = signal<VoiceState>('idle')
  protected readonly seconds_ = signal(0)
  protected readonly objectUrl_ = signal<string | null>(null)
  private fromVoice = false
  private fileId: string | null = null
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private blob: Blob | null = null
  private mime = ''
  private duration = 0
  private timer: ReturnType<typeof setInterval> | null = null

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release())
  }

  // 6. METHODS
  protected clock(): string {
    const s = this.seconds_()
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  /** Cannot be used: disabled by the caller, with or without a reason. */
  private off_(): boolean {
    return this.disabled() || !!this.disabledWhy()
  }

  protected onType(value: string): void {
    this.text.set(value)
    if (!value.trim()) this.resetSource()
  }

  protected canSend(): boolean {
    return (
      !!this.text().trim() && !this.busy() && !this.off_() && (this.state_() === 'idle' || this.state_() === 'recorded')
    )
  }

  protected emit(): void {
    const text = this.text().trim()
    if (!text || !this.canSend()) return
    if (this.fromVoice) this.send.emit({ text, source: 'voice', fileId: this.fileId })
    else this.send.emit({ text, source: 'text', fileId: null })
  }

  protected async start(): Promise<void> {
    if (this.state_() !== 'idle' || this.off_()) return
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = PREFERRED_MIME.find((m) => MediaRecorder.isTypeSupported(m))
      this.recorder = new MediaRecorder(this.stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 32000 })
    } catch {
      this.stopTracks()
      this.userMsg.onSetErrorMsg(this.translation.translate('voice_note_mic_denied'))
      return
    }
    const recorder = this.recorder
    this.chunks = []
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data?.size) this.chunks.push(e.data)
    }
    recorder.onstop = () => this.onStopped(recorder)
    this.seconds_.set(0)
    this.state_.set('recording')
    recorder.start()
    this.timer = setInterval(() => {
      this.seconds_.update((s) => s + 1)
      if (this.seconds_() >= VOICE_MAX_SECONDS) this.stop()
    }, 1000)
  }

  protected stop(): void {
    this.clearTimer()
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
  }

  private onStopped(recorder: MediaRecorder): void {
    this.clearTimer()
    this.stopTracks()
    this.mime = recorder.mimeType || this.chunks[0]?.type || ''
    this.blob = new Blob(this.chunks, { type: this.mime })
    this.duration = this.seconds_()
    this.revokeUrl()
    this.objectUrl_.set(URL.createObjectURL(this.blob))
    this.state_.set('recorded')
  }

  protected discard(): void {
    this.dropRecording()
    this.state_.set('idle')
  }

  protected async transcribe(): Promise<void> {
    if (this.state_() !== 'recorded' || !this.blob || this.off_()) return
    this.state_.set('transcribing')
    try {
      const base = this.mime.split(';')[0].trim().toLowerCase()
      const mimeType = (VOICE_MIME_TYPES as readonly string[]).includes(base) ? base : 'audio/webm'
      const res = await this.gemini.transcribeVoice(
        { blob: this.blob, mimeType, durationSec: this.duration },
        this.purpose()
      )
      if (!res.transcript.trim()) {
        this.userMsg.onSetWarningMsg(this.translation.translate('voice_note_empty'))
        this.state_.set('recorded')
        return
      }
      const current = this.text()
      this.text.set(current ? `${current}\n${res.transcript}` : res.transcript)
      this.fromVoice = true
      this.fileId = res.fileId
      this.dropRecording()
      this.state_.set('idle')
    } catch (err) {
      const e = err as { status?: number; message?: string; error?: { error?: string } }
      const code = e.error?.error
      let key = 'voice_note_failed'
      if (e.message === 'AUDIO_TOO_LARGE' || code === 'AUDIO_TOO_LARGE') key = 'voice_note_too_large'
      else if (code === 'ai_monthly_cap_reached') key = 'ai_monthly_cap_reached'
      else if (e.status === 429) key = 'ai_daily_limit_reached_all'
      this.userMsg.onSetErrorMsg(this.translation.translate(key))
      this.logging.error({
        event: 'voice_note.transcribe_failed',
        message: 'Voice transcription failed',
        context: { status: String(e.status ?? '') }
      })
      this.state_.set('recorded')
    }
  }

  private resetSource(): void {
    this.fromVoice = false
    this.fileId = null
  }

  private dropRecording(): void {
    this.blob = null
    this.chunks = []
    this.revokeUrl()
    this.objectUrl_.set(null)
  }

  private revokeUrl(): void {
    const url = this.objectUrl_()
    if (url) URL.revokeObjectURL(url)
  }

  private clearTimer(): void {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
  }

  private stopTracks(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  private release(): void {
    this.clearTimer()
    if (this.recorder) {
      this.recorder.ondataavailable = null
      this.recorder.onstop = null
      if (this.recorder.state !== 'inactive') this.recorder.stop()
    }
    this.stopTracks()
    this.revokeUrl()
  }
}
