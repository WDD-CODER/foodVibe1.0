import type { EventStage } from '@models/menu-event.model'

/** Plan 443: the stage rules the screens need. Mirrors `shared/schemas/entities/event-stage.ts` (the client does not import `shared/`). */
export const EVENT_STAGE_ORDER: readonly EventStage[] = [
  'inquiry',
  'quote_sent',
  'deposit_paid',
  'ordering',
  'execution',
  'post_production',
  'finished',
  'not_closed'
]

/** "לא נסגר" can be entered only from these stages. */
const NOT_CLOSED_FROM: readonly EventStage[] = ['inquiry', 'quote_sent']

/** Moving to this stage or a later one (except "not closed") needs an event date. */
const DATE_FROM_INDEX = EVENT_STAGE_ORDER.indexOf('deposit_paid')

/** Server error code (plan 442 / 427) to dictionary key. */
const ERROR_KEYS: Record<string, string> = {
  DATE_REQUIRED: 'stage_needs_date',
  REASON_REQUIRED: 'stage_reason_required',
  NOT_CLOSED_FROM_STAGE: 'stage_not_closed_from',
  USE_FINISH: 'stage_finished_hint',
  EVENT_FINISHED: 'event_finished_locked',
  NOTE_EMPTY: 'notes_empty_error',
  NOTE_TOO_LONG: 'notes_too_long',
  FORBIDDEN: 'no_permission'
}

/** Stages a chef may click from `current`: never "הסתיים", and "לא נסגר" only where it is allowed. */
export function selectableStages(current: EventStage): EventStage[] {
  return EVENT_STAGE_ORDER.filter(
    (stage) => stage !== 'finished' && (stage !== 'not_closed' || canPickNotClosed(current))
  )
}

export function canPickNotClosed(current: EventStage): boolean {
  return NOT_CLOSED_FROM.includes(current)
}

/** True when moving to `target` is refused for lack of an event date. */
export function needsDateFor(target: EventStage, eventDate: string | undefined): boolean {
  if (target === 'not_closed') return false
  return EVENT_STAGE_ORDER.indexOf(target) >= DATE_FROM_INDEX && !eventDate
}

/** Live event: not finished and not lost. An event with no stage yet counts as live. */
export function isActiveStage(stage: EventStage | undefined): boolean {
  return stage !== 'finished' && stage !== 'not_closed'
}

export function stageLabelKey(stage: EventStage): string {
  return `event_stage_${stage}`
}

/** Dictionary key to show for a server error code; an unknown or missing code gives the generic one. */
export function stageErrorKey(code: string | null | undefined): string {
  return (code && ERROR_KEYS[code]) || 'stage_change_failed'
}
