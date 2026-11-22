/**
 * Plan 662 (C-TSERVICE, delta 4): the one way the server and the browser read a front desk profile's table settings.
 * Pure and zod-free. Nothing fills defaults on read: a stored field wins, a missing one is the default below.
 */

export type TableServiceConfirmMode = 'auto' | 'manual'

export interface TurnMinutesStep {
  maxParty: number
  minutes: number
}

export interface TableServiceSettings {
  confirmMode: TableServiceConfirmMode
  autoMaxParty: number
  slotMinutes: 15 | 30
  turnMinutes: TurnMinutesStep[]
  lastSeatingBeforeCloseMinutes: number
  bufferMinutes: number
  holdMinutes: number
  autoNoShow: boolean
  reminderHour: string
  cancellationCutoffHours: number
}

/** Every default of C-TSERVICE except the ladder, which depends on the profile (`tableServiceOf`). */
export const TABLE_SERVICE_DEFAULTS: Readonly<Omit<TableServiceSettings, 'turnMinutes'>> = Object.freeze({
  confirmMode: 'manual',
  autoMaxParty: 6,
  slotMinutes: 15,
  lastSeatingBeforeCloseMinutes: 60,
  bufferMinutes: 0,
  holdMinutes: 15,
  autoNoShow: false,
  reminderHour: '10:00',
  cancellationCutoffHours: 3
})

/** The largest party the default one-step ladder covers. */
export const DEFAULT_LADDER_MAX_PARTY = 30
/** The ladder's minutes when the profile's table kind names no default duration. */
export const DEFAULT_TURN_MINUTES = 120

interface ProfileLike {
  tableService?: Partial<TableServiceSettings> | null
  requestKinds?: { table?: { defaultDurationMinutes?: number } | null } | null
}

/** All ten settings: the stored `tableService` over the defaults; the stored ladder when it has a step, else one step. */
export function tableServiceOf(profile: ProfileLike | null | undefined): TableServiceSettings {
  const stored = profile?.tableService ?? {}
  const defined = Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== undefined))
  const ladder =
    Array.isArray(stored.turnMinutes) && stored.turnMinutes.length > 0
      ? stored.turnMinutes.map((step) => ({ ...step }))
      : [
          {
            maxParty: DEFAULT_LADDER_MAX_PARTY,
            minutes: profile?.requestKinds?.table?.defaultDurationMinutes ?? DEFAULT_TURN_MINUTES
          }
        ]
  return { ...TABLE_SERVICE_DEFAULTS, ...defined, turnMinutes: ladder } as TableServiceSettings
}
