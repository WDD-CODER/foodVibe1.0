import {
  KNOWLEDGE_SOURCES,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TOPICS,
  KNOWLEDGE_VISIBILITY,
  type KnowledgeItem
} from '@schemas/entities'

/** Plan 554: one fact the business knows about itself. Mirror of shared/schemas/entities/knowledge-item.schema.ts. */
export { KNOWLEDGE_TOPICS, KNOWLEDGE_STATUSES, KNOWLEDGE_SOURCES, KNOWLEDGE_VISIBILITY }
export type { KnowledgeItem }
export type KnowledgeTopic = (typeof KNOWLEDGE_TOPICS)[number]
