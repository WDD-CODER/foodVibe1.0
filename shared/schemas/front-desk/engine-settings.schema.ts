import { z } from 'zod'

/** Plan 760: the engine numbers of the assistant that the platform admin may change. */
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

/** The body of one save: one number. Its allowed range is checked by the server's engine settings service. */
export const engineSettingSaveSchema = z.strictObject({
  field: z.enum(ENGINE_FIELDS),
  value: z.number().int()
})
