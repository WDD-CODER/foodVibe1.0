/**
 * Plan 552: a WhatsApp link from a stored phone. Digits only; a leading 0 becomes 972; a leading 972 stays; fewer
 * than 9 digits gives `null` (no link). `text` is URL-encoded into `?text=`.
 */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '')
  const intl = digits.startsWith('972') ? digits : digits.startsWith('0') ? `972${digits.slice(1)}` : digits
  if (digits.length < 9) return null
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
