import type { AssistantEngine, AssistantSetup } from '@models/assistant-run.model'

/** Plan 760: the engine numbers the platform admin changes, as the server describes them and as a row shows them. */
export type EngineUnit = 'ms' | 'turns' | 'messages' | 'chars'

export interface EngineRange {
  min: number
  max: number
  unit: EngineUnit
}

/** The setup read as the platform admin gets it: `editable` and the ranges reach him only. */
export type AdminAssistantSetup = AssistantSetup & {
  editable?: true
  ranges?: Partial<Record<keyof AssistantEngine, EngineRange>>
}

/** One number that can be changed. */
export interface EngineEdit {
  field: keyof AssistantEngine
  value: number
  range: EngineRange
}

export const engineUnitKey = (unit: EngineUnit): string => (unit === 'ms' ? 'asr_unit_seconds' : `asr_unit_${unit}`)

/** A stored number as the box shows it: milliseconds as seconds with one decimal. */
export const toShown = (value: number, unit: EngineUnit): string =>
  unit === 'ms' ? (value / 1000).toFixed(1) : String(value)

/** The range as its hint shows it; both ends are rounded inwards, so what is shown can be saved. */
export const shownRange = ({ min, max, unit }: EngineRange): string =>
  unit === 'ms'
    ? `${toShown(Math.ceil(min / 100) * 100, unit)}–${toShown(Math.floor(max / 100) * 100, unit)}`
    : `${min}–${max}`

/** What the box holds as the number to save (a time is kept to a tenth of a second), or `null` when it cannot be. */
export function fromShown(text: string, { min, max, unit }: EngineRange): number | null {
  if (!text.trim()) return null
  const typed = Number(text)
  const value = unit === 'ms' ? Math.round(typed * 10) * 100 : typed
  return Number.isInteger(value) && value >= min && value <= max ? value : null
}
