import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ListChecks, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Product } from '@models/product.model'
import { By } from '@angular/platform-browser'
import { GeminiService } from '@services/gemini.service'
import { StockAiDraftComponent } from './stock-ai-draft/stock-ai-draft.component'
import type { StockExtractResponse } from '@schemas/ai-stock-extract.schema'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { UserMsgService } from '@services/user-msg.service'
import { StockCountService } from '../../services/stock-count.service'
import { StockCountComponent } from './stock-count.component'

const product = (id: string, name: string, min = 0): Product =>
  ({ _id: id, nameHebrew: name, baseUnit: 'kg', purchaseOptions: [], minStockLevel: min }) as unknown as Product

describe('StockCountComponent', () => {
  let fixture: ComponentFixture<StockCountComponent>
  let service: jasmine.SpyObj<StockCountService>
  let onSetErrorMsg: jasmine.Spy
  let onSetSuccessMsg: jasmine.Spy
  let onSetWarningMsg: jasmine.Spy
  let logError: jasmine.Spy

  async function setup(
    products: Product[] = [product('a', 'אורז'), product('b', 'קמח')],
    draft: unknown = null
  ): Promise<void> {
    service = jasmine.createSpyObj<StockCountService>('StockCountService', [
      'loadOnHand',
      'loadOpenDraft',
      'saveDraft',
      'finalize'
    ])
    service.loadOnHand.and.resolveTo([])
    service.loadOpenDraft.and.resolveTo(draft as never)
    service.saveDraft.and.resolveTo({ _id: 'c1', updatedAt: 5 } as never)
    service.finalize.and.resolveTo({ _id: 'c1' } as never)
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    onSetSuccessMsg = jasmine.createSpy('onSetSuccessMsg')
    onSetWarningMsg = jasmine.createSpy('onSetWarningMsg')
    logError = jasmine.createSpy('error')
    TestBed.configureTestingModule({
      imports: [StockCountComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks })],
      providers: [
        { provide: KitchenStateService, useValue: { products_: signal(products) } },
        { provide: StockCountService, useValue: service },
        { provide: UnitRegistryService, useValue: { getConversion: () => 1 } },
        { provide: UserMsgService, useValue: { onSetErrorMsg, onSetSuccessMsg, onSetWarningMsg } },
        { provide: GeminiService, useValue: jasmine.createSpyObj('GeminiService', ['extractStockCount']) },
        { provide: LoggingService, useValue: { error: logError } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    fixture = TestBed.createComponent(StockCountComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const rows = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="stk-row"]'))
  const btn = (id: string) => el().querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!
  const chipOf = (row: HTMLElement) => row.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  const comp = () => fixture.componentInstance as unknown as { setAmount(p: Product, n: number): void }

  async function settle(): Promise<void> {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('marks a row counted when its amount changes and counts it in the header', async () => {
    await setup()
    expect(chipOf(rows()[0]).checked).toBeFalse()
    comp().setAmount(product('a', 'אורז'), 3)
    await settle()
    expect(chipOf(rows()[0]).checked).toBeTrue()
  })

  it('saves only counted rows, then uses PUT (same id) for the second save', async () => {
    await setup()
    comp().setAmount(product('a', 'אורז'), 3)
    await settle()
    btn('stk-save-draft').click()
    await settle()
    const [input, id] = service.saveDraft.calls.argsFor(0)
    expect(id).toBeUndefined()
    expect(input.lines).toEqual([{ productId: 'a', quantity: 3, unit: 'kg' }])
    expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_draft_saved')
    btn('stk-save-draft').click()
    await settle()
    expect(service.saveDraft.calls.argsFor(1)[1]).toBe('c1')
  })

  it('marks the row of a UNIT_NOT_CONVERTIBLE answer with line 1', async () => {
    await setup()
    comp().setAmount(product('a', 'אורז'), 3)
    comp().setAmount(product('b', 'קמח'), 2)
    await settle()
    service.saveDraft.and.rejectWith(
      new HttpErrorResponse({ status: 400, error: { error: 'UNIT_NOT_CONVERTIBLE', line: 1 } })
    )
    btn('stk-save-draft').click()
    await settle()
    expect(rows()[1].classList).toContain('stock-count__row--error')
    expect(rows()[0].classList).not.toContain('stock-count__row--error')
    expect(onSetErrorMsg).toHaveBeenCalledWith('stk_line_refused')
    expect(logError).toHaveBeenCalled()
    expect(rows().length).toBe(2)
  })

  it('disables finalise while no row is counted', async () => {
    await setup()
    expect(btn('stk-finalize').disabled).toBeTrue()
    comp().setAmount(product('a', 'אורז'), 1)
    await settle()
    expect(btn('stk-finalize').disabled).toBeFalse()
  })

  it('finalises: saves, closes, empties the sheet and switches to below minimum', async () => {
    await setup()
    comp().setAmount(product('a', 'אורז'), 1)
    await settle()
    btn('stk-finalize').click()
    await settle()
    expect(service.finalize).toHaveBeenCalledWith('c1')
    expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_finalized')
    expect(service.loadOnHand).toHaveBeenCalledTimes(2)
    expect(btn('stk-tab-below').classList).toContain('active')
  })

  it('continues the open draft: its lines fill the rows and the next save is a PUT', async () => {
    await setup(undefined, {
      _id: 'd9',
      updatedAt: 7,
      countedAt: new Date(2026, 10, 10, 12).getTime(),
      lines: [{ productId: 'b', quantity: 4, unit: 'kg', baseQuantity: 4 }]
    })
    expect(chipOf(rows()[1]).checked).toBeTrue()
    expect(chipOf(rows()[0]).checked).toBeFalse()
    expect(el().querySelector('[data-testid="stk-draft-note"]')).not.toBeNull()
    comp().setAmount(product('a', 'אורז'), 1)
    await settle()
    btn('stk-save-draft').click()
    await settle()
    expect(service.saveDraft.calls.argsFor(0)[1]).toBe('d9')
  })

  describe('AI suggestion (plan 637)', () => {
    const child = () =>
      fixture.debugElement.query(By.directive(StockAiDraftComponent)).componentInstance as StockAiDraftComponent
    const answer = (over: Partial<StockExtractResponse> = {}): StockExtractResponse => ({
      draftId: 'dr1',
      lines: [],
      unmatched: [],
      ...over
    })
    const tag = (row: HTMLElement) => row.querySelector('[data-testid="stk-ai-tag"]')
    const amountOf = (row: HTMLElement) => row.querySelector('app-counter')

    it('fills an uncounted row, marks it, and the mark goes when the person changes the row', async () => {
      await setup()
      child().extracted.emit({
        answer: answer({ lines: [{ productId: 'b', quantity: 4, unit: 'kg' }] }),
        source: 'text'
      })
      await settle()
      expect(chipOf(rows()[1]).checked).toBeTrue()
      expect(tag(rows()[1])).not.toBeNull()
      expect(tag(rows()[0])).toBeNull()
      expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_ai_applied')
      expect(amountOf(rows()[1])).not.toBeNull()
      comp().setAmount(product('b', 'קמח'), 5)
      await settle()
      expect(tag(rows()[1])).toBeNull()
    })

    it('leaves a counted row alone: the same figure is ignored, another goes to "already counted"', async () => {
      await setup()
      comp().setAmount(product('a', 'אורז'), 2)
      comp().setAmount(product('b', 'קמח'), 4)
      await settle()
      child().extracted.emit({
        answer: answer({
          lines: [
            { productId: 'a', quantity: 2, unit: 'kg' },
            { productId: 'b', quantity: 9, unit: 'kg' },
            { productId: 'ghost', quantity: 1, unit: 'kg' }
          ]
        }),
        source: 'text'
      })
      await settle()
      expect(el().querySelector('[data-testid="stk-ai-conflicts"]')!.textContent).toContain('קמח')
      expect(tag(rows()[0])).toBeNull()
      expect(tag(rows()[1])).toBeNull()
      child().replace.emit('b')
      await settle()
      expect(tag(rows()[1])).not.toBeNull()
      expect(el().querySelector('[data-testid="stk-ai-conflicts"]')).toBeNull()
      btn('stk-save-draft').click()
      await settle()
      expect(service.saveDraft.calls.argsFor(0)[0].lines).toContain({ productId: 'b', quantity: 9, unit: 'kg' })
    })

    it('keeps the sheet figure on "keep" and lists unmatched words until removed', async () => {
      await setup()
      comp().setAmount(product('b', 'קמח'), 4)
      await settle()
      child().extracted.emit({
        answer: answer({
          lines: [{ productId: 'b', quantity: 9, unit: 'kg' }],
          unmatched: [{ spoken: 'בננות', quantity: 3, unit: 'kg' }]
        }),
        source: 'text'
      })
      await settle()
      expect(el().querySelector('[data-testid="stk-ai-unmatched"]')!.textContent).toContain('בננות 3 kg')
      child().keep.emit('b')
      child().dismiss.emit(1)
      await settle()
      expect(el().querySelector('[data-testid="stk-ai-conflicts"]')).toBeNull()
      expect(el().querySelector('[data-testid="stk-ai-unmatched"]')).toBeNull()
      expect(tag(rows()[1])).toBeNull()
    })

    it('says so when nothing was found', async () => {
      await setup()
      child().extracted.emit({ answer: answer({ draftId: null }), source: 'text' })
      expect(onSetWarningMsg).toHaveBeenCalledWith('stk_ai_nothing_found')
    })

    it('sends source and draftIds with the save, voice sticking once used; manual with none otherwise', async () => {
      await setup()
      comp().setAmount(product('a', 'אורז'), 1)
      await settle()
      btn('stk-save-draft').click()
      await settle()
      const plain = service.saveDraft.calls.argsFor(0)[0]
      expect(plain.source).toBe('manual')
      expect(plain.draftIds).toBeUndefined()
      child().extracted.emit({ answer: answer({ draftId: 'dr1' }), source: 'voice' })
      child().extracted.emit({ answer: answer({ draftId: 'dr2' }), source: 'text' })
      child().extracted.emit({ answer: answer({ draftId: 'dr2' }), source: 'text' })
      await settle()
      btn('stk-save-draft').click()
      await settle()
      const second = service.saveDraft.calls.argsFor(1)[0]
      expect(second.source).toBe('voice')
      expect(second.draftIds).toEqual(['dr1', 'dr2'])
    })

    it('adds at most 20 draft ids and a continued draft keeps its own', async () => {
      await setup(undefined, {
        _id: 'd9',
        updatedAt: 7,
        countedAt: new Date(2026, 10, 10, 12).getTime(),
        source: 'voice',
        draftIds: ['old'],
        lines: [{ productId: 'b', quantity: 4, unit: 'kg', baseQuantity: 4 }]
      })
      for (let i = 0; i < 25; i++) child().extracted.emit({ answer: answer({ draftId: `n${i}` }), source: 'text' })
      btn('stk-save-draft').click()
      await settle()
      const sent = service.saveDraft.calls.argsFor(0)[0]
      expect(sent.source).toBe('voice')
      expect(sent.draftIds!.length).toBe(20)
      expect(sent.draftIds![0]).toBe('old')
    })
  })
})
