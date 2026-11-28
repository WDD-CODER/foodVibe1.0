import { DISH_RETURN_REASONS } from '@schemas/entities'
import type { DishSalesMonth } from '@schemas/entities'

/** Plan 726: one month of a restaurant's dish sales and returns. Mirror of shared/schemas/entities/dish-sales-month.schema.ts. */
export { DISH_RETURN_REASONS }
export type { DishSalesMonth }
/** One dish's line of a month. */
export type DishSalesRow = DishSalesMonth['rows'][number]
export type DishReturnReasonLine = DishSalesRow['returnReasons'][number]
