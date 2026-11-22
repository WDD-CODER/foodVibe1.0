import { z } from 'zod'

/**
 * Plan 662 (C-CONV, shape part): one message of a conversation. Server-only collection. Unique per business and
 * `providerMessageId`, so a provider's retry of the same message is stored once.
 */
export const MESSAGE_DIRECTIONS = ['in', 'out'] as const
export const MESSAGE_AUTHORS = ['guest', 'ai', 'member', 'server'] as const
export const MESSAGE_KINDS = ['text', 'template', 'button'] as const
export const MESSAGE_STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed'] as const
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number]
export type MessageAuthor = (typeof MESSAGE_AUTHORS)[number]
export type MessageKind = (typeof MESSAGE_KINDS)[number]
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export const messageSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  conversationId: z.string().min(1),
  direction: z.enum(MESSAGE_DIRECTIONS),
  author: z.enum(MESSAGE_AUTHORS),
  memberId: z.string().min(1).optional(),
  kind: z.enum(MESSAGE_KINDS),
  text: z.string().max(4000),
  template: z
    .strictObject({
      name: z.string().min(1).max(100),
      params: z.array(z.string().max(1000)).max(20)
    })
    .optional(),
  buttons: z
    .array(z.strictObject({ id: z.string().min(1).max(100), title: z.string().min(1).max(40) }))
    .max(3)
    .optional(),
  buttonId: z.string().min(1).max(100).optional(),
  at: z.number(),
  providerMessageId: z.string().min(1),
  status: z.enum(MESSAGE_STATUSES),
  test: z.literal(true).optional()
})
export type Message = z.infer<typeof messageSchema>
