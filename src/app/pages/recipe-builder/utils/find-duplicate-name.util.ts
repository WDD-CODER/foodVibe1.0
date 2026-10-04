import type { Recipe } from '@models/recipe.model'

/** Returns the record that already uses `name` (trimmed), excluding `currentId`, or null. */
export function findDuplicateName(list: Recipe[], name: string, currentId: string | null): Recipe | null {
  const target = name.trim()
  if (!target) return null
  return list.find((r) => (r.nameHebrew?.trim() ?? '') === target && r._id !== currentId) ?? null
}
