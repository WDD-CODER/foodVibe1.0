import { Client } from '@models/client.model'
import { normalizePhone } from '@schemas/phone'

/** Plan 545 (R-01): the one phone rule, shared with the server (`normalizePhone`, `phoneKey`). */
export { normalizePhone, phoneKey } from '@schemas/phone'

/** `name · phone`, plus ` · <count> <word>` when the client has events. */
export function clientLabel(c: Client, eventCount: number, countWord: string): string {
  const base = `${c.name} · ${c.phone}`
  return eventCount > 0 ? `${base} · ${eventCount} ${countWord}` : base
}

/** True when the name contains `q` (any case) or the digits of `q` start the client's phone digits. */
export function matchesClientQuery(c: Client, q: string): boolean {
  const query = (q ?? '').trim()
  if (!query) return false
  if (c.name.toLowerCase().includes(query.toLowerCase())) return true
  const digits = normalizePhone(query)
  if (!digits) return false
  // Staff do not receive phoneNormalized; fall back to the digits of the phone they do receive.
  const phoneDigits = c.phoneNormalized ?? normalizePhone(c.phone)
  return phoneDigits.startsWith(digits)
}
