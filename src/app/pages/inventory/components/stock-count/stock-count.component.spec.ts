import { signal } from '@angular/core'
import { Router } from '@angular/router'
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
  let navigate: jasmine.Spy

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
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [StockCountComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks })],
      providers: [
        { provide: KitchenStateService, useValue: { products_: signal(products) } },
        { provide: StockCountService, useValue: service },
        { provide: UnitRegistryService, useValue: { getConversion: () => 1 } },
        { provide: UserMsgService, useValue: { onSetErrorMsg, onSetSuccessMsg, onSetWarningMsg } },
        { provide: GeminiService, useValue: jasmine.createSpyObj('GeminiService', ['extractStockCount']) },
        { provide: LoggingService, useValue: { error: logError } },
        { provide: Router, useValue: { navigate } },
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

  it('keeps the date, save draft and finish count in one actions wrapper (plan 648)', async () => {
    await setup()
    const wrapper = el().querySelector<HTMLElement>('.stock-count__actions')!
    expect(wrapper).not.toBeNull()
    expect(wrapper.querySelector('app-date-field')).not.toBeNull()
    expect(wrapper.contains(btn('stk-save-draft'))).toBeTrue()
    expect(wrapper.contains(btn('stk-finalize'))).toBeTrue()
    expect(el().querySelectorAll('.stock-count__actions').length).toBe(1)
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

    it('plan 650: a choose line shows its candidates and the pick fills that row; no row is added by itself', async () => {
      await setup([product('a', 'בצל צהוב'), product('b', 'בצל סגול')])
      child().extracted.emit({
        answer: answer({
          unmatched: [
            {
              spoken: 'בצל',
              status: 'choose',
              quantity: 2,
              unit: 'kg',
              candidates: [
                { productId: 'a', nameHebrew: 'בצל צהוב' },
                { productId: 'b', nameHebrew: 'בצל סגול' }
              ]
            }
          ]
        }),
        source: 'voice'
      })
      await settle()
      expect(rows().length).toBe(2)
      expect(chipOf(rows()[1]).checked).toBeFalse()
      const chips = el().querySelectorAll<HTMLInputElement>('[data-testid="stk-ai-candidates"] .c-chip--toggle input')
      expect(chips.length).toBe(2)
      chips[0].click()
      await settle()
      expect(chipOf(rows()[1]).checked).toBeTrue()
      expect(tag(rows()[1])).not.toBeNull()
      expect(rows().length).toBe(2)
      expect(el().querySelector('[data-testid="stk-ai-unmatched"]')).toBeNull()
      expect(onSetSuccessMsg).toHaveBeenCalledWith('stk_ai_applied')
    })

    it('plan 650: an unmatched line adds nothing; «הוספת מוצר חדש» opens the add page only when pressed', async () => {
      await setup()
      child().extracted.emit({
        answer: answer({ unmatched: [{ spoken: 'בננות', status: 'unmatched', quantity: 3 }] }),
        source: 'text'
      })
      await settle()
      expect(rows().length).toBe(2)
      expect(onSetSuccessMsg).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
      expect(el().querySelector('[data-testid="stk-ai-search"]')).not.toBeNull()
      btn('stk-ai-add-new').click()
      expect(navigate).toHaveBeenCalledWith(['/inventory/add'])
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

  describe('thousands of products (plan 645)', () => {
    const many = Array.from({ length: 3000 }, (_, i) => product(`p${i}`, `מוצר ${String(i).padStart(4, '0')}`))
    const search = async (text: string) => {
      const input = el().querySelector<HTMLInputElement>('#stock-count-search')!
      input.value = text
      input.dispatchEvent(new Event('input'))
      await settle()
    }
    const rowOf = (name: string) => rows().find((r) => r.textContent!.includes(name))
    const amountIn = (row: HTMLElement) => row.querySelector<HTMLInputElement>('app-counter input')!.value

    it('draws fewer than 100 rows at first, more on "show more"', async () => {
      await setup(many)
      expect(rows().length).toBeLessThan(100)
      expect(rows().length).toBeGreaterThan(0)
      btn('stk-show-more').click()
      await settle()
      expect(rows().length).toBe(100)
      expect(btn('stk-show-more').textContent).toContain('2900')
    })

    it('search filters the whole list, not only the drawn rows', async () => {
      await setup(many)
      await search('מוצר 2999')
      expect(rows().length).toBe(1)
      expect(rows()[0].textContent).toContain('מוצר 2999')
      expect(el().querySelector('[data-testid="stk-show-more"]')).toBeNull()
    })

    it('keeps a counted value after it leaves the drawn rows and comes back', async () => {
      await setup(many)
      btn('stk-show-more').click()
      btn('stk-show-more').click()
      await settle()
      comp().setAmount(many[120], 7)
      await settle()
      expect(amountIn(rowOf('מוצר 0120')!)).toBe('7')
      await search('מוצר 0001')
      expect(rowOf('מוצר 0120')).toBeUndefined()
      await search('')
      expect(rowOf('מוצר 0120')).toBeUndefined()
      btn('stk-show-more').click()
      btn('stk-show-more').click()
      await settle()
      expect(amountIn(rowOf('מוצר 0120')!)).toBe('7')
      expect(chipOf(rowOf('מוצר 0120')!).checked).toBeTrue()
    })

    it('unit options are a computed map by product id, not a template method', async () => {
      await setup(many)
      const c = fixture.componentInstance as unknown as Record<string, unknown> & {
        unitOptionsById_: () => Record<string, unknown[]>
      }
      expect(c['unitOptions_']).toBeUndefined()
      const map = c.unitOptionsById_()
      expect(Object.keys(map).length).toBe(3000)
      expect(c.unitOptionsById_()).toBe(map)
    })
  })
})
