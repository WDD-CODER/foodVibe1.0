import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { EventStageBarComponent } from './event-stage-bar.component'
import { EventPipelineService } from '@services/event-pipeline.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import type { MenuEvent } from '@models/menu-event.model'

describe('EventStageBarComponent', () => {
  let fixture: ComponentFixture<EventStageBarComponent>
  let el: HTMLElement
  let store: ReturnType<typeof signal<MenuEvent[]>>
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let eventData: { allMenuEvents_: unknown; updateMenuEvent: jasmine.Spy }
  let allowed: Record<string, boolean>
  let confirmAnswer: boolean

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
        { provide: PermissionService, useValue: { can: (action: string) => allowed[action] } },
        { provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(confirmAnswer) } }
      ]
    }).compileComponents()
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
})
