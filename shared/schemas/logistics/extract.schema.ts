import { z } from 'zod'
import {
  LOGISTICS_PHASES, LOGISTICS_ANSWER_STATUSES, LOGISTICS_TEXT_MAX, LOGISTICS_LABEL_MAX, LOGISTICS_ANSWERS_MAX
} from '../entities/event-logistics'

/** Plan 622 (C-LOGX): site-visit notes → a checklist draft. One file for server and browser. */
export const LOGISTICS_EXTRACT_TEXT_MAX = 20_000
export const LOGISTICS_EXTRACT_ADHOC_MAX = 20
export const LOGISTICS_DRAFT_STATUSES = ['needed', 'not_needed', 'client_provides'] as const

export const logisticsExtractRequestSchema = z.strictObject({
  eventId: z.string().min(1).max(64),
  phase: z.enum(LOGISTICS_PHASES),
  text: z.string().trim().min(1).max(LOGISTICS_EXTRACT_TEXT_MAX),
  fileId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  model: z.string().max(80).optional()
})

/** Not strict: unknown keys such as `payer` are stripped by Zod and so never taken. */
export const logisticsModelAnswerSchema = z.object({
  answers: z.array(z.object({
    i: z.number().int().min(0),
    status: z.string(),
    quantity: z.number().optional(),
    text: z.string().optional()
  })).max(400),
  extra: z.array(z.object({
    label: z.string(),
    section: z.string().optional(),
    status: z.string(),
    text: z.string().optional()
  })).max(100).optional()
})

const draftStatus = z.enum(LOGISTICS_DRAFT_STATUSES)
const quantity = z.number().min(0).max(100000)
const text = z.string().max(LOGISTICS_TEXT_MAX)

export const logisticsDraftAnswerSchema = z.object({
  itemKey: z.string().min(1),
  phase: z.enum(LOGISTICS_PHASES),
  section: z.string().min(1),
  status: draftStatus,
  quantity: quantity.optional(),
  text: text.optional()
})

export const logisticsDraftConflictSchema = z.object({
  itemKey: z.string().min(1),
  current: z.object({
    status: z.enum(LOGISTICS_ANSWER_STATUSES),
    quantity: quantity.optional(),
    text: text.optional(),
    payer: z.string().optional()
  }),
  suggested: z.object({ status: draftStatus, quantity: quantity.optional(), text: text.optional() })
})

export const logisticsDraftAdhocSchema = z.object({
  label: z.string().min(1).max(LOGISTICS_LABEL_MAX),
  section: z.string().min(1),
  status: draftStatus,
  quantity: quantity.optional(),
  text: text.optional()
})

export const logisticsExtractResponseSchema = z.strictObject({
  draftId: z.string().nullable(),
  answers: z.array(logisticsDraftAnswerSchema).max(LOGISTICS_ANSWERS_MAX),
  conflicts: z.array(logisticsDraftConflictSchema).max(LOGISTICS_ANSWERS_MAX),
  adhoc: z.array(logisticsDraftAdhocSchema).max(LOGISTICS_EXTRACT_ADHOC_MAX),
  unanswered: z.array(z.string())
})

export const logisticsConfirmRequestSchema = z.strictObject({
  saved: z.array(z.strictObject({
    itemKey: z.string().min(1).max(LOGISTICS_LABEL_MAX).optional(),
    label: z.string().min(1).max(LOGISTICS_LABEL_MAX).optional(),
    status: draftStatus,
    quantity: z.number().min(0).max(100000).optional(),
    text: z.string().max(LOGISTICS_TEXT_MAX).optional()
  }).refine((l) => !!l.itemKey || !!l.label)).max(LOGISTICS_ANSWERS_MAX + LOGISTICS_EXTRACT_ADHOC_MAX)
})

export type LogisticsExtractRequest = z.infer<typeof logisticsExtractRequestSchema>
export type LogisticsModelAnswer = z.infer<typeof logisticsModelAnswerSchema>
export type LogisticsDraftAnswer = z.infer<typeof logisticsDraftAnswerSchema>
export type LogisticsDraftConflict = z.infer<typeof logisticsDraftConflictSchema>
export type LogisticsDraftAdhoc = z.infer<typeof logisticsDraftAdhocSchema>
export type LogisticsExtractResponse = z.infer<typeof logisticsExtractResponseSchema>
export type LogisticsConfirmRequest = z.infer<typeof logisticsConfirmRequestSchema>
