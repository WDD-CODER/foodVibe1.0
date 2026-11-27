/** Plan 620: the module helpers without zod, so the browser's first bundle does not pull the validation library. */

/**
 * Plan 615 (C-MODULES): the modules a business may have switched on. Plans 724 and 727 added `dish_analysis` and
 * `monthly_plan`, plan 764 added `menu_design` (all three off by default).
 */
export const MODULE_KEYS = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag', 'dish_analysis', 'monthly_plan', 'menu_design'] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

/** What a business that has no stored `modules` list gets. */
export const DEFAULT_MODULES: readonly ModuleKey[] = ['events', 'event_logistics', 'frontdesk', 'ai_create']

/**
 * The modules a business has: the stored list (known keys, no repeats, in MODULE_KEYS order) or the defaults.
 * `event_logistics` lives on an event, so it is dropped when `events` is not in the list.
 */
export function modulesOf(business: { modules?: readonly string[] | null } | null | undefined): ModuleKey[] {
  const stored = business?.modules
  if (!Array.isArray(stored)) return [...DEFAULT_MODULES]
  const kept = MODULE_KEYS.filter(key => stored.includes(key))
  return kept.includes('events') ? kept : kept.filter(key => key !== 'event_logistics')
}

export function hasModule(business: { modules?: readonly string[] | null } | null | undefined, key: ModuleKey): boolean {
  return modulesOf(business).includes(key)
}

/** The generic API gates a type by this table (any one key of a list is enough). */
export const MODULE_OF_TYPE: Record<string, readonly ModuleKey[]> = {
  menuEvents: ['events'],
  menuDesigns: ['menu_design'],
  venues: ['events'],
  requests: ['frontdesk'],
  bookings: ['frontdesk'],
  frontDeskProfiles: ['frontdesk'],
  knowledgeItems: ['frontdesk'],
  clients: ['events', 'frontdesk'],
  // Plan 724: the dish analysis store.
  menuDishes: ['dish_analysis'],
  dishSalesMonths: ['dish_analysis'],
  dishSalesAliases: ['dish_analysis']
}
