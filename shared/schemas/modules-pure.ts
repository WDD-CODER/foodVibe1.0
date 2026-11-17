// Zod-free half of the modules contract: the browser imports this one so zod stays out of the initial bundle.
/** Plan 615 (C-MODULES): the five modules a business may have switched on. */
export const MODULE_KEYS = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag'] as const
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
  venues: ['events'],
  requests: ['frontdesk'],
  bookings: ['frontdesk'],
  frontDeskProfiles: ['frontdesk'],
  knowledgeItems: ['frontdesk'],
  clients: ['events', 'frontdesk']
}
