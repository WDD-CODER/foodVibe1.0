import { z } from 'zod'

/** Max size of `context` once serialised — bounds what one public log write can store. */
export const LOG_CONTEXT_MAX_BYTES = 4096

/**
 * `domain.action.result`: at least two dot-separated segments. camelCase is allowed — many
 * client events use it (`crud.menuEvent.get_error`).
 */
export const LOG_EVENT_PATTERN = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9_-]+)+$/

/** Body of `POST /api/v1/log` (Plan 382): one client event. */
export const logEventSchema = z.strictObject({
  level: z.enum(['info', 'warn', 'error']),
  event: z.string().max(64).regex(LOG_EVENT_PATTERN),
  message: z.string().max(500),
  context: z.record(z.string(), z.unknown())
    .refine((ctx) => new TextEncoder().encode(JSON.stringify(ctx)).length <= LOG_CONTEXT_MAX_BYTES, {
      message: `context exceeds ${LOG_CONTEXT_MAX_BYTES} bytes`
    })
    .optional(),
  timestamp: z.iso.datetime(),
  requestId: z.string().max(64).optional(),
  url: z.string().max(300).optional()
})

export type LogEventPayload = z.infer<typeof logEventSchema>
