import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ClientFormComponent } from './client-form.component'
import { ClientDataService } from '@services/client-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Client } from '@models/client.model'

describe('ClientFormComponent', () => {
  let fixture: ComponentFixture<ClientFormComponent>
  let el: HTMLElement
  let clientData: jasmine.SpyObj<ClientDataService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let savedClients: Client[]
  let cancels: number
  const added = { _id: 'c9', name: 'לקוח חדש', phone: '050-1234567' } as Client

  function type(selector: string, value: string): void {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const enter = (selector: string) =>
    el.querySelector<HTMLInputElement>(selector)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  const save = async () => {
    el.querySelector<HTMLButtonElement>('.c-btn-primary')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    clientData = jasmine.createSpyObj<ClientDataService>('ClientDataService', ['addClient'])
    clientData.addClient.and.resolveTo(added)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
    await TestBed.configureTestingModule({
      imports: [ClientFormComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ClientDataService, useValue: clientData },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: UserMsgService, useValue: userMsg }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(ClientFormComponent)
    savedClients = []
    cancels = 0
    fixture.componentInstance.saved.subscribe((c) => savedClients.push(c))
    fixture.componentInstance.cancelled.subscribe(() => cancels++)
    el = fixture.nativeElement
  })

  it('pre-fills the name and phone from the initial inputs', async () => {
    fixture.componentRef.setInput('initialName', 'דנה')
    fixture.componentRef.setInput('initialPhone', '0521234567')
    fixture.detectChanges()
    await fixture.whenStable()
    expect(el.querySelector<HTMLInputElement>('#client-form-name')!.value).toBe('דנה')
    expect(el.querySelector<HTMLInputElement>('#client-form-phone')!.value).toBe('0521234567')
  })

  it('saves through addClient and emits the new client', async () => {
    fixture.detectChanges()
    type('#client-form-name', 'לקוח חדש')
    type('#client-form-phone', '050-1234567')
    await save()
    expect(clientData.addClient).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'לקוח חדש', phone: '050-1234567', clientType: 'private' })
    )
    expect(savedClients).toEqual([added])
  })

  it('blocks an invalid phone and an empty name', async () => {
    fixture.detectChanges()
    type('#client-form-name', '')
    type('#client-form-phone', 'abc')
    await save()
    expect(clientData.addClient).not.toHaveBeenCalled()
    expect(el.querySelectorAll('.c-field-error').length).toBe(2)
  })

  it('needs a phone', async () => {
    fixture.detectChanges()
    type('#client-form-name', 'דנה')
    await save()
    expect(clientData.addClient).not.toHaveBeenCalled()
  })

  it('Enter in the name moves to the phone; Enter in the phone saves', async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    type('#client-form-name', 'דנה')
    type('#client-form-phone', '0521234567')
    enter('#client-form-name')
    expect(document.activeElement).toBe(el.querySelector('#client-form-phone'))
    expect(clientData.addClient).not.toHaveBeenCalled()
    enter('#client-form-phone')
    await fixture.whenStable()
    expect(clientData.addClient).toHaveBeenCalledTimes(1)
  })

  it('the more-details chip opens the extra fields and they are sent', async () => {
    fixture.detectChanges()
    const toggle = el.querySelector<HTMLButtonElement>('.client-form-more-toggle')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    toggle.click()
    fixture.detectChanges()
    expect(el.querySelector('.client-form-more')).toBeTruthy()
    type('#client-form-name', 'דנה')
    type('#client-form-phone', '0521234567')
    type('#client-form-company', 'חברה')
    await save()
    expect(clientData.addClient.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ companyName: 'חברה' }))
  })

  it('a server error shows server_error; a 403 shows nothing extra', async () => {
    fixture.detectChanges()
    type('#client-form-name', 'דנה')
    type('#client-form-phone', '0521234567')
    clientData.addClient.and.rejectWith({ status: 403 })
    await save()
    expect(userMsg.onSetErrorMsg).not.toHaveBeenCalled()
    clientData.addClient.and.rejectWith({ status: 500 })
    await save()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('server_error')
    expect(savedClients).toEqual([])
  })

  it('cancel emits cancelled', () => {
    fixture.detectChanges()
    el.querySelector<HTMLButtonElement>('.c-btn-ghost')!.click()
    expect(cancels).toBe(1)
  })
})
