import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { WaitlistDrawerComponent } from './waitlist-drawer.component'
import { WaitlistDataService } from '@services/waitlist-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const NOW = 1_800_000_000_000
const MIN = 60000
const entry = (id: string, over: object = {}) => ({
  _id: id,
  status: 'waiting',
  guestName: 'שם ' + id,
  guestPhone: '',
  partySize: 2,
  joinedAt: NOW - 5 * MIN,
  date: '2026-11-23',
  ...over
})

describe('WaitlistDrawerComponent (plan 673)', () => {
  let fixture: ComponentFixture<WaitlistDrawerComponent>
  let list: jasmine.Spy
  let add: jasmine.Spy
  let notify: jasmine.Spy
  let left: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)
  const all = (id: string): HTMLElement[] => Array.from(el().querySelectorAll(`[data-testid="${id}"]`))
  const flushView = (): void => {
    tick()
    fixture.detectChanges()
  }
  const type = (id: string, value: string): void => {
    const input = byId(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  function setup(entries: object[], listResult?: unknown): { closed: jasmine.Spy; seatRequested: jasmine.Spy } {
    list = jasmine.createSpy('list').and.resolveTo(listResult ?? { ok: true, entries, now: NOW })
    add = jasmine
      .createSpy('add')
      .and.callFake(() => Promise.resolve({ ok: true, entry: entry('new', { joinedAt: NOW }) }))
    notify = jasmine
      .createSpy('notify')
      .and.callFake((id: string) => Promise.resolve({ ok: true, entry: entry(id, { status: 'notified' }) }))
    left = jasmine
      .createSpy('left')
      .and.callFake((id: string) => Promise.resolve({ ok: true, entry: entry(id, { status: 'left' }) }))
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [WaitlistDrawerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: WaitlistDataService, useValue: { list, add, notify, left, seat: jasmine.createSpy('seat') } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(WaitlistDrawerComponent)
    fixture.componentRef.setInput('date', '2026-11-23')
    fixture.componentRef.setInput('plan', { areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }] })
    const closed = jasmine.createSpy('closed')
    const seatRequested = jasmine.createSpy('seatRequested')
    fixture.componentInstance.closed.subscribe(closed)
    fixture.componentInstance.seatRequested.subscribe(seatRequested)
    fixture.detectChanges()
    flushView()
    flushView() // the form's ngModel writes its first value one microtask after it is rendered
    return { closed, seatRequested }
  }

  it('shows the rows in joinedAt order with their position and the minutes waited from the server now', fakeAsync(() => {
    setup([entry('late', { joinedAt: NOW - 2 * MIN }), entry('early', { joinedAt: NOW - 12 * MIN })])
    const rows = all('wl-row')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('שם early')
    expect(rows[1].textContent).toContain('שם late')
    expect(all('wl-pos').map((p) => p.textContent?.trim())).toEqual(['1', '2'])
    expect(rows[0].getAttribute('data-minutes')).toBe('12')
    expect(rows[1].getAttribute('data-minutes')).toBe('2')
    fixture.destroy()
    flush()
  }))

  it('flags a wait that passed the quoted minutes', fakeAsync(() => {
    setup([entry('a', { joinedAt: NOW - 20 * MIN, quotedMinutes: 15 }), entry('b', { quotedMinutes: 15 })])
    expect(all('wl-over').length).toBe(1)
    fixture.destroy()
    flush()
  }))

  it('Add is disabled without a name and enabled with one; a successful add appends the row and empties the form', fakeAsync(() => {
    setup([])
    const addButton = byId('wl-add') as HTMLButtonElement
    expect(addButton.disabled).toBeTrue()
    type('wl-name', 'לוי')
    expect(addButton.disabled).toBeFalse()
    addButton.click()
    flushView()
    flushView() // ngModel writes the emptied value one microtask after the render
    expect(add).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ date: '2026-11-23', guestName: 'לוי', partySize: 2 })
    )
    expect(all('wl-row').length).toBe(1)
    expect((byId('wl-name') as HTMLInputElement).value).toBe('')
    fixture.destroy()
    flush()
  }))

  it('a failed add shows wl_add_failed and keeps the typed values', fakeAsync(() => {
    setup([])
    add.and.resolveTo({ ok: false, code: null })
    type('wl-name', 'לוי')
    ;(byId('wl-add') as HTMLButtonElement).click()
    flushView()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('wl_add_failed')
    expect((byId('wl-name') as HTMLInputElement).value).toBe('לוי')
    fixture.destroy()
    flush()
  }))

  it('a phone with letters keeps Add disabled', fakeAsync(() => {
    setup([])
    type('wl-name', 'לוי')
    type('wl-phone', 'abcdefgh')
    expect((byId('wl-add') as HTMLButtonElement).disabled).toBeTrue()
    fixture.destroy()
    flush()
  }))

  it('shows the empty message with no entry', fakeAsync(() => {
    setup([])
    expect(el().querySelector('app-empty-state')?.textContent).toContain('wl_empty')
    expect(byId('wl-list')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('a failed first read shows the load error with a retry that reloads', fakeAsync(() => {
    setup([], { ok: false, code: null })
    expect(el().querySelector('app-empty-state')?.textContent).toContain('wl_load_failed')
    list.and.resolveTo({ ok: true, entries: [entry('a')], now: NOW })
    ;(el().querySelector('app-empty-state button') as HTMLButtonElement).click()
    flushView()
    expect(all('wl-row').length).toBe(1)
    fixture.destroy()
    flush()
  }))

  it('"table is ready" turns the row tag to told and hides the button', fakeAsync(() => {
    setup([entry('a')])
    expect(byId('wl-told')).toBeNull()
    ;(byId('wl-notify') as HTMLButtonElement).click()
    flushView()
    expect(notify).toHaveBeenCalledOnceWith('a')
    expect(byId('wl-told')?.textContent).toContain('wl_notified')
    expect(byId('wl-notify')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('"left" removes the row', fakeAsync(() => {
    setup([entry('a'), entry('b', { joinedAt: NOW - MIN })])
    ;(all('wl-left')[0] as HTMLButtonElement).click()
    flushView()
    expect(left).toHaveBeenCalledOnceWith('a')
    expect(all('wl-row').length).toBe(1)
    expect(all('wl-row')[0].textContent).toContain('שם b')
    fixture.destroy()
    flush()
  }))

  it('a 409 on notify shows bk_bad_status and reloads the list', fakeAsync(() => {
    setup([entry('a')])
    notify.and.resolveTo({ ok: false, code: 'BAD_STATUS' })
    ;(byId('wl-notify') as HTMLButtonElement).click()
    flushView()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('bk_bad_status')
    expect(list).toHaveBeenCalledTimes(2)
    fixture.destroy()
    flush()
  }))

  it('"seated" asks for the pick-a-table mode with the entry and closes the drawer', fakeAsync(() => {
    const out = setup([entry('a')])
    ;(byId('wl-seat') as HTMLButtonElement).click()
    expect(out.seatRequested).toHaveBeenCalledOnceWith(jasmine.objectContaining({ _id: 'a' }))
    expect(out.closed).toHaveBeenCalledTimes(1)
    fixture.destroy()
    flush()
  }))

  it('the close button closes at once, even with a half-typed form', fakeAsync(() => {
    const out = setup([])
    type('wl-name', 'חצי')
    ;(byId('wl-close') as HTMLButtonElement).click()
    expect(out.closed).toHaveBeenCalledTimes(1)
    fixture.destroy()
    flush()
  }))

  it('ended entries sit in a closed "today" section opened by a chip with aria-expanded', fakeAsync(() => {
    setup([entry('a', { status: 'seated' }), entry('b', { status: 'left' }), entry('c')])
    const chip = byId('wl-today') as HTMLButtonElement
    expect(chip.getAttribute('aria-expanded')).toBe('false')
    expect(byId('wl-ended')).toBeNull()
    chip.click()
    fixture.detectChanges()
    expect(chip.getAttribute('aria-expanded')).toBe('true')
    expect(byId('wl-ended')?.querySelectorAll('li').length).toBe(2)
    fixture.destroy()
    flush()
  }))
})
