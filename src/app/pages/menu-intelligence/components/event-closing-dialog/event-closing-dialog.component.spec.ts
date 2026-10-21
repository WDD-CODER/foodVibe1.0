import { Component, input, output, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { BusinessService } from '@services/business.service'
import { CloudinaryService } from '@services/cloudinary.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { PlanSnapshotService } from '@services/plan-snapshot.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { EventClosing, MenuEvent, PlanSnapshot } from '@models/menu-event.model'
import { EventClosingDialogComponent } from './event-closing-dialog.component'

@Component({ selector: 'app-custom-select', standalone: true, template: '' })
class SelectStub {
  readonly options = input<unknown[]>([])
  readonly translateLabels = input(true)
  readonly typeToFilter = input(false)
  readonly placeholder = input('')
  readonly valueChange = output<string>()
}

const TEXTS: Record<string, string> = {
  closing_overrun: 'חריגה של {{pct}}% ({{amount}})',
  closing_missing_amounts: 'חסרים סכומים ל-{{count}} ספקים',
  no_supplier: 'ללא ספק'
}

describe('EventClosingDialogComponent', () => {
  let fixture: ComponentFixture<EventClosingDialogComponent>
  let el: HTMLElement
  let store: ReturnType<typeof signal<MenuEvent[]>>
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let allowed: Record<string, boolean>
  let confirmAnswer: boolean
  let confirmOpen: jasmine.Spy
  let upload: jasmine.Spy

  const snapshot: PlanSnapshot = {
    at: 1,
    frozenAt: 2,
    suppliers: [
      { supplierId: 'a', name: 'ירקן', plannedCost: 1000 },
      { supplierId: 'b', name: 'קצב', plannedCost: 2000 }
    ],
    extraCosts: 1000,
    plannedRevenue: 10000,
    plannedProfit: 6000,
    plannedProfitPct: 60
  }
  const base: MenuEvent = {
    _id: 'e1',
    name: 'חתונה',
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage: 'post_production',
    planSnapshot: snapshot
  }

  const text = () => el.textContent ?? ''
  const rows = () => Array.from(el.querySelectorAll<HTMLElement>('.closing-row'))
  const paid = (index: number) => rows()[index].querySelector<HTMLInputElement>('input[type="number"]')!
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(label))

  async function setup(event: MenuEvent = base): Promise<void> {
    store.set([event])
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value
    input.dispatchEvent(new Event('change'))
  }

  beforeEach(async () => {
    allowed = { editMoney: true, markArrival: true }
    confirmAnswer = true
    store = signal<MenuEvent[]>([base])
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', [
      'saveClosing',
      'finish',
      'reopen',
      'refreshPlan'
    ])
    pipeline.saveClosing.and.resolveTo({ ok: true, event: base })
    pipeline.finish.and.resolveTo({ ok: true, event: base })
    pipeline.reopen.and.resolveTo({ ok: true, event: base })
    pipeline.refreshPlan.and.resolveTo({ ok: true, event: base })
    confirmOpen = jasmine.createSpy('open').and.callFake(() => Promise.resolve(confirmAnswer))
    upload = jasmine.createSpy('upload').and.returnValue(of('https://res.cloudinary.com/demo/image/upload/n.jpg'))

    await TestBed.configureTestingModule({
      imports: [EventClosingDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        { provide: EventPipelineService, useValue: pipeline },
        { provide: PermissionService, useValue: { can: (action: string) => allowed[action] } },
        { provide: BusinessService, useValue: { business_: () => ({ settings: { overrunThresholdPct: 10 } }) } },
        { provide: KitchenStateService, useValue: { suppliersById_: () => new Map() } },
        { provide: PlanSnapshotService, useValue: { buildFor: () => snapshot } },
        { provide: CloudinaryService, useValue: { upload } },
        { provide: ConfirmModalService, useValue: { open: confirmOpen } },
        {
          provide: TranslationService,
          useValue: { translate: (key: string) => TEXTS[key] ?? `T:${key}` }
        },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
        },
        { provide: LoggingService, useValue: { warn: () => undefined, error: () => undefined, info: () => undefined } }
      ]
    })
      .overrideComponent(EventClosingDialogComponent, {
        remove: { imports: [CustomSelectComponent] },
        add: { imports: [SelectStub] }
      })
      .compileComponents()
    fixture = TestBed.createComponent(EventClosingDialogComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    el = fixture.nativeElement
  })

  it('shows a row per supplier with its planned amount', async () => {
    await setup()
    expect(rows().length).toBe(2)
    expect(rows()[0].textContent).toContain('ירקן')
    expect(rows()[0].textContent).toContain('₪1,000.00')
    expect(rows()[1].textContent).toContain('₪2,000.00')
  })

  it('15 % over turns the row red with the overrun text, a decrease stays grey with its minus percent', async () => {
    await setup()
    type(paid(0), '1150')
    fixture.detectChanges()
    expect(rows()[0].classList).toContain('is-over')
    expect(rows()[0].querySelector('.remark--over')?.textContent).toContain('חריגה של 15%')
    type(paid(1), '1950')
    fixture.detectChanges()
    expect(rows()[1].classList).not.toContain('is-over')
    expect(rows()[1].querySelector('.remark--under')?.textContent).toContain('-2.5%')
  })

  it('the footer compares planned and actual profit', async () => {
    await setup()
    type(paid(0), '1150')
    type(paid(1), '1950')
    fixture.detectChanges()
    const footer = el.querySelector('.closing-footer')!.textContent!
    expect(footer).toContain('₪6,000.00')
    expect(footer).toContain('₪5,900.00')
    expect(footer).toContain('59.0%')
    expect(footer).toContain('-1.0%')
  })

  it('saves the typed amount through the pipeline, keeping the other rows', async () => {
    await setup()
    type(paid(0), '1150')
    await fixture.whenStable()
    const sent = pipeline.saveClosing.calls.mostRecent().args[1] as EventClosing
    expect(pipeline.saveClosing.calls.mostRecent().args[0]).toBe('e1')
    expect(sent.suppliers[0].actualPaid).toBe(1150)
    expect(sent.suppliers[1].actualPaid).toBeUndefined()
  })

  it('an empty row shows the partial tag', async () => {
    await setup()
    type(paid(0), '1150')
    fixture.detectChanges()
    expect(el.querySelector('.partial-tag')).toBeTruthy()
  })

  it('finish warns about the missing amounts and sends nothing when declined', async () => {
    confirmAnswer = false
    await setup()
    type(paid(0), '1150')
    button('closing_finish')!.click()
    await fixture.whenStable()
    expect(confirmOpen).toHaveBeenCalledWith('חסרים סכומים ל-1 ספקים', jasmine.anything())
    expect(pipeline.finish).not.toHaveBeenCalled()
  })

  it('finish after confirming calls the pipeline', async () => {
    await setup()
    type(paid(0), '1150')
    button('closing_finish')!.click()
    await fixture.whenStable()
    await fixture.whenStable()
    expect(pipeline.finish).toHaveBeenCalledWith('e1')
  })

  it('finish with every amount typed does not ask', async () => {
    await setup()
    type(paid(0), '1150')
    type(paid(1), '1950')
    button('closing_finish')!.click()
    await fixture.whenStable()
    await fixture.whenStable()
    expect(confirmOpen).not.toHaveBeenCalled()
    expect(pipeline.finish).toHaveBeenCalledWith('e1')
  })

  it('a finished event is locked and offers reopen instead of finish', async () => {
    await setup({ ...base, stage: 'finished', closing: { suppliers: [], finishedAt: 5 } })
    expect(el.querySelector('.locked-note')).toBeTruthy()
    expect(el.querySelectorAll<HTMLInputElement>('input:not(.visually-hidden)').length).toBeGreaterThan(0)
    for (const input of Array.from(el.querySelectorAll<HTMLInputElement>('input'))) expect(input.disabled).toBeTrue()
    expect(button('closing_finish')).toBeUndefined()
    button('closing_reopen')!.click()
    expect(pipeline.reopen).toHaveBeenCalledWith('e1')
  })

  it('staff may tick arrival and photos but not type amounts, and cannot finish', async () => {
    allowed['editMoney'] = false
    await setup()
    expect(paid(0).disabled).toBeTrue()
    const [arrived] = Array.from(rows()[0].querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    expect(arrived.disabled).toBeFalse()
    arrived.checked = true
    arrived.dispatchEvent(new Event('change'))
    await fixture.whenStable()
    const sent = pipeline.saveClosing.calls.mostRecent().args[1] as EventClosing
    expect(sent.suppliers[0].arrived).toBeTrue()
    expect(rows()[0].querySelector('.photo-add')).toBeTruthy()
    expect(button('closing_finish')).toBeUndefined()
    expect(button('closing_refresh_plan')).toBeUndefined()
  })

  it('uploads a delivery-note photo and adds its URL to that row', async () => {
    await setup()
    const file = new File(['x'], 'note.jpg', { type: 'image/jpeg' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    const input = rows()[0].querySelector<HTMLInputElement>('.photo-add input')!
    Object.defineProperty(input, 'files', { value: transfer.files, configurable: true })
    input.dispatchEvent(new Event('change'))
    await fixture.whenStable()
    await fixture.whenStable()
    expect(upload).toHaveBeenCalledTimes(1)
    const sent = pipeline.saveClosing.calls.mostRecent().args[1] as EventClosing
    expect(sent.suppliers[0].photos).toEqual(['https://res.cloudinary.com/demo/image/upload/n.jpg'])
  })

  it('shows the stored photos as thumbnails', async () => {
    const closing: EventClosing = {
      suppliers: [
        {
          supplierId: 'a',
          name: 'ירקן',
          planned: 1000,
          arrived: true,
          hasInvoice: false,
          photos: ['https://res.cloudinary.com/demo/image/upload/n.jpg']
        }
      ]
    }
    await setup({ ...base, closing })
    expect(rows()[0].querySelectorAll('.photo img').length).toBe(1)
  })

  it('an event with no saved plan says so and offers a refresh to the owner', async () => {
    await setup({ ...base, planSnapshot: undefined })
    expect(text()).toContain('T:closing_no_plan')
    button('closing_refresh_plan')!.click()
    await fixture.whenStable()
    await fixture.whenStable()
    expect(confirmOpen).toHaveBeenCalledWith('closing_refresh_confirm', jasmine.anything())
    expect(pipeline.refreshPlan).toHaveBeenCalledWith('e1', snapshot)
  })

  it('Escape and the close button emit closed', async () => {
    await setup()
    const closed = jasmine.createSpy('closed')
    fixture.componentInstance.closed.subscribe(closed)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closed).toHaveBeenCalledTimes(1)
  })
})
