import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/**
 * Plan 662 (C-CONV, shape part): one chat with one guest. Server-only collection (no generic API). `liveKey` is
 * `'<channel>:<waId>'` while the status is not `closed` and is removed on close (unique, partial index).
 */
export const CONVERSATION_CHANNELS = ['sim', 'whatsapp'] as const
export const CONVERSATION_STATUSES = ['bot', 'human', 'closed'] as const
export const CONVERSATION_PENDING_KINDS = ['book', 'change', 'cancel'] as const
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number]
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]
export type ConversationPendingKind = (typeof CONVERSATION_PENDING_KINDS)[number]

export const conversationSchema = z.strictObject({
  ...baseDocShape,
  clientId: z.string().min(1),
  channel: z.enum(CONVERSATION_CHANNELS),
  waId: z.string().min(1).max(40),
  status: z.enum(CONVERSATION_STATUSES),
  assignedTo: z.string().min(1).optional(),
  lastMessageAt: z.number(),
  lastInboundAt: z.number(),
  unread: z.number().int().min(0),
  requestId: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
  windowExpiresAt: z.number(),
  pending: z
    .strictObject({
      kind: z.enum(CONVERSATION_PENDING_KINDS),
      data: z.record(z.string(), z.unknown()),
      at: z.number()
    })
    .optional(),
  suggestion: z.string().max(4000).optional(),
  liveKey: z.string().min(1).optional(),
  test: z.literal(true).optional()
})
export type Conversation = z.infer<typeof conversationSchema>
