import { z } from 'zod'
import { FRONT_DESK_REQUEST_KINDS } from '../entities/front-desk-profile.schema'

/** Plan 679 (C-AI): what the model must answer with, one JSON object. Unknown keys are dropped, not refused. */
export const TURN_INTENTS = ['question', 'request', 'book', 'change', 'cancel', 'smalltalk', 'other'] as const
export type TurnIntent = (typeof TURN_INTENTS)[number]

export const turnAnswerSchema = z.object({
  reply: z.string().max(1000),
  intent: z.enum(TURN_INTENTS),
  kind: z.enum(FRONT_DESK_REQUEST_KINDS).optional(),
  collected: z
    .object({
      /** Plan 680: what the guest said about a table; the server validates every value before the engine sees it. */
      table: z
        .object({
          date: z.string().max(40).optional(),
          time: z.string().max(40).optional(),
          partySize: z.number().int().min(1).max(5000).optional(),
          areaKey: z.string().max(12).optional()
        })
        .optional()
    })
    .catchall(z.string().max(300))
    .default({}),
  missing: z.array(z.string()).max(20).default([]),
  handoff: z.boolean().default(false),
  handoffReason: z.string().max(200).optional(),
  usedFacts: z.array(z.string()).max(60).default([])
})
export type TurnAnswer = z.infer<typeof turnAnswerSchema>
