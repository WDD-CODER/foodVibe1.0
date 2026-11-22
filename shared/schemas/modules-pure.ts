/** Plan 620: the module helpers without zod, so the browser's first bundle does not pull the validation library. */

/** Plan 615 (C-MODULES): the modules a business may have switched on. Plan 662 (C-REGISTRY-R) adds `tables`. */
export const MODULE_KEYS = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag', 'tables'] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

/** What a business that has no stored `modules` list gets. */
export const DEFAULT_MODULES: readonly ModuleKey[] = ['events', 'event_logistics', 'frontdesk', 'ai_create']

/**
 * The modules a business has: the stored list (known keys, no repeats, in MODULE_KEYS order) or the defaults.
 * `event_logistics` lives on an event, so it is dropped when `events` is not in the list. `tables` (plan 662) lives
 * on the front desk, so it is dropped when `frontdesk` is not in the list.
 */
export function modulesOf(business: { modules?: readonly string[] | null } | null | undefined): ModuleKey[] {
  const stored = business?.modules
  if (!Array.isArray(stored)) return [...DEFAULT_MODULES]
  const kept = MODULE_KEYS.filter(key => stored.includes(key))
  const withEvents = kept.includes('events') ? kept : kept.filter(key => key !== 'event_logistics')
  return withEvents.includes('frontdesk') ? withEvents : withEvents.filter(key => key !== 'tables')
}

export function hasModule(business: { modules?: readonly string[] | null } | null | undefined, key: ModuleKey): boolean {
  return modulesOf(business).includes(key)
}

/** The generic API gates a type by this table (any one key of a list is enough). */
export const MODULE_OF_TYPE: Record<string, readonly ModuleKey[]> = {
  menuEvents: ['events'],
  venues: ['events'],
  requests: ['frontdesk'],
  bookings: ['frontdesk'],
  frontDeskProfiles: ['frontdesk'],
  knowledgeItems: ['frontdesk'],
  clients: ['events', 'frontdesk'],
  // Plan 662 (C-REGISTRY-R): the Restaurant program's two readable types.
  floorPlans: ['tables'],
  waitlistEntries: ['tables']
}
