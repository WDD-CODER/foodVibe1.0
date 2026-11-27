import { z } from 'zod'

/**
 * Plan 752 (C-RUNS): one run of the front-desk assistant, step by step. Server-only collection, written once by
 * `server/services/frontdesk-runs.js`, deleted by a TTL index 30 days after it started.
 */
export const RUN_MODES = ['turn', 'suggest'] as const
export const RUN_OUTCOMES = ['answered', 'asked', 'draft', 'handover', 'failed', 'removed', 'dropped',
  'superseded'] as const
export const RUN_STEP_KEYS = ['inbound', 'setup', 'limit', 'history', 'precheck', 'facts', 'prompt', 'ai', 'shape',
  'guardrails', 'tables', 'decide', 'send'] as const
export const RUN_STEP_STATUSES = ['ok', 'note', 'stopped', 'skipped'] as const
export const RUN_REASONS = ['quota', 'busy', 'timeout', 'other', 'error', 'send_refused', 'removal', 'keyword',
  'outside_hours', 'turn_limit', 'model', 'low_content', 'internals', 'invented_link', 'deferred', 'completion_claim',
  'unsupported_time', 'table_number', 'unsupported_price', 'table_engine', 'open_request', 'taken_over', 'closed',
  'lease_lost', 'overtaken', 'follow_up_limit'] as const

export const runStepSchema = z.strictObject({
  key: z.enum(RUN_STEP_KEYS),
  status: z.enum(RUN_STEP_STATUSES),
  ms: z.number().min(0),
  in: z.record(z.string(), z.unknown()).optional(),
  out: z.record(z.string(), z.unknown()).optional()
})

export const assistantRunSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  conversationId: z.string().min(1),
  test: z.literal(true).optional(),
  mode: z.enum(RUN_MODES),
  level: z.number().int().min(0).max(2),
  startedAt: z.number(),
  endedAt: z.number(),
  ms: z.number().min(0),
  expiresAt: z.date(),
  trigger: z.strictObject({ messageIds: z.array(z.string().min(1)).max(12), text: z.string().max(300) }),
  outcome: z.enum(RUN_OUTCOMES),
  reason: z.string().min(1).max(40).optional(),
  fallbackUsed: z.boolean(),
  model: z.string().min(1).max(80).optional(),
  intent: z.string().min(1).max(20).optional(),
  steps: z.array(runStepSchema).length(13),
  prompt: z
    .strictObject({
      lead: z.string().max(8000),
      truncated: z.literal(true).optional(),
      tone: z.enum(['warm', 'formal']),
      tablesOn: z.boolean()
    })
    .optional(),
  followsRunId: z.string().min(1).optional(),
  adminViews: z.array(z.strictObject({ at: z.number(), userId: z.string().min(1) })).max(20).optional()
})
export type AssistantRun = z.infer<typeof assistantRunSchema>
export type RunStep = z.infer<typeof runStepSchema>
export type RunStepKey = (typeof RUN_STEP_KEYS)[number]
export type RunOutcome = (typeof RUN_OUTCOMES)[number]
