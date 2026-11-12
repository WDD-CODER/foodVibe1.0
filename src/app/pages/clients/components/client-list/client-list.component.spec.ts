import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, UserPlus } from 'lucide-angular'
import { ClientListComponent } from './client-list.component'
import { ClientDataService } from '@services/client-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Client } from '@models/client.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const DAY = 24 * 60 * 60 * 1000

const client = (_id: string, name: string, extra: Partial<Client> = {}): Client => ({
  _id,
  name,
  phone: '050-000-0000',
  ...extra
})

describe('ClientListComponent (plan 547)', () => {
  let fixture: ComponentFixture<ClientListComponent>
  let clients_: WritableSignal<Client[]>
  let owner_: WritableSignal<boolean>
  let userMsg: jasmine.SpyObj<UserMsgService>

  type Internals = {
    searchQuery_: WritableSignal<string>
    selectedKinds_: WritableSignal<Set<string>>
    selectedTags_: WritableSignal<Set<string>>
    selectedLifecycles_: WritableSignal<Set<string>>
    sortBy_: WritableSignal<string>
    filteredClients_: () => Client[]
    allTags_: () => string[]
    onSaved: () => void
    isAddOpen_: WritableSignal<boolean>
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const names = (): string[] =>
    cmp()
      .filteredClients_()
      .map((c) => c.name)
  const el = (): HTMLElement => fixture.nativeElement

  // useListState keeps the filters in sessionStorage; start each case clean.
  beforeEach(() => sessionStorage.clear())
  afterEach(() => sessionStorage.clear())

  function setup(list: Client[], owner = true): void {
    clients_ = signal(list)
    owner_ = signal(owner)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [ClientListComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, UserPlus })],
      providers: [
        provideRouter([]),
        { provide: ClientDataService, useValue: { allClients_: clients_ } },
        { provide: PermissionService, useValue: { isOwner_: owner_ } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(ClientListComponent)
    fixture.detectChanges()
  }

  it('shows every client when the search is empty, and hides merged ones', () => {
    setup([client('1', 'דנה'), client('2', 'יוסי'), client('3', 'רון', { mergedInto: '1' })])
    expect(names().sort()).toEqual(['דנה', 'יוסי'].sort())
  })

  it('searches by name and by phone digits', () => {
    setup([client('1', 'דנה', { phone: '050-111-2222' }), client('2', 'יוסי', { phone: '052-333-4444' })])
    cmp().searchQuery_.set('דנ')
    expect(names()).toEqual(['דנה'])
    cmp().searchQuery_.set('052333')
    expect(names()).toEqual(['יוסי'])
  })

  it('filters by kind, tag and lifecycle', () => {
    const now = Date.now()
    setup([
      client('1', 'א', { kinds: ['diner'], tags: ['vip'], firstSeenAt: now - 2 * DAY }),
      client('2', 'ב', { kinds: ['lead'], tags: ['allergy'], firstSeenAt: now - 400 * DAY }),
      client('3', 'ג', { kinds: ['diner', 'lead'], firstSeenAt: now - 400 * DAY, lastContactAt: now - 10 * DAY })
    ])
    cmp().selectedKinds_.set(new Set(['lead']))
    expect(names().sort()).toEqual(['ב', 'ג'])
    cmp().selectedKinds_.set(new Set())
    cmp().selectedTags_.set(new Set(['vip']))
    expect(names()).toEqual(['א'])
    cmp().selectedTags_.set(new Set())
    cmp().selectedLifecycles_.set(new Set(['new']))
    expect(names()).toEqual(['א'])
    cmp().selectedLifecycles_.set(new Set(['dormant']))
    expect(names()).toEqual(['ב'])
    cmp().selectedLifecycles_.set(new Set(['active']))
    expect(names()).toEqual(['ג'])
  })

  it('lists reserved tags first, then the others', () => {
    setup([client('1', 'א', { tags: ['zeta', 'allergy'] }), client('2', 'ב', { tags: ['vip', 'alpha'] })])
    expect(cmp().allTags_()).toEqual(['vip', 'allergy', 'alpha', 'zeta'])
  })

  it('sorts by last contact (newest first, missing last, then name) and by name', () => {
    const now = Date.now()
    setup([
      client('1', 'ת', { lastContactAt: now - 5 * DAY }),
      client('2', 'ב'),
      client('3', 'ד', { lastContactAt: now - DAY }),
      client('4', 'א')
    ])
    expect(names()).toEqual(['ד', 'ת', 'א', 'ב'])
    cmp().sortBy_.set('name')
    expect(names()).toEqual(['א', 'ב', 'ד', 'ת'])
  })

  it('shows the add button to the owner and not to staff', () => {
    setup([client('1', 'א')], true)
    expect(el().querySelector('[data-testid="add-client"]')).not.toBeNull()
    TestBed.resetTestingModule()
    setup([client('1', 'א')], false)
    expect(el().querySelector('[data-testid="add-client"]')).toBeNull()
  })

  it('opens the add window from the button and closes it with a toast on save', () => {
    setup([client('1', 'א')])
    ;(el().querySelector('[data-testid="add-client"]') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(cmp().isAddOpen_()).toBeTrue()
    expect(el().querySelector('app-client-form')).not.toBeNull()
    cmp().onSaved()
    fixture.detectChanges()
    expect(cmp().isAddOpen_()).toBeFalse()
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('client_saved')
  })

  it('shows lifecycle-free staff rows: no last-contact, events or requests columns', () => {
    setup([client('1', 'א', { counters: { events: 3 }, lastContactAt: Date.now() })], false)
    expect(el().querySelector('.col-last')).toBeNull()
    expect(el().querySelector('.col-events')).toBeNull()
    expect(el().querySelector('.col-requests')).toBeNull()
    expect(el().textContent).not.toContain('client_lifecycle')
  })

  it('shows owner rows with last contact, events and requests counts (0 when missing)', () => {
    setup([client('1', 'א', { counters: { events: 3 }, lastContactAt: Date.UTC(2026, 0, 5, 12) })])
    expect(el().querySelector('.client-grid-row .col-last')?.textContent).toContain('5.1.26')
    expect(el().querySelector('.client-grid-row .col-events')?.textContent?.trim()).toBe('3')
    expect(el().querySelector('.client-grid-row .col-requests')?.textContent?.trim()).toBe('0')
  })

  it('shows the empty state with no clients, and the no-results text when a search matches none', () => {
    setup([])
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    TestBed.resetTestingModule()
    setup([client('1', 'א')])
    cmp().searchQuery_.set('zzz')
    fixture.detectChanges()
    expect(el().querySelector('app-empty-state')).toBeNull()
    expect(el().textContent).toContain('clients_no_results')
  })

  it('a client name links to the profile (plan 551)', () => {
    setup([client('1', 'דנה')])
    expect(el().querySelector('a.client-name')?.getAttribute('href')).toBe('/clients/1')
  it('puts the non-name columns in the column carousel header (owner: six slides)', () => {
    setup([client('1', 'א')])
    const header = el().querySelector('app-column-carousel-header')
    expect(header).not.toBeNull()
    const labels = Array.from(header!.querySelectorAll('[appColumnSlide]')).map((d) => d.textContent?.trim())
    expect(labels).toEqual([
      'client_phone',
      'client_kinds',
      'client_tags',
      'client_last_contact',
      'client_events_count',
      'client_requests_count'
    ])
    expect(el().querySelectorAll('app-column-carousel-cell').length).toBe(1)
  })
  it('offers staff only phone, kinds and tags in the carousel', () => {
    setup([client('1', 'א')], false)
    const header = el().querySelector('app-column-carousel-header')!
    expect(header.querySelectorAll('[appColumnSlide]').length).toBe(3)
  })
})
