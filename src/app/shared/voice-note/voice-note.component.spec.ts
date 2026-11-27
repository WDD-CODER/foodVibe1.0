import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule, Mic, Square } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { VoiceNoteComponent, type VoiceNoteSend } from './voice-note.component'
import { GeminiService } from '@services/gemini.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'

class FakeRecorder {
  static supported = ['audio/webm', 'audio/mp4']
  static last: FakeRecorder | null = null
  static isTypeSupported = (m: string) => FakeRecorder.supported.includes(m)
  state: 'inactive' | 'recording' = 'inactive'
  mimeType: string
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(
    public stream: unknown,
    public options: { mimeType?: string; audioBitsPerSecond?: number }
  ) {
    this.mimeType = options.mimeType ?? ''
    FakeRecorder.last = this
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['abc'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

describe('VoiceNoteComponent', () => {
  let fixture: ComponentFixture<VoiceNoteComponent>
  let el: HTMLElement
  let gemini: jasmine.SpyObj<GeminiService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let track: { stop: jasmine.Spy }
  const w = window as unknown as { MediaRecorder?: unknown }
  const original = w.MediaRecorder
  const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
  let sent: VoiceNoteSend[]

  const create = (recordable: boolean) => {
    if (recordable) {
      w.MediaRecorder = FakeRecorder
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: () => Promise.resolve({ getTracks: () => [track] }) }
      })
    } else {
      delete w.MediaRecorder
    }
    fixture = TestBed.createComponent(VoiceNoteComponent)
    fixture.componentRef.setInput('purpose', 'logistics')
    fixture.componentRef.setInput('sendLabelKey', 'send_key')
    fixture.componentInstance.send.subscribe((v) => sent.push(v))
    fixture.detectChanges()
    el = fixture.nativeElement
  }
  const type = (value: string) => {
    const ta = el.querySelector('textarea')!
    ta.value = value
    ta.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const click = (selector: string) => {
    el.querySelector<HTMLButtonElement>(selector)!.click()
    fixture.detectChanges()
  }
  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
    fixture.detectChanges()
  }
  const buttonByText = (text: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text))!

  beforeEach(async () => {
    sent = []
    track = { stop: jasmine.createSpy('stop') }
    gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['transcribeVoice'])
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetWarningMsg'])
    await TestBed.configureTestingModule({
      imports: [VoiceNoteComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Mic, Square })],
      providers: [
        { provide: GeminiService, useValue: gemini },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn']) },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    jasmine.clock().install()
    FakeRecorder.last = null
  })

  afterEach(() => {
    jasmine.clock().uninstall()
    if (original) w.MediaRecorder = original
    else delete w.MediaRecorder
    if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices)
  })

  it('without MediaRecorder shows only the notice, the text box and the send button', () => {
    create(false)
    expect(el.querySelector('.voice-note-unsupported')?.textContent).toContain('voice_note_unsupported')
    expect(el.querySelector('textarea')).not.toBeNull()
    expect(el.querySelectorAll('button').length).toBe(1)
  })

  it('with nothing recorded or written the send button says why, and works once there is text (plan 747)', () => {
    create(false)
    const send = el.querySelector<HTMLButtonElement>('.voice-note-send')!
    expect(send.disabled).toBeFalse()
    expect(send.getAttribute('aria-disabled')).toBe('true')
    click('.voice-note-send')
    expect(sent).toEqual([])
    expect(document.body.querySelector('.c-tooltip')?.textContent?.trim()).toBe('why_voice_note_empty')
    type('hello')
    expect(send.hasAttribute('aria-disabled')).toBeFalse()
    expect(document.body.querySelector('.c-tooltip')).toBeNull()
  })

  it('while the caller is busy the empty send button is natively disabled, with no reason', () => {
    create(false)
    fixture.componentRef.setInput('busy', true)
    fixture.detectChanges()
    const send = el.querySelector<HTMLButtonElement>('.voice-note-send')!
    expect(send.disabled).toBeTrue()
    expect(send.hasAttribute('aria-disabled')).toBeFalse()
  })

  it('emits typed text as source text with no file id', () => {
    create(false)
    type('  hello  ')
    click('.voice-note-send')
    expect(sent).toEqual([{ text: 'hello', source: 'text', fileId: null }])
  })

  it('stops by itself at 180 seconds and sends the base mime type', async () => {
    create(true)
    click('.c-btn-ghost')
    await flush()
    expect(FakeRecorder.last!.options).toEqual({ mimeType: 'audio/webm', audioBitsPerSecond: 32000 })
    jasmine.clock().tick(179_000)
    expect(FakeRecorder.last!.state).toBe('recording')
    jasmine.clock().tick(1000)
    fixture.detectChanges()
    expect(FakeRecorder.last!.state).toBe('inactive')
    expect(track.stop).toHaveBeenCalled()
    gemini.transcribeVoice.and.resolveTo({ transcript: 'שלום', fileId: 'f1' })
    click('.c-btn-primary')
    await flush()
    const [recording, purpose] = gemini.transcribeVoice.calls.mostRecent().args
    expect(recording.mimeType).toBe('audio/webm')
    expect(recording.durationSec).toBe(180)
    expect(purpose).toBe('logistics')
  })

  it('sends voice with the file id after a transcription, text after the box is emptied', async () => {
    create(true)
    click('.c-btn-ghost')
    await flush()
    click('.c-btn-primary') // stop
    gemini.transcribeVoice.and.resolveTo({ transcript: 'שלום', fileId: 'f1' })
    click('.c-btn-primary') // transcribe
    await flush()
    expect(el.querySelector('textarea')!.value).toBe('שלום')
    click('.voice-note-send')
    expect(sent[0]).toEqual({ text: 'שלום', source: 'voice', fileId: 'f1' })
    type('')
    type('typed')
    click('.voice-note-send')
    expect(sent[1]).toEqual({ text: 'typed', source: 'text', fileId: null })
  })

  it('refuses a recording that is too large with the voice_note_too_large text and keeps the recording', async () => {
    create(true)
    click('.c-btn-ghost')
    await flush()
    click('.c-btn-primary')
    gemini.transcribeVoice.and.rejectWith(new Error('AUDIO_TOO_LARGE'))
    click('.c-btn-primary')
    await flush()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('voice_note_too_large')
    expect(el.querySelector('audio')).not.toBeNull()
  })

  it('warns on an empty transcript and maps a 429', async () => {
    create(true)
    click('.c-btn-ghost')
    await flush()
    click('.c-btn-primary')
    gemini.transcribeVoice.and.resolveTo({ transcript: '', fileId: null })
    click('.c-btn-primary')
    await flush()
    expect(userMsg.onSetWarningMsg).toHaveBeenCalledWith('voice_note_empty')
    gemini.transcribeVoice.and.rejectWith({ status: 429, error: {} })
    click('.c-btn-primary')
    await flush()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('ai_daily_limit_reached_all')
    gemini.transcribeVoice.and.rejectWith({ status: 429, error: { error: 'ai_monthly_cap_reached' } })
    click('.c-btn-primary')
    await flush()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('ai_monthly_cap_reached')
  })

  it('shows the mic-denied toast and stays idle when the microphone is refused', async () => {
    create(true)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('no', 'NotAllowedError')) }
    })
    click('.c-btn-ghost')
    await flush()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('voice_note_mic_denied')
    expect(buttonByText('voice_note_record')).toBeDefined()
  })

  it('stops the tracks when destroyed while recording', async () => {
    create(true)
    click('.c-btn-ghost')
    await flush()
    fixture.destroy()
    expect(track.stop).toHaveBeenCalled()
  })
})
