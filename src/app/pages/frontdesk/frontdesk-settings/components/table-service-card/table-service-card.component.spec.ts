import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { TableServiceCardComponent, tableServiceErrors, type TableServiceDraft } from './table-service-card.component'
import { TranslationService } from '@services/translation.service'
import { tableServiceOf } from '@schemas/front-desk/table-service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

function draftOf(over: Partial<TableServiceDraft> = {}): TableServiceDraft {
  const { confirmMode: _mode, ...rest } = tableServiceOf({})
  return { ...rest, ...over }
}

describe('TableServiceCardComponent (plan 667)', () => {
  let fixture: ComponentFixture<TableServiceCardComponent>
  let modes: string[]

  function setup(over: Partial<TableServiceDraft> = {}, mode: 'auto' | 'manual' = 'manual', disabled = false): void {
    modes = []
    TestBed.configureTestingModule({
      imports: [TableServiceCardComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } }]
    })
    fixture = TestBed.createComponent(TableServiceCardComponent)
    fixture.componentRef.setInput('service', draftOf(over))
    fixture.componentRef.setInput('confirmMode', mode)
    fixture.componentRef.setInput('disabled', disabled)
    fixture.componentInstance.confirmModeChange.subscribe((m) => modes.push(m))
    fixture.detectChanges()
  }

  const el = (): HTMLElement => fixture.nativeElement
  const svc = (): TableServiceDraft => fixture.componentInstance.service()
  const q = <T extends HTMLElement>(id: string): T => el().querySelector(`[data-testid="${id}"]`) as T
  /** The counter of a data-testid says it has a new value. */
  const type = (id: string, value: number): void => {
    const counter = fixture.debugElement.query(By.css(`[data-testid="${id}"]`)).componentInstance as CounterComponent
    counter.valueChange.emit(value)
    fixture.detectChanges()
  }
  const shown = (id: string): string => q(id).querySelector('input')!.value

  it('shows the ten defaults', () => {
    setup({}, 'auto')
    expect(q('table-service-card')).toBeTruthy()
    expect(shown('ts-lastSeatingBeforeCloseMinutes')).toBe('60')
    expect(shown('ts-bufferMinutes')).toBe('0')
    expect(shown('ts-holdMinutes')).toBe('15')
    expect(shown('ts-cancellationCutoffHours')).toBe('3')
    expect(q<HTMLInputElement>('ts-autoNoShow').checked).toBeFalse()
    expect(q<HTMLInputElement>('ts-reminderHour').querySelector('input')!.value).toBe('10:00')
    expect(el().querySelectorAll('[data-testid="ts-ladder-row"]').length).toBe(1)
    expect(shown('ts-ladder-maxParty')).toBe('30')
    expect(shown('ts-ladder-minutes')).toBe('120')
    expect(shown('ts-autoMaxParty')).toBe('6')
    expect(q<HTMLInputElement>('confirm-mode-switch').checked).toBeTrue()
    expect(el().textContent).toContain('fd_ts_mode_auto')
  })

  it('hides the auto party limit and reads manual while the mode is manual', () => {
    setup({}, 'manual')
    expect(q('ts-autoMaxParty')).toBeNull()
    expect(q<HTMLInputElement>('confirm-mode-switch').checked).toBeFalse()
    expect(el().textContent).toContain('fd_ts_mode_manual')
  })

  it('emits the mode asked for when the switch is tapped', () => {
    setup({}, 'manual')
    q<HTMLInputElement>('confirm-mode-switch').click()
    expect(modes).toEqual(['auto'])
  })

  it('emits the changed value for each number field and the toggle', () => {
    setup({}, 'manual')
    type('ts-lastSeatingBeforeCloseMinutes', 90)
    type('ts-bufferMinutes', 10)
    type('ts-holdMinutes', 20)
    type('ts-cancellationCutoffHours', 6)
    q<HTMLInputElement>('ts-autoNoShow').click()
    expect(svc()).toEqual(
      jasmine.objectContaining({
        lastSeatingBeforeCloseMinutes: 90,
        bufferMinutes: 10,
        holdMinutes: 20,
        cancellationCutoffHours: 6,
        autoNoShow: true
      })
    )
    type('ts-ladder-minutes', 90)
    expect(svc().turnMinutes[0].minutes).toBe(90)
  })

  it('adds ladder steps up to six and removes down to one', () => {
    setup({ turnMinutes: [{ maxParty: 4, minutes: 60 }] })
    expect(q('ts-ladder-remove')).toBeNull()
    for (let i = 0; i < 8; i++) {
      const add = q<HTMLButtonElement>('ts-ladder-add')
      if (add) add.click()
      fixture.detectChanges()
    }
    expect(svc().turnMinutes.length).toBe(6)
    expect(svc().turnMinutes[1]).toEqual({ maxParty: 6, minutes: 60 })
    expect(q('ts-ladder-add')).toBeNull()
    for (let i = 0; i < 8; i++) {
      const rm = q<HTMLButtonElement>('ts-ladder-remove')
      if (rm) rm.click()
      fixture.detectChanges()
    }
    expect(svc().turnMinutes.length).toBe(1)
  })

  it('disables every control when disabled, the switch included', () => {
    setup({}, 'auto', true)
    const controls = Array.from(el().querySelectorAll('input, button')) as (HTMLInputElement | HTMLButtonElement)[]
    expect(controls.length).toBeGreaterThan(5)
    const enabled = controls.filter((c) => !(c.disabled || !!c.closest('fieldset[disabled]')))
    expect(enabled.map((c) => c.outerHTML)).toEqual([])
    expect(q<HTMLInputElement>('confirm-mode-switch').disabled).toBeTrue()
  })

  it('shows the switch busy and disabled while switching', () => {
    setup()
    fixture.componentRef.setInput('switching', true)
    fixture.detectChanges()
    expect(q<HTMLInputElement>('confirm-mode-switch').disabled).toBeTrue()
    expect(q('confirm-mode-switch').getAttribute('aria-busy')).toBe('true')
  })
})

