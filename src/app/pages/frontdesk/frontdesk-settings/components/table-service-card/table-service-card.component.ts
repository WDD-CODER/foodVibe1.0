import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { TimeFieldComponent } from 'src/app/shared/time-field/time-field.component'
import type { TableServiceSettings, TurnMinutesStep } from '@schemas/front-desk/table-service'

export type TableConfirmModeValue = 'auto' | 'manual'

/** The nine settings the card edits; the confirm mode is saved by its own call. */
export type TableServiceDraft = Omit<TableServiceSettings, 'confirmMode'>

export const MAX_LADDER_STEPS = 6
const MAX_PARTY = 30
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

type NumberField = 'lastSeatingBeforeCloseMinutes' | 'bufferMinutes' | 'holdMinutes' | 'cancellationCutoffHours'

const RANGES: Record<NumberField | 'autoMaxParty', readonly [number, number]> = {
  autoMaxParty: [1, MAX_PARTY],
  lastSeatingBeforeCloseMinutes: [0, 180],
  bufferMinutes: [0, 30],
  holdMinutes: [5, 60],
  cancellationCutoffHours: [0, 72]
}

const inRange = (value: number, [min, max]: readonly [number, number]): boolean =>
  Number.isInteger(value) && value >= min && value <= max

/** Error keys by field name (the ladder is `turnMinutes`); an empty object when every setting is valid. */
export function tableServiceErrors(d: TableServiceDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    if (!inRange(d[key], RANGES[key])) errors[key] = 'fd_ts_out_of_range'
  }
  if (d.slotMinutes !== 15 && d.slotMinutes !== 30) errors['slotMinutes'] = 'fd_ts_out_of_range'
  if (!HH_MM.test(d.reminderHour)) errors['reminderHour'] = 'fd_ts_bad_time'
  const ladder = d.turnMinutes
  if (
    ladder.length < 1 ||
    ladder.length > MAX_LADDER_STEPS ||
    ladder.some((s) => !inRange(s.maxParty, [1, MAX_PARTY]) || !inRange(s.minutes, [30, 360]))
  ) {
    errors['turnMinutes'] = 'fd_ts_out_of_range'
  } else if (ladder.some((s, i) => i > 0 && s.maxParty <= ladder[i - 1].maxParty)) {
    errors['turnMinutes'] = 'fd_ts_ladder_order'
  }
  return errors
}

/**
 * Plan 667: the table settings card of the front desk settings page. The confirm-mode switch is saved by the page
 * through its own call (`confirmModeChange`); the nine fields are edited in `service` and saved with the page.
 */
@Component({
  selector: 'app-table-service-card',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    FormFieldComponent,
    CustomSelectComponent,
    CounterComponent,
    TimeFieldComponent
  ],
  templateUrl: './table-service-card.component.html',
  styleUrl: './table-service-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableServiceCardComponent {
  readonly service = model.required<TableServiceDraft>()
  readonly confirmMode = input.required<TableConfirmModeValue>()
  readonly switching = input(false)
  readonly disabled = input(false)
  readonly showErrors = input(false)
  readonly confirmModeChange = output<TableConfirmModeValue>()

  protected readonly slotOptions = [
    { value: '15', label: 'fd_ts_slot_15' },
    { value: '30', label: 'fd_ts_slot_30' }
  ]
  protected readonly maxSteps = MAX_LADDER_STEPS
  protected readonly errors_ = computed<Record<string, string | undefined>>(() =>
    this.showErrors() ? tableServiceErrors(this.service()) : {}
  )
  protected readonly isAuto_ = computed(() => this.confirmMode() === 'auto')

  protected toggleMode_(checked: boolean): void {
    this.confirmModeChange.emit(checked ? 'auto' : 'manual')
  }

  protected readonly numberFields = (
    [
      ['lastSeatingBeforeCloseMinutes', 'fd_ts_last_seating'],
      ['bufferMinutes', 'fd_ts_buffer'],
      ['holdMinutes', 'fd_ts_hold'],
      ['cancellationCutoffHours', 'fd_ts_cutoff']
    ] as const
  ).map(([key, label]) => ({ key, label, min: RANGES[key][0], max: RANGES[key][1] }))
  protected readonly ladderFields = [
    { key: 'maxParty', label: 'fd_ts_ladder_up_to', min: 1, max: MAX_PARTY, step: undefined },
    { key: 'minutes', label: 'fd_ts_ladder_minutes', min: 30, max: 360, step: { explicitStep: 15 } }
  ] as const

  protected setNumber_(key: NumberField, value: number): void {
    this.service.update((s) => ({ ...s, [key]: value }))
  }

  protected setAutoMaxParty_(value: number): void {
    this.service.update((s) => ({ ...s, autoMaxParty: value }))
  }

  protected setSlot_(value: unknown): void {
    this.service.update((s) => ({ ...s, slotMinutes: Number(value) === 30 ? 30 : 15 }))
  }

  protected setAutoNoShow_(checked: boolean): void {
    this.service.update((s) => ({ ...s, autoNoShow: checked }))
  }

  protected setReminder_(value: string): void {
    this.service.update((s) => ({ ...s, reminderHour: value }))
  }

  protected setStep_(index: number, key: keyof TurnMinutesStep, value: number): void {
    this.service.update((s) => ({
      ...s,
      turnMinutes: s.turnMinutes.map((step, i) => (i === index ? { ...step, [key]: value } : step))
    }))
  }

  protected addStep_(): void {
    this.service.update((s) => {
      if (s.turnMinutes.length >= MAX_LADDER_STEPS) return s
      const last = s.turnMinutes[s.turnMinutes.length - 1]
      const next = { maxParty: Math.min(MAX_PARTY, (last?.maxParty ?? 0) + 2), minutes: last?.minutes ?? 120 }
      return { ...s, turnMinutes: [...s.turnMinutes, next] }
    })
  }

  protected removeStep_(index: number): void {
    this.service.update((s) =>
      s.turnMinutes.length <= 1 ? s : { ...s, turnMinutes: s.turnMinutes.filter((_, i) => i !== index) }
    )
  }
}
