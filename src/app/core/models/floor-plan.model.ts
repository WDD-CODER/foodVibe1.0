import type { FloorPlan } from '@schemas/entities'

/** Plan 664: the floor plan (C-FLOOR). Mirror of shared/schemas/entities/floor-plan.schema.ts. */
export type { FloorPlan, FloorTable, FloorArea, FloorJoin } from '@schemas/entities'
export { FLOOR_PLAN_ISSUE_CODES } from '@schemas/front-desk/floor-plan-check'
export type { FloorPlanIssue } from '@schemas/front-desk/floor-plan-check'

/** What the editor sends: the four parts the server takes; the identity fields are the server's. */
export type FloorPlanBody = Pick<FloorPlan, 'grid' | 'areas' | 'tables' | 'joins'>
