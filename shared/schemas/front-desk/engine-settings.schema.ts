import { z } from 'zod'

/** Plan 760: the assistant's engine numbers the platform admin may change. */
export const ENGINE_FIELDS = [
  'quietMs',
  'maxWaitMs',
  'dailyTurns',
  'turnLimit',
  'followUpMax',
  'historyWindow',
  'glueMax',
  'factsMaxChars',
  'firstModelMs',
  'turnBudgetMs'
] as const
export type EngineField = (typeof ENGINE_FIELDS)[number]

/** The body of one save: one number. Its range is checked by the server's table (`assistant-engine-settings.js`). */
export const engineSettingSaveSchema = z
  .object({
    field: z.enum(ENGINE_FIELDS),
    value: z.number().int()
  })
  .strict()
export type EngineSettingSave = z.infer<typeof engineSettingSaveSchema>
