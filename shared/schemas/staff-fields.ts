/**
 * Which top-level fields of an entity a staff member may read. The server trims every other
 * field (base fields stay) from staff reads of a type listed here; types not listed are untouched.
 */
export const STAFF_READ_FIELDS: Record<string, readonly string[]> = {
  clients: ['name', 'phone', 'tags', 'kinds']
}
