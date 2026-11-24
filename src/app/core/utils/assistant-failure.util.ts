import type { AssistantFailureReason, Conversation } from '@schemas/entities'

/** Same list as `ASSISTANT_FAILURE_REASONS` in the shared schema; a type-only import keeps zod out of the first bundle. */
const REASONS: readonly AssistantFailureReason[] = ['busy', 'timeout', 'quota', 'other']

/** Plan 702: a reason read from a server answer; anything unknown is `other`. */
export function toAssistantFailureReason(value: unknown): AssistantFailureReason {
  return REASONS.find((r) => r === value) ?? 'other'
}

/** The dictionary key of the Hebrew line for a failure reason: the suggestion bar's or the thread note's. */
export function assistantFailureKey(reason: AssistantFailureReason, where: 'suggest' | 'note'): string {
  if (where === 'suggest') return reason === 'other' ? 'ibx_sg_failed' : `ibx_sg_failed_${reason}`
  return `ibx_ai_failed_${reason}`
}

/** True while the failure is the latest thing in the chat: a reply or a new guest message hides it. */
export function showAssistantFailure(conversation: Pick<Conversation, 'assistantFailed' | 'lastMessageAt'>): boolean {
  const failed = conversation.assistantFailed
  return !!failed && failed.at >= conversation.lastMessageAt
}