describe('tableServiceErrors (plan 667)', () => {
  it('is empty for the defaults', () => {
    expect(tableServiceErrors(draftOf())).toEqual({})
  })

  it('flags a ladder that is not ascending by maxParty', () => {
    const errors = tableServiceErrors(
      draftOf({
        turnMinutes: [
          { maxParty: 6, minutes: 90 },
          { maxParty: 6, minutes: 120 }
        ]
      })
    )
    expect(errors['turnMinutes']).toBe('fd_ts_ladder_order')
  })

  it('flags values out of range', () => {
    expect(tableServiceErrors(draftOf({ holdMinutes: 4 }))['holdMinutes']).toBe('fd_ts_out_of_range')
    expect(tableServiceErrors(draftOf({ bufferMinutes: 31 }))['bufferMinutes']).toBe('fd_ts_out_of_range')
    expect(tableServiceErrors(draftOf({ turnMinutes: [{ maxParty: 4, minutes: 20 }] }))['turnMinutes']).toBe(
      'fd_ts_out_of_range'
    )
    expect(tableServiceErrors(draftOf({ cancellationCutoffHours: 73 }))['cancellationCutoffHours']).toBe(
      'fd_ts_out_of_range'
    )
    expect(tableServiceErrors(draftOf({ holdMinutes: NaN }))['holdMinutes']).toBe('fd_ts_out_of_range')
  })

  it('flags a reminder hour that is not HH:mm', () => {
    expect(tableServiceErrors(draftOf({ reminderHour: '25:00' }))['reminderHour']).toBe('fd_ts_bad_time')
    expect(tableServiceErrors(draftOf({ reminderHour: '' }))['reminderHour']).toBe('fd_ts_bad_time')
  })
})
