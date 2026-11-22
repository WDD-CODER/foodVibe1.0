import { z } from 'zod'
import { floorKeyField } from './floor-plan.schema'

/**
 * Plan 662 (C-HOLD, shape part): one claimed cell of one table for one booking. Server-only collection. The unique
 * index on (`businessId`, `tableKey`, `cell`) is the guard of INV-7 (ADR 0033). `cell` is the cell's own time.
 */
export const tableHoldSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  tableKey: floorKeyField,
  cell: z.number(),
  bookingId: z.string().min(1),
  test: z.literal(true).optional()
})
export type TableHold = z.infer<typeof tableHoldSchema>
