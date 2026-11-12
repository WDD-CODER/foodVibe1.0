import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/** Plan 554 (C-KB): the 9 topics; this order is also the display order and the `publicFacts` order. */
export const KNOWLEDGE_TOPICS = ['hours', 'location', 'menu', 'prices', 'policy', 'dietary', 'events', 'faq', 'other'] as const
export const KNOWLEDGE_STATUSES = ['draft', 'approved'] as const
export const KNOWLEDGE_SOURCES = ['manual', 'ai_import', 'correction'] as const
export const KNOWLEDGE_VISIBILITY = ['public', 'internal'] as const

export type KnowledgeTopic = (typeof KNOWLEDGE_TOPICS)[number]
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]
export type KnowledgeSource = (typeof KNOWLEDGE_SOURCES)[number]
export type KnowledgeVisibility = (typeof KNOWLEDGE_VISIBILITY)[number]

const questionField = z.string().trim().min(1).max(200)
const answerField = z.string().trim().min(1).max(1200)
const variationsField = z.array(z.string().trim().min(1).max(200)).max(5)

/** One short fact the owner approves; only `approved` + `public` items ever reach a customer. */
export const knowledgeItemSchema = z.strictObject({
  ...baseDocShape,
  topic: z.enum(KNOWLEDGE_TOPICS),
  question: questionField,
  answer: answerField,
  status: z.enum(KNOWLEDGE_STATUSES).default('draft'),
  source: z.enum(KNOWLEDGE_SOURCES).default('manual'),
  visibility: z.enum(KNOWLEDGE_VISIBILITY).default('public'),
  variations: variationsField.optional()
})

/** What the AI import may return per item; everything else is set by the server. */
export const knowledgeImportItemSchema = z.strictObject({
  topic: z.enum(KNOWLEDGE_TOPICS),
  question: questionField,
  answer: answerField,
  variations: variationsField.optional()
})

export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>
export type KnowledgeImportItem = z.infer<typeof knowledgeImportItemSchema>
