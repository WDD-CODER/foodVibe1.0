import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NewInquiryDialogComponent } from './new-inquiry-dialog.component'
import { EventPipelineService } from '@services/event-pipeline.service'
import { EventTypeSnapshotService } from '@services/event-type-snapshot.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { MenuEvent } from '@models/menu-event.model'

describe('NewInquiryDialogComponent', () => {
  let fixture: ComponentFixture<NewInquiryDialogComponent>
  let el: HTMLElement
  let eventData: jasmine.SpyObj<MenuEventDataService>
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let savedEvents: MenuEvent[]
  let cancels: number

  const created = { _id: 'new1', name: 'בדיקה 443' } as MenuEvent

  function type(selector: string, value: string): void {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  const saveButton = () => el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-primary')!

  beforeEach(async () => {
    eventData = jasmine.createSpyObj<MenuEventDataService>('MenuEventDataService', ['addMenuEvent'])
    eventData.addMenuEvent.and.resolveTo(created)
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['addNote'])
    pipeline.addNote.and.resolveTo({ ok: true, event: created })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    await TestBed.configureTestingModule({
      imports: [NewInquiryDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuEventDataService, useValue: eventData },
        { provide: EventPipelineService, useValue: pipeline },
        { provide: MenuEventTypeService, useValue: { allEventTypes_: signal(['wedding']) } },
        { provide: EventTypeSnapshotService, useValue: { snapshotFor: () => undefined } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: UserMsgService, useValue: userMsg }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(NewInquiryDialogComponent)
    savedEvents = []
    cancels = 0
    fixture.componentInstance.saved.subscribe((e) => savedEvents.push(e))
    fixture.componentInstance.cancelled.subscribe(() => cancels++)
    fixture.detectChanges()
    el = fixture.nativeElement
  })

  it('does not save without a name', async () => {
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('sends a body with no stage, stageHistory or notes, then adds the first note through the notes route', async () => {
    type('#inquiry-name', 'בדיקה 443')
    type('#inquiry-phone', '050-1234567')
    type('#inquiry-date', '01122026')
    type('#inquiry-guests', '80')
    type('#inquiry-note', 'התקשרה בבוקר')
    saveButton().click()
    await fixture.whenStable()

    expect(eventData.addMenuEvent).toHaveBeenCalledTimes(1)
    const body = eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>
    expect(body['name']).toBe('בדיקה 443')
    expect(body['clientName']).toBe('בדיקה 443')
    expect(body['clientPhone']).toBe('050-1234567')
    expect(body['eventDate']).toBe('2026-12-01')
    expect(body['guestCount']).toBe(80)
    expect(body['sections']).toEqual([])
    expect('stage' in body).toBeFalse()
    expect('stageHistory' in body).toBeFalse()
    expect('notes' in body).toBeFalse()
    expect(pipeline.addNote).toHaveBeenCalledWith('new1', 'התקשרה בבוקר')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('new_inquiry_saved')
    expect(savedEvents).toEqual([created])
  })

  it('skips the notes route when no first note was typed', async () => {
    type('#inquiry-name', 'ללא הערה')
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).toHaveBeenCalled()
    expect(pipeline.addNote).not.toHaveBeenCalled()
  })

  it('blocks an invalid phone number', async () => {
    type('#inquiry-name', 'דנה')
    type('#inquiry-phone', 'abc')
    expect(el.querySelector('.c-field-error')).toBeTruthy()
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('shows a typed date as day/month/year', () => {
    type('#inquiry-date', '25122026')
    expect(el.querySelector<HTMLInputElement>('#inquiry-date')!.value).toBe('25/12/2026')
    expect(el.querySelector('.c-field-error')).toBeNull()
  })

  it('blocks an impossible date and says why', async () => {
    type('#inquiry-name', 'דנה')
    type('#inquiry-date', '31022026')
    expect(el.querySelector('.c-field-error')?.textContent).toContain('date_invalid')
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('cancels on Escape', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancels).toBe(1)
  })
})
