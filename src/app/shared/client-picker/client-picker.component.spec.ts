import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { By } from '@angular/platform-browser'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ClientPickerComponent } from './client-picker.component'
import { SearchComboboxComponent } from 'src/app/shared/search-combobox/search-combobox.component'
import { ClientDataService } from '@services/client-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Client } from '@models/client.model'
import type { MenuEvent } from '@models/menu-event.model'

describe('ClientPickerComponent', () => {
  let fixture: ComponentFixture<ClientPickerComponent>
  let el: HTMLElement
  let clientData: jasmine.SpyObj<ClientDataService>
  let isOwner_: ReturnType<typeof signal<boolean>>
  let picks: Client[]
  let clears: number
  let adding: boolean[]
  const dana = { _id: 'c1', name: 'דנה כהן', phone: '052-1111111' } as Client
  const added = { _id: 'c2', name: 'לקוח חדש', phone: '050-1234567' } as Client

  const combobox = () =>
    fixture.debugElement.query(By.directive(SearchComboboxComponent))
      .componentInstance as SearchComboboxComponent<Client>
  const type = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  async function addChosen(typed: string): Promise<void> {
    combobox().addChosen.emit({ typed, source: 'pointer' })
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    clientData = jasmine.createSpyObj<ClientDataService>('ClientDataService', ['addClient'], {
      allClients_: signal<Client[]>([dana])
    })
    clientData.addClient.and.resolveTo(added)
    isOwner_ = signal(true)
    await TestBed.configureTestingModule({
      imports: [ClientPickerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ClientDataService, useValue: clientData },
        { provide: MenuEventDataService, useValue: { allMenuEvents_: signal<MenuEvent[]>([]) } },
        { provide: PermissionService, useValue: { isOwner_ } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: UserMsgService, useValue: jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg']) }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(ClientPickerComponent)
    picks = []
    clears = 0
    adding = []
    fixture.componentInstance.picked.subscribe((c) => picks.push(c))
    fixture.componentInstance.cleared.subscribe(() => clears++)
    fixture.componentInstance.addingChange.subscribe((v) => adding.push(v))
    fixture.detectChanges()
    el = fixture.nativeElement
  })

  it('offers matching clients after two letters and emits the pick', () => {
    combobox().query.set('דנ')
    fixture.detectChanges()
    el.querySelector<HTMLElement>('[role="option"]')!.click()
    expect(picks).toEqual([dana])
  })

  it('shows the selected client name only, inside the field, and the X clears it', () => {
    fixture.componentRef.setInput('selected', dana)
    fixture.detectChanges()
    const picked = el.querySelector('.client-picker-picked')!
    expect(picked.textContent).toContain('דנה כהן')
    expect(picked.textContent).not.toContain('052-1111111')
    expect(el.querySelector('app-search-combobox')).toBeNull()
    picked.querySelector<HTMLButtonElement>('button')!.click()
    expect(clears).toBe(1)
  })

  it('an owner gets the add row; staff get none and an ask-the-owner line', () => {
    expect(combobox().addLabelKey()).toBe('client_new')
    isOwner_.set(false)
    fixture.detectChanges()
    expect(combobox().addLabelKey()).toBeNull()
    expect(combobox().emptyKey()).toBe('client_ask_owner')
  })

  it('adding with a typed name pre-fills the name; a typed phone pre-fills the phone', async () => {
    await addChosen('dana')
    expect(adding).toEqual([true])
    expect(el.querySelector<HTMLInputElement>('#client-form-name')!.value).toBe('dana')
    expect(el.querySelector<HTMLInputElement>('#client-form-phone')!.value).toBe('')
    expect(fixture.componentInstance.back()).toBeTrue()
    fixture.detectChanges()
    await addChosen('+972 (52) 1234567')
    expect(el.querySelector<HTMLInputElement>('#client-form-phone')!.value).toBe('+972 (52) 1234567')
    expect(el.querySelector<HTMLInputElement>('#client-form-name')!.value).toBe('')
  })

  it('saving the add view picks the new client and leaves the add view', async () => {
    await addChosen('')
    type('#client-form-name', 'לקוח חדש')
    type('#client-form-phone', '050-1234567')
    el.querySelector<HTMLButtonElement>('.c-btn-primary')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(clientData.addClient).toHaveBeenCalledTimes(1)
    expect(picks).toEqual([added])
    expect(adding).toEqual([true, false])
    expect(el.querySelector('app-client-form')).toBeNull()
  })

  it('back() steps out of the add view and returns false when there is nothing to step back from', async () => {
    expect(fixture.componentInstance.back()).toBeFalse()
    await addChosen('')
    expect(fixture.componentInstance.back()).toBeTrue()
    fixture.detectChanges()
    expect(adding).toEqual([true, false])
    expect(el.querySelector('app-client-form')).toBeNull()
    expect(clientData.addClient).not.toHaveBeenCalled()
  })

  it('the form cancel button steps back too', async () => {
    await addChosen('')
    el.querySelector<HTMLButtonElement>('.c-btn-ghost')!.click()
    fixture.detectChanges()
    expect(el.querySelector('app-client-form')).toBeNull()
  })

  it('leaves the excluded client out of the list (plan 551)', () => {
    fixture.componentRef.setInput('exclude', ['c1'])
    fixture.detectChanges()
    combobox().query.set('דנ')
    fixture.detectChanges()
    expect(combobox().options()).toEqual([])
  })

  it('shows no add row and no owner hint when allowAdd is false (plan 551)', () => {
    fixture.componentRef.setInput('allowAdd', false)
    fixture.detectChanges()
    expect(combobox().addLabelKey()).toBeNull()
    expect(combobox().emptyKey()).toBeNull()
  })
})
