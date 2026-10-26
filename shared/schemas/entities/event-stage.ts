/** Plan 442 (contract C-STAGES): the event pipeline stages and the event fields only the server writes. */

export const EVENT_STAGES = ['inquiry', 'quote_sent', 'deposit_paid', 'ordering', 'execution', 'post_production', 'finished', 'not_closed'] as const
export type EventStage = (typeof EVENT_STAGES)[number]

export const NOT_CLOSED_REASONS = ['price', 'date_taken', 'no_reply', 'other'] as const
export type NotClosedReason = (typeof NOT_CLOSED_REASONS)[number]

/** "לא נסגר" can be entered only from these stages. */
export const NOT_CLOSED_FROM: readonly EventStage[] = ['inquiry', 'quote_sent']

/** Stages at or after this index (except `not_closed`) close the deal. */
export const CLOSED_FROM_INDEX = EVENT_STAGES.indexOf('deposit_paid')

export const NOTE_MAX_LENGTH = 2000

/** Written only by the server; the generic data API strips them from every client body. */
export const EVENT_SERVER_FIELDS = ['stage', 'stageHistory', 'closedAt', 'notClosedAt', 'notClosedReason', 'notClosedText', 'notes', 'legacy', 'closing'] as const

/** What entering `next` does to the stored planning snapshot (plan 446, contract C-SNAPSHOT). */
export type SnapshotAction = 'none' | 'store' | 'freeze' | 'store_and_freeze'

/**
 * The one freeze rule, used by the client (`snapshotOnStageChange`) and the events router.
 * Entering "הזמנות" stores a snapshot; entering "ביצוע" (or "פוסט-פרודקשן" when "ביצוע" was skipped) freezes it
 * (storing one first when there is none). A frozen snapshot is never touched by a stage move.
 */
export function snapshotActionOnStage(next: EventStage, stored?: { frozenAt?: number } | null): SnapshotAction {
  if (stored?.frozenAt !== undefined) return 'none'
  if (next === 'ordering') return 'store'
  if (next === 'execution' || next === 'post_production') return stored ? 'freeze' : 'store_and_freeze'
  return 'none'
}
