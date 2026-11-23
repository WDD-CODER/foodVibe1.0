import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { WalkInDialogComponent } from './walk-in-dialog.component'
import { BookingDataService } from '@services/booking-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const table = (key: string, number: string, x: number, min = 2, max = 4) => ({
  key,
  number,
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: min,
  maxSeats: max,
  x,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
})
const PLAN = {
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [table('tab001', '11', 0), table('tab002', '12', 5), table('tab003', '13', 10, 6, 8)]
}
const STATES = { tab001: { state: 'free' }, tab002: { state: 'seated' }, tab003: { state: 'free' } }

describe('WalkInDialogComponent (plan 672)', () => {
  let fixture: ComponentFixture<WalkInDialogComponent>
  let walkIn: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)
  const saveButton = (): HTMLButtonElement => byId('wlk-seat') as HTMLButtonElement

  function setup(tableKey: string | null): { seated: jasmine.Spy; closed: jasmine.Spy } {
    walkIn = jasmine.createSpy('walkIn').and.resolveTo({ ok: true, booking: {} })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [WalkInDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BookingDataService, useValue: { walkIn } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(WalkInDialogComponent)
    fixture.componentRef.setInput('tableKey', tableKey)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.componentRef.setInput('states', STATES)
    const seated = jasmine.createSpy('seated')
    const closed = jasmine.createSpy('closed')
    fixture.componentInstance.seated.subscribe(seated)
    fixture.componentInstance.closed.subscribe(closed)
    fixture.detectChanges()
    return { seated, closed }
  }

  const type = (id: string, value: string): void => {
    const input = el().querySelector('#' + id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  it('opened from a free table it has that table and sends no guest when no name is typed', fakeAsync(() => {
    const { seated, closed } = setup('tab001')
    expect(byId('wlk-table')?.textContent).toContain('tsh_title')
    expect(saveButton().disabled).toBeFalse()
    saveButton().click()
    tick()
    fixture.detectChanges()
    expect(walkIn).toHaveBeenCalledOnceWith({ partySize: 2, tableKeys: ['tab001'] })
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('wlk_seated')
    expect(seated).toHaveBeenCalled()
    expect(closed).toHaveBeenCalled()
    flush()
  }))

  it('with a name and a phone it sends the guest', fakeAsync(() => {
    setup('tab001')
    ;(byId('wlk-details') as HTMLElement).click()
    fixture.detectChanges()
    expect(byId('wlk-details')?.getAttribute('aria-expanded')).toBe('true')
    tick()
    type('wlk-name', 'דנה')
    type('wlk-phone', '052-1234567')
    saveButton().click()
    tick()
    expect(walkIn).toHaveBeenCalledOnceWith({
      partySize: 2,
      tableKeys: ['tab001'],
      guest: { name: 'דנה', phone: '052-1234567' }
    })
    flush()
  }))

  it('a name without a phone keeps Save disabled', fakeAsync(() => {
    setup('tab001')
    ;(byId('wlk-details') as HTMLElement).click()
    fixture.detectChanges()
    tick()
    type('wlk-name', 'דנה')
    expect(saveButton().disabled).toBeTrue()
    flush()
  }))

  it('opened from the button it has no table: Save is disabled until one free table is tapped', fakeAsync(() => {
    setup(null)
    expect(saveButton().disabled).toBeTrue()
    // The seated table 12 does not fit and a tap on it changes nothing.
    ;(byId('floor-table-12') as HTMLElement).click()
    fixture.detectChanges()
    expect(saveButton().disabled).toBeTrue()
    ;(byId('floor-table-11') as HTMLElement).click()
    fixture.detectChanges()
    expect(saveButton().disabled).toBeFalse()
    saveButton().click()
    tick()
    expect(walkIn).toHaveBeenCalledOnceWith({ partySize: 2, tableKeys: ['tab001'] })
    flush()
  }))

  it('a 409 shows wlk_table_taken and keeps the dialog open', fakeAsync(() => {
    const { closed } = setup('tab001')
    walkIn.and.resolveTo({ ok: false, code: 'NO_TABLE' })
    saveButton().click()
    tick()
    fixture.detectChanges()
    expect(byId('wlk-taken')?.textContent).toContain('wlk_table_taken')
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('wlk_table_taken')
    expect(closed).not.toHaveBeenCalled()
    flush()
  }))

  it('any other failure shows nb_save_failed and keeps the dialog open', fakeAsync(() => {
    const { closed } = setup('tab001')
    walkIn.and.resolveTo({ ok: false, code: null })
    saveButton().click()
    tick()
    fixture.detectChanges()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('nb_save_failed')
    expect(closed).not.toHaveBeenCalled()
    flush()
  }))

  it('with no free table that fits, the map area says so and Save is disabled', fakeAsync(() => {
    setup(null)
    fixture.componentInstance['setParty'](12)
    fixture.detectChanges()
    expect(byId('wlk-no-free')?.textContent).toContain('wlk_no_free_table')
    expect(saveButton().disabled).toBeTrue()
    flush()
  }))
})
