import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'

/**
 * Plan 662 (C-FLOOR, shape part): a business's floor plan, at most one per business (unique index on `businessId`).
 * Every `key` is made once by the browser and never changes. Cross-reference checks (a repeated key or number, an
 * unknown area, a table outside the grid) are the floor plan route's (plan 664), not this schema's.
 */
export const FLOOR_TABLE_SHAPES = ['round', 'square', 'rect'] as const
export type FloorTableShape = (typeof FLOOR_TABLE_SHAPES)[number]

/** A table, area or join key. */
export const FLOOR_KEY_PATTERN = /^[a-z0-9]{6,12}$/
export const floorKeyField = z.string().regex(FLOOR_KEY_PATTERN)

const seats = z.number().int().min(1).max(30)

/** Plan 699: an area's zone on the map, in cells (same origin as tables: `x` from the inline start), at least 2 × 2. */
export const floorZoneSchema = z.strictObject({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(2).max(80),
  h: z.number().int().min(2).max(80)
})

export const floorAreaSchema = z.strictObject({
  key: floorKeyField,
  name: nameField,
  order: z.number().int(),
  /** Plan 699: index into the zone palette (0–7); none = `order % 8`. */
  color: z.number().int().min(0).max(7).optional(),
  /** Plan 699: the area's rectangle on the map; none = the area is only a tag. */
  zone: floorZoneSchema.optional()
})

export const floorTableSchema = z
  .strictObject({
    key: floorKeyField,
    number: z.string().min(1).max(6),
    areaKey: floorKeyField,
    shape: z.enum(FLOOR_TABLE_SHAPES),
    minSeats: seats,
    maxSeats: seats,
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int().min(1).max(8),
    h: z.number().int().min(1).max(8),
    turned: z.boolean(),
    active: z.boolean(),
    online: z.boolean()
  })
  .refine((t) => t.maxSeats >= t.minSeats, { message: 'maxSeats must be at least minSeats', path: ['maxSeats'] })

export const floorJoinSchema = z
  .strictObject({
    key: floorKeyField,
    tableKeys: z.array(floorKeyField).min(2).max(4),
    minSeats: z.number().int().min(1),
    maxSeats: z.number().int().min(1),
    online: z.boolean()
  })
  .refine((j) => j.maxSeats >= j.minSeats, { message: 'maxSeats must be at least minSeats', path: ['maxSeats'] })

export const floorPlanSchema = z.strictObject({
  ...baseDocShape,
  grid: z.strictObject({
    cols: z.number().int().min(10).max(80),
    rows: z.number().int().min(10).max(80)
  }),
  areas: z.array(floorAreaSchema).min(1).max(10),
  tables: z.array(floorTableSchema).max(200),
  joins: z.array(floorJoinSchema).max(60)
})
export type FloorPlan = z.infer<typeof floorPlanSchema>
export type FloorTable = z.infer<typeof floorTableSchema>
export type FloorArea = z.infer<typeof floorAreaSchema>
export type FloorJoin = z.infer<typeof floorJoinSchema>
export type FloorZone = z.infer<typeof floorZoneSchema>
