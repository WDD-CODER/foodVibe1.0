import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NewInquiryDialogComponent } from './new-inquiry-dialog.component'
import { SearchComboboxComponent } from 'src/app/shared/search-combobox/search-combobox.component'
import { ClientDataService } from '@services/client-data.service'
import { PermissionService } from '@services/permission.service'
import type { Client } from '@models/client.model'
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
  let clientData: jasmine.SpyObj<ClientDataService>
  let isOwner_: ReturnType<typeof signal<boolean>>
  let savedEvents: MenuEvent[]
  let cancels: number

  const created = { _id: 'new1', name: 'בדיקה 443' } as MenuEvent
  const existing = { _id: 'c1', name: 'דנה כהן', phone: '052-1111111' } as Client
  const addedClient = { _id: 'c2', name: 'לקוח חדש', phone: '050-1234567' } as Client

  const combobox = () =>
    fixture.debugElement.query(By.directive(SearchComboboxComponent))
      .componentInstance as SearchComboboxComponent<Client>

  function pickExisting(): void {
    combobox().picked.emit({ option: existing, source: 'pointer' })
    fixture.detectChanges()
  }

  function startNewClient(name = 'לקוח חדש', phone = '050-1234567'): void {
    combobox().addChosen.emit({ typed: '', source: 'pointer' })
    fixture.detectChanges()
    type('#inquiry-name', name)
    type('#inquiry-phone', phone)
  }

  function type(selector: string, value: string): void {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  const saveButton = () => el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-primary')!

  beforeEach(async () => {
    eventData = jasmine.createSpyObj<MenuEventDataService>('MenuEventDataService', ['addMenuEvent'], {
      allMenuEvents_: signal<MenuEvent[]>([])
    })
    clientData = jasmine.createSpyObj<ClientDataService>('ClientDataService', ['addClient'], {
      allClients_: signal<Client[]>([existing])
    })
    clientData.addClient.and.resolveTo(addedClient)
    isOwner_ = signal(true)
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
        { provide: ClientDataService, useValue: clientData },
        { provide: PermissionService, useValue: { isOwner_ } },
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

  it('does not save without a client', async () => {
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('sends a body with no stage, stageHistory or notes, then adds the first note through the notes route', async () => {
    pickExisting()
    type('#inquiry-date', '01122026')
    type('#inquiry-guests', '80')
    type('#inquiry-note', 'התקשרה בבוקר')
    saveButton().click()
    await fixture.whenStable()

    expect(eventData.addMenuEvent).toHaveBeenCalledTimes(1)
    const body = eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>
    expect(body['name']).toBe('דנה כהן')
    expect(body['clientId']).toBe('c1')
    expect(body['clientName']).toBe('דנה כהן')
    expect(body['clientPhone']).toBe('052-1111111')
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
    pickExisting()
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).toHaveBeenCalled()
    expect(pipeline.addNote).not.toHaveBeenCalled()
  })

  it('blocks an invalid phone number', async () => {
    startNewClient('דנה', 'abc')
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
    pickExisting()
    type('#inquiry-date', '31022026')
    expect(el.querySelector('.c-field-error')?.textContent).toContain('date_invalid')
    saveButton().click()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('picking an existing client does not create a client', async () => {
    pickExisting()
    expect(el.textContent).toContain('052-1111111')
    saveButton().click()
    await fixture.whenStable()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(eventData.addMenuEvent).toHaveBeenCalledTimes(1)
  })

  it('an owner who adds a new client saves the client before the event', async () => {
    const order: string[] = []
    clientData.addClient.and.callFake(async () => (order.push('client'), addedClient))
    eventData.addMenuEvent.and.callFake(async () => (order.push('event'), created))
    startNewClient()
    saveButton().click()
    await fixture.whenStable()
    expect(clientData.addClient).toHaveBeenCalledTimes(1)
    expect(clientData.addClient.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ name: 'לקוח חדש', phone: '050-1234567', clientType: 'private' })
    )
    expect(order).toEqual(['client', 'event'])
    const body = eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>
    expect(body['clientId']).toBe('c2')
  })

  it('going back to the search does not save a client from the hidden fields', async () => {
    startNewClient()
    el.querySelector<HTMLButtonElement>('.inquiry-back')!.click()
    fixture.detectChanges()
    saveButton().click()
    await fixture.whenStable()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('staff get no add option and cannot save without a pick', async () => {
    isOwner_.set(false)
    fixture.detectChanges()
    expect(combobox().addLabelKey()).toBeNull()
    expect(combobox().emptyKey()).toBe('client_ask_owner')
    saveButton().click()
    fixture.detectChanges()
    await fixture.whenStable()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(el.textContent).toContain('client_required')
  })

  it('the body carries clientId, clientName and clientPhone', async () => {
    pickExisting()
    saveButton().click()
    await fixture.whenStable()
    const body = eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>
    expect(body['clientId']).toBe('c1')
    expect(body['clientName']).toBe('דנה כהן')
    expect(body['clientPhone']).toBe('052-1111111')
  })

  it('cancels on Escape', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancels).toBe(1)
  })
})
