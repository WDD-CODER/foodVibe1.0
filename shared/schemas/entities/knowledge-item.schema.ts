import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/** Plan 554 (C-KB): the nine topics, in display and `publicFacts` order. */
export const KNOWLEDGE_TOPICS = ['hours', 'location', 'menu', 'prices', 'policy', 'dietary', 'events', 'faq', 'other'] as const
export const KNOWLEDGE_STATUSES = ['draft', 'approved'] as const
export const KNOWLEDGE_SOURCES = ['manual', 'ai_import', 'correction'] as const
export const KNOWLEDGE_VISIBILITY = ['public', 'internal'] as const

export type KnowledgeTopic = (typeof KNOWLEDGE_TOPICS)[number]

const questionField = z.string().trim().min(1).max(200)
const answerField = z.string().trim().min(1).max(1200)
const variationsField = z.array(z.string().trim().min(1).max(200)).max(5).optional()

/**
 * Plan 554 (C-KB): one short fact the business knows about itself. Owner-only to write (OWNER_ONLY_TYPES); a delete is
 * soft (Trash). Only `approved` + `public` items ever reach a customer, through `publicFacts()`. Carries no clone lineage.
 */
export const knowledgeItemSchema = z.strictObject({
  ...baseDocShape,
  topic: z.enum(KNOWLEDGE_TOPICS),
  question: questionField,
  answer: answerField,
  status: z.enum(KNOWLEDGE_STATUSES).default('draft'),
  source: z.enum(KNOWLEDGE_SOURCES).default('manual'),
  visibility: z.enum(KNOWLEDGE_VISIBILITY).default('public'),
  variations: variationsField
})
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>

/** One item of an AI import reply: only what the model may set. */
export const knowledgeImportItemSchema = z.strictObject({
  topic: z.enum(KNOWLEDGE_TOPICS),
  question: questionField,
  answer: answerField,
  variations: variationsField
})
export type KnowledgeImportItem = z.infer<typeof knowledgeImportItemSchema>
