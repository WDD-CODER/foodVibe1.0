import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { EventStageBarComponent } from './event-stage-bar.component'
import { EventPipelineService } from '@services/event-pipeline.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { PlanSnapshotService } from '@services/plan-snapshot.service'
import { EventClosingDialogComponent } from '../event-closing-dialog/event-closing-dialog.component'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import type { MenuEvent } from '@models/menu-event.model'

@Component({ selector: 'app-event-closing-dialog', standalone: true, template: '<i class="closing-stub"></i>' })
class ClosingDialogStub {
  readonly eventId = input.required<string>()
  readonly closed = output<void>()
}

describe('EventStageBarComponent', () => {
  let fixture: ComponentFixture<EventStageBarComponent>
  let el: HTMLElement
  let store: ReturnType<typeof signal<MenuEvent[]>>
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let eventData: { allMenuEvents_: unknown; updateMenuEvent: jasmine.Spy }
  let allowed: Record<string, boolean>
  let confirmAnswer: boolean
  let snapshots: { buildFor: jasmine.Spy }
  const snapshot = { at: 9, suppliers: [], extraCosts: 0, plannedRevenue: 0, plannedProfit: 0, plannedProfitPct: 0 }

  const base: MenuEvent = {
    _id: 'e1',
    name: 'אירוע',
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage: 'inquiry',
    eventDate: '2026-12-01'
  }

  const pills = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.stage-pill'))
  const pill = (stage: string) => pills().find((p) => p.textContent?.trim() === `T:event_stage_${stage}`)!

  async function setup(event: MenuEvent = base): Promise<void> {
    store.set([event])
    fixture.detectChanges()
    await fixture.whenStable()
  }

  beforeEach(async () => {
    confirmAnswer = true
    allowed = { changeStage: true, edit: true, editMoney: true }
    store = signal<MenuEvent[]>([base])
    snapshots = { buildFor: jasmine.createSpy('buildFor').and.returnValue(snapshot) }
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['changeStage'])
    pipeline.changeStage.and.resolveTo({ ok: true, event: base })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    eventData = {
      allMenuEvents_: store.asReadonly(),
      updateMenuEvent: jasmine.createSpy('updateMenuEvent').and.resolveTo(base)
    }
    await TestBed.configureTestingModule({
      imports: [EventStageBarComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuEventDataService, useValue: eventData },
        { provide: EventPipelineService, useValue: pipeline },
        { provide: PlanSnapshotService, useValue: snapshots },
        { provide: PermissionService, useValue: { can: (action: string) => allowed[action] } },
        { provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(confirmAnswer) } }
      ]
    })
      .overrideComponent(EventStageBarComponent, {
        remove: { imports: [EventClosingDialogComponent] },
        add: { imports: [ClosingDialogStub] }
      })
      .compileComponents()
    fixture = TestBed.createComponent(EventStageBarComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    el = fixture.nativeElement
  })

  it('shows the seven stages in order plus "not closed", with the current one marked', async () => {
    await setup()
    expect(pills().length).toBe(8)
    expect(pill('inquiry').classList).toContain('is-current')
    expect(pill('quote_sent').classList).not.toContain('is-current')
  })

  it('moves the event when a stage is clicked', async () => {
    await setup()
    pill('quote_sent').click()
    expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'quote_sent' })
  })

  it('never moves to "finished" and says why', async () => {
    await setup()
    expect(pill('finished').getAttribute('aria-disabled')).toBe('true')
    pill('finished').click()
    expect(pipeline.changeStage).not.toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:stage_finished_hint')
  })

  it('refuses "deposit paid" for an event with no date, without calling the server', async () => {
    await setup({ ...base, eventDate: undefined })
    pill('deposit_paid').click()
    expect(pipeline.changeStage).not.toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:stage_needs_date')
  })

  it('"not closed" opens the reason dialog and sends the reason on save', async () => {
    await setup()
    pill('not_closed').click()
    fixture.detectChanges()
    expect(el.querySelector('app-not-closed-dialog')).toBeTruthy()
    el.querySelectorAll<HTMLInputElement>('app-not-closed-dialog input[type="radio"]')[0].click()
    fixture.detectChanges()
    el.querySelector<HTMLButtonElement>('app-not-closed-dialog .c-modal-actions .c-btn-primary')!.click()
    expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'not_closed', reason: 'price', reasonText: '' })
  })

  it('"not closed" is refused from a later stage', async () => {
    await setup({ ...base, stage: 'deposit_paid' })
    pill('not_closed').click()
    expect(el.querySelector('app-not-closed-dialog')).toBeNull()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:stage_not_closed_from')
  })

  it('is read-only for someone who may not change the stage', async () => {
    allowed['changeStage'] = false
    await setup()
    expect(pill('quote_sent').getAttribute('aria-disabled')).toBe('true')
    pill('quote_sent').click()
    expect(pipeline.changeStage).not.toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('T:stage_not_allowed')
  })

  it('locks the deposit fields unless the user may edit money, but keeps them visible', async () => {
    allowed['editMoney'] = false
    await setup({ ...base, deposit: { amount: 2000 } })
    el.querySelectorAll<HTMLButtonElement>('.stage-link')[0].click()
    fixture.detectChanges()
    const amount = el.querySelector<HTMLInputElement>('#stage-deposit-amount')!
    expect(amount.disabled).toBeTrue()
    expect(amount.value).toBe('2000')
    expect(el.querySelector<HTMLInputElement>('#stage-client-name')!.disabled).toBeFalse()
  })

  it('saves the client name with only that field changed', async () => {
    await setup()
    el.querySelectorAll<HTMLButtonElement>('.stage-link')[0].click()
    fixture.detectChanges()
    const name = el.querySelector<HTMLInputElement>('#stage-client-name')!
    name.value = ' דנה '
    name.dispatchEvent(new Event('change'))
    expect(eventData.updateMenuEvent).toHaveBeenCalledWith({ ...base, clientName: 'דנה' })
  })

  it('lists the stage history newest first with who and when', async () => {
    await setup({
      ...base,
      stageHistory: [
        { stage: 'inquiry', at: 1000, by: 'u1', byName: 'דן' },
        { stage: 'quote_sent', at: 2000, by: 'u1', byName: 'דן' }
      ]
    })
    el.querySelectorAll<HTMLButtonElement>('.stage-link')[1].click()
    fixture.detectChanges()
    const rows = Array.from(el.querySelectorAll('.stage-history-stage')).map((r) => r.textContent?.trim())
    expect(rows).toEqual(['T:event_stage_quote_sent', 'T:event_stage_inquiry'])
  })

  describe('deposit paid (plan 467)', () => {
    const dialog = () => el.querySelector('app-deposit-paid-dialog')
    const fill = async (date: string, amount: string): Promise<void> => {
      const d = el.querySelector<HTMLInputElement>('app-deposit-paid-dialog #deposit-paid-date')!
      d.value = date
      d.dispatchEvent(new Event('input'))
      const a = el.querySelector<HTMLInputElement>('app-deposit-paid-dialog #deposit-paid-amount')!
      a.value = amount
      a.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    const save = () => el.querySelector<HTMLButtonElement>('app-deposit-paid-dialog .c-modal-actions .c-btn-primary')!

    let order: string[]

    beforeEach(() => {
      order = []
      eventData.updateMenuEvent.and.callFake(async () => {
        order.push('deposit')
        return base
      })
      pipeline.changeStage.and.callFake(async (_id, change) => {
        order.push('stage')
        store.update((list) => list.map((e) => ({ ...e, stage: change.stage })))
        return { ok: true, event: base }
      })
    })

    it('asks the owner for the payment and moves nothing until it is saved', async () => {
      await setup({ ...base, stage: 'quote_sent' })
      pill('deposit_paid').click()
      fixture.detectChanges()
      await fixture.whenStable()
      expect(dialog()).toBeTruthy()
      expect(pipeline.changeStage).not.toHaveBeenCalled()
      expect(eventData.updateMenuEvent).not.toHaveBeenCalled()
    })

    it('saves the stage move first and then the deposit', async () => {
      await setup({ ...base, stage: 'quote_sent' })
      pill('deposit_paid').click()
      fixture.detectChanges()
      await fixture.whenStable()
      await fill('05012027', '500')
      save().click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'deposit_paid' })
      expect(eventData.updateMenuEvent).toHaveBeenCalledTimes(1)
      const sent = eventData.updateMenuEvent.calls.mostRecent().args[0] as MenuEvent
      expect(sent.deposit).toEqual({ date: '2027-01-05', amount: 500 })
      expect(sent.stage).toBe('deposit_paid')
      expect(order).toEqual(['stage', 'deposit'])
      expect(dialog()).toBeNull()
    })

    it('keeps the amount already on the event when only the date is new', async () => {
      await setup({ ...base, stage: 'quote_sent', deposit: { amount: 100, date: '2026-01-01' } })
      pill('deposit_paid').click()
      fixture.detectChanges()
      await fixture.whenStable()
      await fill('05012027', '300')
      save().click()
      await fixture.whenStable()
      const sent = eventData.updateMenuEvent.calls.mostRecent().args[0] as MenuEvent
      expect(sent.deposit).toEqual({ date: '2027-01-05', amount: 300 })
    })

    it('saves no deposit when the stage move fails', async () => {
      pipeline.changeStage.and.resolveTo({ ok: false } as never)
      await setup({ ...base, stage: 'quote_sent' })
      pill('deposit_paid').click()
      fixture.detectChanges()
      await fixture.whenStable()
      await fill('05012027', '500')
      save().click()
      await fixture.whenStable()
      expect(pipeline.changeStage).toHaveBeenCalled()
      expect(eventData.updateMenuEvent).not.toHaveBeenCalled()
    })

    it('moves nothing when the owner cancels', async () => {
      await setup({ ...base, stage: 'quote_sent' })
      pill('deposit_paid').click()
      fixture.detectChanges()
      await fixture.whenStable()
      el.querySelector<HTMLButtonElement>('app-deposit-paid-dialog .c-btn-ghost')!.click()
      fixture.detectChanges()
      expect(dialog()).toBeNull()
      expect(pipeline.changeStage).not.toHaveBeenCalled()
      expect(eventData.updateMenuEvent).not.toHaveBeenCalled()
    })

    it('lets staff (no money edit) move straight through with no dialog', async () => {
      allowed['editMoney'] = false
      await setup({ ...base, stage: 'quote_sent' })
      pill('deposit_paid').click()
      fixture.detectChanges()
      expect(dialog()).toBeNull()
      expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'deposit_paid' })
      expect(eventData.updateMenuEvent).not.toHaveBeenCalled()
    })
  })

  describe('scroll rail (plan 467)', () => {
    it('puts the stage pills in the shared scroll rail', async () => {
      await setup()
      expect(el.querySelectorAll('app-scroll-rail .stage-pill').length).toBe(8)
    })

    it('brings the current stage into view when the screen opens', async () => {
      const spy = spyOn(Element.prototype, 'scrollIntoView')
      await setup({ ...base, stage: 'ordering' })
      await fixture.whenStable()
      const current = el.querySelector('.stage-pill.is-current')!
      expect(spy.calls.all().some((c) => c.object === current)).toBeTrue()
    })
  })

  describe('closing (plan 446)', () => {
    const closingLink = () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.stage-link')).find((b) =>
        b.textContent?.includes('T:event_closing_open')
      )

    it('attaches the planning snapshot when entering "ordering"', async () => {
      await setup({ ...base, stage: 'deposit_paid' })
      pill('ordering').click()
      expect(snapshots.buildFor).toHaveBeenCalled()
      expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'ordering', planSnapshot: snapshot })
    })

    it('attaches nothing for a stage that keeps no snapshot', async () => {
      await setup()
      pill('quote_sent').click()
      expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'quote_sent' })
    })

    it('does not rebuild a frozen snapshot', async () => {
      await setup({ ...base, stage: 'execution', planSnapshot: { ...snapshot, frozenAt: 5 } })
      pill('ordering').click()
      expect(snapshots.buildFor).not.toHaveBeenCalled()
      expect(pipeline.changeStage).toHaveBeenCalledWith('e1', { stage: 'ordering' })
    })

    it('opens the closing dialog by itself after entering "post_production"', async () => {
      await setup({ ...base, stage: 'execution' })
      pill('post_production').click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(el.querySelector('app-event-closing-dialog')).toBeTruthy()
    })

    it('shows «סגירת אירוע» from "execution" on, not before', async () => {
      await setup({ ...base, stage: 'ordering' })
      expect(closingLink()).toBeUndefined()
      store.set([{ ...base, stage: 'execution' }])
      fixture.detectChanges()
      expect(closingLink()).toBeTruthy()
      closingLink()!.click()
      fixture.detectChanges()
      expect(el.querySelector('app-event-closing-dialog')).toBeTruthy()
    })

    it('marks "finished" as the current stage once the event is finished', async () => {
      await setup({ ...base, stage: 'finished' })
      expect(pill('finished').classList).toContain('is-current')
      expect(closingLink()).toBeTruthy()
    })
  })
})
