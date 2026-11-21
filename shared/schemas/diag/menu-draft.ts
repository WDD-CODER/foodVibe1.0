import { z } from 'zod'

/** Plan 633 (C-DIAG): the only shape the menu-reading model may answer with. */
export const menuPricesReplySchema = z.strictObject({
  items: z.array(z.strictObject({
    name: z.string().trim().min(1).max(200),
    sellPrice: z.number().min(0).nullable()
  }))
})

interface DraftItem { name?: unknown; sellPrice?: unknown }

/** Share of suggested items for which the saved menu has a row with the same name and the same price (0 when none suggested). */
export function menuKeptRatio(aiDraft: unknown, saved: unknown): number {
  const items = (aiDraft as { items?: DraftItem[] } | null)?.items
  if (!Array.isArray(items) || items.length === 0) return 0
  const menu = (saved as { items?: DraftItem[] } | null)?.items ?? (Array.isArray(saved) ? (saved as DraftItem[]) : [])
  const rows = Array.isArray(menu) ? menu : []
  let kept = 0
  for (const it of items) {
    if (rows.some(r => r.name === it.name && r.sellPrice === it.sellPrice)) kept += 1
  }
  return kept / items.length
}
