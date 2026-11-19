import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ListChecks, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Product } from '@models/product.model'
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
    logError = jasmine.createSpy('error')
    TestBed.configureTestingModule({
      imports: [StockCountComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks })],
      providers: [
        { provide: KitchenStateService, useValue: { products_: signal(products) } },
        { provide: StockCountService, useValue: service },
        { provide: UnitRegistryService, useValue: { getConversion: () => 1 } },
        { provide: UserMsgService, useValue: { onSetErrorMsg, onSetSuccessMsg } },
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
})
