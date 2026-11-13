import { TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { By } from '@angular/platform-browser'
import { provideRouter, Router } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { LucideAngularModule } from 'lucide-angular'
import { ClientProfileComponent } from './client-profile.component'
import { clientDialDigits } from './client-profile.util'
import { ClientDataService } from '@services/client-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { RequestDataService } from '@services/request-data.service'
import { BookingDataService } from '@services/booking-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { ClientPickerComponent } from 'src/app/shared/client-picker/client-picker.component'
import type { Client } from '@models/client.model'
import type { MenuEvent } from '@models/menu-event.model'
import type { FrontDeskRequest } from '@models/request.model'
import type { Booking } from '@models/booking.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { GitMerge, Ban, Phone, MessageCircle } from 'lucide-angular'

const me = (_id: string, name: string, createdAt: number, extra: Partial<MenuEvent> = {}): MenuEvent =>
  ({ _id, name, clientId: 'c1', createdAt, ...extra }) as MenuEvent
const req = (_id: string, createdAt: number): FrontDeskRequest =>
  ({ _id, clientId: 'c1', kind: 'table', status: 'new', createdAt, wanted: { date: '2026-12-01' } }) as FrontDeskRequest
const booking = (_id: string, createdAt: number): Booking =>
  ({
    _id,
    clientId: 'c1',
    kind: 'table',
    status: 'confirmed',
    createdAt,
    date: '2026-12-02',
    time: '19:00',
    partySize: 4
  }) as Booking

describe('ClientProfileComponent (plan 551)', () => {
  let harness: RouterTestingHarness
  let clients_: WritableSignal<Client[]>
  let owner_: WritableSignal<boolean>
  let clientData: jasmine.SpyObj<ClientDataService> & { allClients_: WritableSignal<Client[]> }
  let confirm: jasmine.SpyObj<ConfirmModalService>

  const dana: Client = {
    _id: 'c1',
    name: 'דנה',
    phone: '050-123-4567',
    phoneNormalized: '0501234567',
    email: 'd@x.co',
    notes: 'private note',
    kinds: ['diner'],
    tags: ['vip']
  }

  async function setup(opts: { owner?: boolean; client?: Client; id?: string } = {}): Promise<ClientProfileComponent> {
    const { owner = true, client = dana, id = 'c1' } = opts
    clients_ = signal<Client[]>([client, { _id: 'c2', name: 'יוסי', phone: '052-000-0000' }])
    owner_ = signal(owner)
    clientData = Object.assign(
      jasmine.createSpyObj('ClientDataService', ['updateClient', 'mergeClient', 'setDoNotContact']),
      {
        allClients_: clients_
      }
    )
    clientData.mergeClient.and.resolveTo({ _id: 'c2', name: 'יוסי', phone: '052-000-0000' })
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(true)
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    const events_ = signal<MenuEvent[]>([
      me('e1', 'old event', 100, {
        notes: [{ _id: 'n1', text: 'call back', at: 900, by: 'u', byName: 'Avi' }]
      } as Partial<MenuEvent>),
      me('e2', 'new event', 500, { stage: 'inquiry' } as Partial<MenuEvent>),
      me('e3', 'other client', 600, { clientId: 'c2' })
    ])
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, GitMerge, Ban, Phone, MessageCircle })],
      providers: [
        provideRouter([
          { path: 'clients/:id', component: ClientProfileComponent },
          { path: 'clients', component: ClientProfileComponent }
        ]),
        { provide: ClientDataService, useValue: clientData },
        { provide: MenuEventDataService, useValue: { allMenuEvents_: events_ } },
        {
          provide: RequestDataService,
          useValue: { all_: signal([req('r1', 300)]), ensureLoaded: () => Promise.resolve() }
        },
        {
          provide: BookingDataService,
          useValue: { all_: signal([booking('b1', 700)]), ensureLoaded: () => Promise.resolve() }
        },
        {
          provide: PermissionService,
          useValue: { isOwner_: owner_, can: (a: string) => owner_() || a === 'create' }
        },
        { provide: TranslationService, useValue: translation },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        },
        { provide: ConfirmModalService, useValue: confirm }
      ]
    })
    harness = await RouterTestingHarness.create()
    return harness.navigateByUrl(`/clients/${id}`, ClientProfileComponent)
  }
  const el = (): HTMLElement => harness.routeNativeElement as HTMLElement
  const byTestId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)

  it('lists requests, bookings, events and event notes of this client only, newest first', async () => {
    await setup()
    const rows = Array.from(el().querySelectorAll('.timeline-row'))
    expect(rows.map((r) => r.getAttribute('data-kind'))).toEqual(['note', 'booking', 'event', 'request', 'event'])
    expect(rows[2].textContent).toContain('new event')
    expect(rows[4].textContent).toContain('old event')
    expect(el().textContent).not.toContain('other client')
    expect(rows[2].querySelector('a')?.getAttribute('href')).toBe('/menu-intelligence/e2')
  })

  it('shows the empty state when the client has no activity', async () => {
    await setup({ client: { ...dana, _id: 'c9' }, id: 'c9' })
    expect(el().querySelector('app-empty-state')).not.toBeNull()
  })

  it('builds tel: and wa.me links from the normalized phone, 0 turned into 972', async () => {
    await setup()
    expect(byTestId('client-call')?.getAttribute('href')).toBe('tel:+972501234567')
    expect(byTestId('client-whatsapp')?.getAttribute('href')).toBe('https://wa.me/972501234567')
    expect(byTestId('client-whatsapp')?.getAttribute('target')).toBe('_blank')
  })

  it('falls back to the phone digits when the normalized phone is missing (staff)', () => {
    expect(clientDialDigits(undefined, '052-111 2222')).toBe('972521112222')
    expect(clientDialDigits('972501234567', 'x')).toBe('972501234567')
  })

  it('owner sees details, edit, merge and do-not-contact controls', async () => {
    await setup()
    expect(byTestId('client-details')?.textContent).toContain('private note')
    expect(byTestId('client-details')?.textContent).toContain('d@x.co')
    expect(byTestId('client-edit')).not.toBeNull()
    expect(byTestId('client-merge')).not.toBeNull()
    expect(byTestId('client-dnc-set')).not.toBeNull()
  })

  it('staff see no notes, e-mail, edit, merge or do-not-contact-clear controls', async () => {
    await setup({ owner: false, client: { ...dana, doNotContact: { at: 1, reason: 'secret', via: 'member' } } })
    expect(byTestId('client-details')).toBeNull()
    expect(el().textContent).not.toContain('private note')
    expect(el().textContent).not.toContain('d@x.co')
    expect(el().textContent).not.toContain('secret')
    expect(byTestId('client-edit')).toBeNull()
    expect(byTestId('client-merge')).toBeNull()
    expect(byTestId('client-dnc-clear')).toBeNull()
    expect(byTestId('client-dnc')).not.toBeNull()
  })

  it('staff may still set do-not-contact', async () => {
    await setup({ owner: false })
    expect(byTestId('client-dnc-set')).not.toBeNull()
  })

  it('the merge picker leaves this client out and offers no add row', async () => {
    await setup()
    byTestId('client-merge')?.click()
    harness.detectChanges()
    const picker = harness.fixture.debugElement.query(By.directive(ClientPickerComponent))
      .componentInstance as ClientPickerComponent
    expect(picker.exclude()).toEqual(['c1'])
    expect(picker.allowAdd()).toBeFalse()
  })

  it('a picked merge target asks first, then merges once and opens the target', async () => {
    const cmp = await setup()
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    await (cmp as unknown as { onMergePicked: (c: Client) => Promise<void> }).onMergePicked(clients_()[1])
    expect(confirm.open).toHaveBeenCalledWith('client_merge_confirm', { saveLabel: 'client_merge' })
    expect(clientData.mergeClient).toHaveBeenCalledOnceWith('c1', 'c2')
    expect(navigate).toHaveBeenCalledWith(['/clients', 'c2'])
  })

  it('a declined confirm merges nothing', async () => {
    const cmp = await setup()
    confirm.open.and.resolveTo(false)
    await (cmp as unknown as { onMergePicked: (c: Client) => Promise<void> }).onMergePicked(clients_()[1])
    expect(clientData.mergeClient).not.toHaveBeenCalled()
  })

  it('an unknown client shows client_not_found with a way back', async () => {
    await setup({ id: 'nope' })
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().querySelector('a[href="/clients"]')).not.toBeNull()
  })

  it('a merged client offers the client it went into', async () => {
    await setup({ client: { ...dana, mergedInto: 'c2' } })
    expect(el().querySelector('a[href="/clients/c2"]')).not.toBeNull()
    expect(byTestId('client-name')).toBeNull()
  })
})
