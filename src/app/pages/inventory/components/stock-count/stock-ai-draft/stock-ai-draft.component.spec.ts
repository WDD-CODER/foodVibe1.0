import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule, Mic, Square } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
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

  it('on 413 shows the general failure (no product cap any more) and keeps the recorder with its text', async () => {
    gemini.extractStockCount.and.rejectWith(new HttpErrorResponse({ status: 413 }))
    await open()
    await send()
    expect(onSetErrorMsg).toHaveBeenCalledWith('stk_ai_failed')
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
    fixture.componentRef.setInput('unmatched', [
      { id: 7, text: 'בננות 3', status: 'unmatched', candidates: [], hasAmount: false, missing: ['product', 'amount'] }
    ])
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

  describe('plan 650 — choose, nearest, add new', () => {
    const products = [
      { productId: 'a', name: 'בצל צהוב' },
      { productId: 'b', name: 'בצל סגול' },
      { productId: 'c', name: 'כרוב' }
    ]
    const picks: unknown[] = []
    const added: number[] = []

    beforeEach(() => {
      picks.length = 0
      added.length = 0
      fixture.componentInstance.pick.subscribe((p) => picks.push(p))
      fixture.componentInstance.addNew.subscribe((id) => added.push(id))
      fixture.componentRef.setInput('products', products)
    })

    it('shows a choose line as toggle chips plus a search, and a chip emits the pick', () => {
      fixture.componentRef.setInput('unmatched', [
        {
          id: 1,
          text: 'בצל 2 kg',
          status: 'choose',
          candidates: products.slice(0, 2),
          hasAmount: true,
          missing: ['product']
        }
      ])
      fixture.detectChanges()
      expect(el().textContent).toContain('stk_ai_choose')
      const chips = el().querySelectorAll<HTMLInputElement>('[data-testid="stk-ai-candidates"] .c-chip--toggle input')
      expect(chips.length).toBe(2)
      expect(el().querySelector('[data-testid="stk-ai-search"] app-search-combobox')).not.toBeNull()
      chips[1].click()
      expect(picks).toEqual([{ id: 1, productId: 'b' }])
    })

    it('shows an unmatched line with the nearest, the search and add-new, which only emits when pressed', () => {
      fixture.componentRef.setInput('unmatched', [
        {
          id: 2,
          text: 'בננות 3',
          status: 'unmatched',
          candidates: [products[2]],
          hasAmount: true,
          missing: ['product']
        }
      ])
      fixture.detectChanges()
      expect(el().textContent).toContain('stk_ai_not_found')
      expect(el().querySelectorAll('[data-testid="stk-ai-candidates"] .c-chip--toggle').length).toBe(1)
      expect(added).toEqual([])
      el().querySelector<HTMLButtonElement>('[data-testid="stk-ai-add-new"]')!.click()
      expect(added).toEqual([2])
    })

    it('plan 655: one question per missing part — which product, how much, which unit — and the amount answer is emitted', () => {
      const amounts: { id: number; quantity: number }[] = []
      fixture.componentInstance.amount.subscribe((a) => amounts.push(a))
      fixture.componentRef.setInput('unmatched', [
        {
          id: 5,
          text: 'x',
          status: 'unmatched',
          candidates: [],
          hasAmount: false,
          missing: ['product', 'amount', 'unit']
        },
        { id: 6, text: 'y', status: 'unmatched', candidates: [], hasAmount: true, missing: ['unit'] }
      ])
      fixture.detectChanges()
      expect(el().querySelectorAll('[data-testid="stk-ai-q-product"]').length).toBe(1)
      expect(el().querySelectorAll('[data-testid="stk-ai-q-amount"]').length).toBe(1)
      expect(el().querySelectorAll('[data-testid="stk-ai-q-unit"]').length).toBe(2)
      fixture.debugElement.query(By.directive(CounterComponent)).componentInstance.valueChange.emit(2.5)
      fixture.detectChanges()
      el().querySelector<HTMLButtonElement>('[data-testid="stk-ai-confirm-amount"]')!.click()
      expect(amounts).toEqual([{ id: 5, quantity: 2.5 }])
    })

    describe('plan 657 — the asked amount is confirmed before it counts', () => {
      const amounts: { id: number; quantity: number }[] = []
      const counter = () => fixture.debugElement.query(By.directive(CounterComponent))
      const confirm = () => el().querySelector<HTMLButtonElement>('[data-testid="stk-ai-confirm-amount"]')!

      beforeEach(() => {
        amounts.length = 0
        fixture.componentInstance.amount.subscribe((a) => amounts.push(a))
        fixture.componentRef.setInput('unmatched', [
          { id: 7, text: 'ארגז עגבניות', status: 'unmatched', candidates: [], hasAmount: false, missing: ['amount'] }
        ])
        fixture.detectChanges()
      })

      it('(a) three taps on the counter emit nothing; the line stays and shows 3', () => {
        for (const n of [1, 2, 3]) {
          counter().componentInstance.valueChange.emit(n)
          fixture.detectChanges()
        }
        expect(amounts).toEqual([])
        expect(el().querySelector('[data-testid="stk-ai-q-amount"]')).not.toBeNull()
        expect(el().querySelector<HTMLInputElement>('[data-testid="stk-ai-q-amount"] input')!.value).toBe('3')
      })

      it('(b) the confirm button emits the amount once with 3', () => {
        for (const n of [1, 2, 3]) counter().componentInstance.valueChange.emit(n)
        fixture.detectChanges()
        confirm().click()
        expect(amounts).toEqual([{ id: 7, quantity: 3 }])
      })

      it('(b) Enter in the typed number emits the amount once with 3', () => {
        counter().componentInstance.valueChange.emit(3)
        fixture.detectChanges()
        el()
          .querySelector<HTMLInputElement>('[data-testid="stk-ai-q-amount"] input')!
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        expect(amounts).toEqual([{ id: 7, quantity: 3 }])
      })

      it('(c) a confirm with 0 emits nothing', () => {
        expect(confirm().getAttribute('aria-disabled')).toBe('true')
        confirm().click()
        counter().componentInstance.valueChange.emit(0)
        fixture.detectChanges()
        confirm().click()
        expect(amounts).toEqual([])
      })
    })

    it('a pick from the search emits the product', () => {
      fixture.componentRef.setInput('unmatched', [
        { id: 3, text: 'x', status: 'unmatched', candidates: [], hasAmount: true, missing: ['product'] },
        { id: 4, text: 'y', status: 'choose', candidates: [products[0]], hasAmount: true, missing: ['unit'] }
      ])
      fixture.detectChanges()
      expect(el().querySelectorAll('[data-testid="stk-ai-search"]').length).toBe(1)
      expect(el().querySelectorAll('[data-testid="stk-ai-candidates"]').length).toBe(0)
      const combobox = fixture.debugElement.query(By.css('app-search-combobox')).componentInstance
      combobox.picked.emit({ option: products[1], source: 'pointer' })
      expect(picks).toEqual([{ id: 3, productId: 'b' }])
    })
  })
})
