import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule, Mic, Square } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { VoiceNoteComponent } from 'src/app/shared/voice-note/voice-note.component'
import { GeminiService } from '@services/gemini.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { StockAiDraftComponent, type StockAiExtracted } from './stock-ai-draft.component'

describe('StockAiDraftComponent', () => {
  let fixture: ComponentFixture<StockAiDraftComponent>
  let gemini: jasmine.SpyObj<GeminiService>
  let onSetErrorMsg: jasmine.Spy
  let logError: jasmine.Spy
  let extracted: StockAiExtracted[]
  let busy: boolean[]

  beforeEach(async () => {
    gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['extractStockCount', 'offerModelSwitch'])
    gemini.offerModelSwitch.and.returnValue(false)
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    logError = jasmine.createSpy('error')
    await TestBed.configureTestingModule({
      imports: [StockAiDraftComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Mic, Square })],
      providers: [
        { provide: GeminiService, useValue: gemini },
        { provide: UserMsgService, useValue: { onSetErrorMsg, onSetWarningMsg: () => undefined } },
        { provide: LoggingService, useValue: { error: logError } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(StockAiDraftComponent)
    extracted = []
    busy = []
    fixture.componentInstance.extracted.subscribe((e) => extracted.push(e))
    fixture.componentInstance.busyChange.subscribe((b) => busy.push(b))
    fixture.detectChanges()
  })

  const el = () => fixture.nativeElement as HTMLElement
  const openBtn = () => el().querySelector<HTMLButtonElement>('[data-testid="stk-ai-open"]')!
  const note = () => fixture.debugElement.query(By.directive(VoiceNoteComponent))

  async function open(): Promise<void> {
    openBtn().click()
    fixture.detectChanges()
    await fixture.whenStable()
  }

  async function send(text = 'קמח 4', source: 'voice' | 'text' = 'text', fileId: string | null = null) {
    note().componentInstance.send.emit({ text, source, fileId })
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('is a closed button that opens the recorder with purpose stock', async () => {
    expect(openBtn().getAttribute('aria-expanded')).toBe('false')
    expect(note()).toBeNull()
    await open()
    expect(openBtn().getAttribute('aria-expanded')).toBe('true')
    expect(note().componentInstance.purpose()).toBe('stock')
  })

  it('sends the text and the file id, reports busy, emits the answer and closes', async () => {
    const answer = { draftId: 'd1', lines: [], unmatched: [] }
    gemini.extractStockCount.and.resolveTo(answer)
    await open()
    await send('קמח 4', 'voice', 'f1')
    expect(gemini.extractStockCount).toHaveBeenCalledWith('קמח 4', 'f1')
    expect(busy).toEqual([true, false])
    expect(extracted).toEqual([{ answer, source: 'voice' }])
    expect(note()).toBeNull()
  })

  it('shows the waiting state while the call runs', async () => {
    let finish!: (v: never) => void
    gemini.extractStockCount.and.returnValue(new Promise((r) => (finish = r as never)))
    await open()
    note().componentInstance.send.emit({ text: 'x', source: 'text', fileId: null })
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="stk-ai-busy"]')).not.toBeNull()
    finish({ draftId: null, lines: [], unmatched: [] } as never)
    await fixture.whenStable()
    fixture.detectChanges()
  })

  it('on 413 says too many products and keeps the recorder with its text', async () => {
    gemini.extractStockCount.and.rejectWith(
      new HttpErrorResponse({ status: 413, error: { error: 'TOO_MANY_PRODUCTS' } })
    )
    await open()
    await send()
    expect(onSetErrorMsg).toHaveBeenCalledWith('stk_ai_too_many_products')
    expect(note()).not.toBeNull()
    expect(extracted).toEqual([])
  })

  it('on a monthly cap uses the cap message', async () => {
    gemini.extractStockCount.and.rejectWith(
      new HttpErrorResponse({ status: 429, error: { error: 'ai_monthly_cap_reached' } })
    )
    await open()
    await send()
    expect(onSetErrorMsg).toHaveBeenCalledWith('ai_monthly_cap_reached')
  })

  it('on any other error shows stk_ai_failed and logs the status only', async () => {
    gemini.extractStockCount.and.rejectWith(new HttpErrorResponse({ status: 502, error: { error: 'x' } }))
    await open()
    await send()
    expect(onSetErrorMsg).toHaveBeenCalledWith('stk_ai_failed')
    expect(logError).toHaveBeenCalledWith(
      jasmine.objectContaining({ event: 'stock.extract.failed', context: { status: '502' } })
    )
    expect(busy).toEqual([true, false])
  })

  it('lists the conflicts and unmatched words and emits the button choices', () => {
    fixture.componentRef.setInput('conflicts', [{ productId: 'p1', name: 'קמח', onSheet: '4 kg', suggested: '9 kg' }])
    fixture.componentRef.setInput('unmatched', [{ id: 7, text: 'בננות 3' }])
    fixture.detectChanges()
    const conflicts = el().querySelector('[data-testid="stk-ai-conflicts"]')!
    expect(conflicts.textContent).toContain('4 kg')
    expect(conflicts.textContent).toContain('9 kg')
    expect(el().querySelector('[data-testid="stk-ai-unmatched"]')!.textContent).toContain('בננות 3')
    const replaced: string[] = []
    const kept: string[] = []
    const dismissed: number[] = []
    fixture.componentInstance.replace.subscribe((v) => replaced.push(v))
    fixture.componentInstance.keep.subscribe((v) => kept.push(v))
    fixture.componentInstance.dismiss.subscribe((v) => dismissed.push(v))
    const chips = conflicts.querySelectorAll<HTMLButtonElement>('button.c-chip--tap')
    chips[0].click()
    chips[1].click()
    el().querySelector<HTMLButtonElement>('[data-testid="stk-ai-unmatched"] button')!.click()
    expect([replaced, kept, dismissed]).toEqual([['p1'], ['p1'], [7]])
  })
})
