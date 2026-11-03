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
  const enter = (selector: string) =>
    el.querySelector<HTMLInputElement>(selector)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  const escape = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
  }
  /** Saves the client in the add-client view and returns to the inquiry. */
  async function saveClientView(): Promise<void> {
    saveButton().click()
    await fixture.whenStable()
    fixture.detectChanges()
  }

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

  it('blocks an invalid phone number in the add-client view', async () => {
    startNewClient('דנה', 'abc')
    expect(el.querySelector('.c-field-error')).toBeTruthy()
    await saveClientView()
    expect(clientData.addClient).not.toHaveBeenCalled()
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
    expect(el.querySelector('.inquiry-client-picked')?.textContent).toContain('דנה כהן')
    saveButton().click()
    await fixture.whenStable()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(eventData.addMenuEvent).toHaveBeenCalledTimes(1)
  })

  it('an owner who adds a new client saves the client first, returns to the inquiry with it selected, then saves the event', async () => {
    const order: string[] = []
    clientData.addClient.and.callFake(async () => (order.push('client'), addedClient))
    eventData.addMenuEvent.and.callFake(async () => (order.push('event'), created))
    startNewClient()
    await saveClientView()
    expect(clientData.addClient).toHaveBeenCalledTimes(1)
    expect(clientData.addClient.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ name: 'לקוח חדש', phone: '050-1234567', clientType: 'private' })
    )
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
    expect(el.querySelector('.inquiry-client-picked')?.textContent).toContain('לקוח חדש')
    saveButton().click()
    await fixture.whenStable()
    expect(order).toEqual(['client', 'event'])
    const body = eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>
    expect(body['clientId']).toBe('c2')
  })

  it('Enter in the new client name moves to the phone field and saves nothing', () => {
    startNewClient('', '')
    const phone = el.querySelector<HTMLInputElement>('#inquiry-phone')!
    enter('#inquiry-name')
    expect(document.activeElement).toBe(phone)
    expect(clientData.addClient).not.toHaveBeenCalled()
  })

  it('Enter in the phone field saves the client when the name is filled and the phone is valid', async () => {
    startNewClient()
    enter('#inquiry-phone')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(clientData.addClient).toHaveBeenCalledTimes(1)
    expect(el.querySelector('.inquiry-client-picked')).toBeTruthy()
  })

  it('Enter in the phone field with an empty name shows the required error and saves nothing', async () => {
    startNewClient('', '050-1234567')
    enter('#inquiry-phone')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(el.querySelector('.c-field-error')?.textContent).toContain('field_required')
  })

  it('cancelling the add-client view discards the client and returns to the inquiry', async () => {
    startNewClient()
    el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-ghost')!.click()
    fixture.detectChanges()
    expect(el.querySelector('#inquiry-client')).toBeTruthy()
    expect(el.querySelector('#inquiry-name')).toBeNull()
    saveButton().click()
    await fixture.whenStable()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(eventData.addMenuEvent).not.toHaveBeenCalled()
  })

  it('Escape goes one step back: add-client view, then the dialog', () => {
    startNewClient()
    escape()
    expect(el.querySelector('#inquiry-name')).toBeNull()
    expect(cancels).toBe(0)
    escape()
    expect(cancels).toBe(1)
  })

  it('Latin text typed in the search goes to the name field, not the phone field', async () => {
    for (const typed of ['dana', 'Sarah', 'tzvi', 'zoe', 'dana0521']) {
      combobox().addChosen.emit({ typed, source: 'pointer' })
      fixture.detectChanges()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(el.querySelector<HTMLInputElement>('#inquiry-name')!.value).toBe(typed)
      expect(el.querySelector<HTMLInputElement>('#inquiry-phone')!.value).toBe('')
      el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-ghost')!.click()
      fixture.detectChanges()
    }
  })

  it('a phone typed in the search, with spaces, dashes, plus and brackets, goes to the phone field', async () => {
    for (const typed of ['052-123 4567', '+972 (52) 1234567', '0521234567']) {
      combobox().addChosen.emit({ typed, source: 'pointer' })
      fixture.detectChanges()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(el.querySelector<HTMLInputElement>('#inquiry-phone')!.value).toBe(typed)
      expect(el.querySelector<HTMLInputElement>('#inquiry-name')!.value).toBe('')
      el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-ghost')!.click()
      fixture.detectChanges()
    }
  })

  it('the event-name field has space above it', () => {
    const stack = el.querySelector<HTMLElement>('.inquiry-event-name')!
    expect(parseFloat(getComputedStyle(stack).marginBlockStart)).toBeGreaterThan(0)
  })

  it('a picked client shows only its name, no phone', () => {
    pickExisting()
    const picked = el.querySelector('.inquiry-client-picked')!
    expect(picked.textContent).toContain('דנה כהן')
    expect(picked.textContent).not.toContain('052-1111111')
  })

  it('the more-details control is a chip button that opens and closes the extra fields', () => {
    startNewClient()
    expect(el.querySelector('details')).toBeNull()
    const toggle = el.querySelector<HTMLButtonElement>('.inquiry-more-toggle')!
    expect(toggle.classList).toContain('c-chip--tap')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(el.querySelector('.inquiry-more')).toBeNull()
    toggle.click()
    fixture.detectChanges()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(el.querySelector('.inquiry-more')).toBeTruthy()
    toggle.click()
    fixture.detectChanges()
    expect(el.querySelector('.inquiry-more')).toBeNull()
  })

  it('the extra fields stay inside the container when opened', () => {
    startNewClient()
    el.querySelector<HTMLButtonElement>('.inquiry-more-toggle')!.click()
    fixture.detectChanges()
    const bodyRect = el.querySelector<HTMLElement>('.c-modal-body')!.getBoundingClientRect()
    const fields = Array.from(el.querySelectorAll<HTMLElement>('.inquiry-more input, .inquiry-more textarea'))
    expect(fields.length).toBeGreaterThan(0)
    for (const f of fields) {
      const r = f.getBoundingClientRect()
      expect(r.left).toBeGreaterThanOrEqual(bodyRect.left - 1)
      expect(r.right).toBeLessThanOrEqual(bodyRect.right + 1)
    }
  })

  it('text typed in the search goes to the name, digits to the phone, after an earlier client was saved', async () => {
    startNewClient()
    await saveClientView()
    el.querySelector<HTMLButtonElement>('.inquiry-client-picked button')!.click()
    fixture.detectChanges()
    combobox().addChosen.emit({ typed: 'אאאא', source: 'pointer' })
    fixture.detectChanges()
    await fixture.whenStable()
    expect(el.querySelector<HTMLInputElement>('#inquiry-name')!.value).toBe('אאאא')
    expect(el.querySelector<HTMLInputElement>('#inquiry-phone')!.value).toBe('')
    el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-ghost')!.click()
    fixture.detectChanges()
    combobox().addChosen.emit({ typed: '0521234567', source: 'pointer' })
    fixture.detectChanges()
    await fixture.whenStable()
    expect(el.querySelector<HTMLInputElement>('#inquiry-phone')!.value).toBe('0521234567')
    expect(el.querySelector<HTMLInputElement>('#inquiry-name')!.value).toBe('')
  })

  it('the X removes the picked client so another can be chosen', () => {
    pickExisting()
    el.querySelector<HTMLButtonElement>('.inquiry-client-picked button')!.click()
    fixture.detectChanges()
    expect(el.querySelector('.inquiry-client-picked')).toBeNull()
    expect(el.querySelector('#inquiry-client')).toBeTruthy()
  })

  it('a typed event name is used; empty falls back to the client name', async () => {
    pickExisting()
    type('#inquiry-event-name', 'חתונת הקיץ')
    saveButton().click()
    await fixture.whenStable()
    expect((eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>)['name']).toBe('חתונת הקיץ')
    expect((eventData.addMenuEvent.calls.mostRecent().args[0] as Record<string, unknown>)['clientName']).toBe('דנה כהן')
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
