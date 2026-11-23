import { CONVERSATION_STATUSES } from '@schemas/entities'
import type { Conversation, ConversationStatus, Message, MessageStatus } from '@schemas/entities'

/** Plan 677: a guest conversation and its message. Mirror of the shared schemas (server-only collections, plan 662). */
export { CONVERSATION_STATUSES }
export type { Conversation, ConversationStatus, Message, MessageStatus }

/** One row of GET /conversations: the stored document, the client's card and the newest message (text cut at 120). */
export type ConversationRow = Conversation & {
  client: { _id: string; name: string; phone: string; tags?: string[] }
  last: { text: string; direction: 'in' | 'out'; kind: string; at: number } | null
}

/** The booking or request a conversation is about, as one line of the thread header. */
export type LinkedCard = {
  type: 'booking' | 'request'
  titleKey: string
  kindKey?: string
  date?: string
  time?: string
  partySize?: number
  statusKey: string
  link: string
  queryParams?: Record<string, string>
}
