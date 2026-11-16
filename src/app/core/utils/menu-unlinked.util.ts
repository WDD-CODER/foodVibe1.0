// Pure utility — no Angular imports. Plan 614: menu items that name a dish not built yet.
import type { MatchedDish } from '@models/ai-menu-draft.model'
import type { MenuEvent } from '@models/menu-event.model'

/** What the chef chose for one AI menu dish: a recipe-book id, 'new' (keep unlinked) or 'skip'. */
export type AiMenuResolution = string

/** The menu item an AI dish becomes, or null when the chef skipped it. */
export function resolveAiMenuDish(
  dish: MatchedDish,
  resolution: AiMenuResolution | undefined
): { recipeId: string; unlinkedName?: string } | null {
  const choice = resolution ?? dish.defaultChoice ?? (dish.status === 'matched' ? dish.recipeId : null) ?? 'new'
  if (choice === 'skip') return null
  if (choice === 'new' || choice === '') return { recipeId: '', unlinkedName: dish.nameHebrew.trim() }
  return { recipeId: choice }
}

/**
 * Links the first item of the section whose unlinkedName equals the name and whose recipeId is empty to the saved
 * recipe. Returns the changed menu, or null when no such item is found.
 */
export function linkUnlinkedMenuItem(
  event: MenuEvent,
  sectionId: string,
  name: string,
  recipeId: string,
  recipeType: 'dish' | 'preparation'
): MenuEvent | null {
  const wanted = name.trim()
  let linked = false
  const sections = event.sections.map((section) => {
    if (linked || section._id !== sectionId) return section
    const index = section.items.findIndex((item) => !item.recipeId && item.unlinkedName?.trim() === wanted)
    if (index < 0) return section
    linked = true
    const items = section.items.map((item, i) => {
      if (i !== index) return item
      const { unlinkedName: _gone, ...rest } = item
      return { ...rest, recipeId, recipeType }
    })
    return { ...section, items }
  })
  return linked ? { ...event, sections } : null
}

const COURSE_FILLER = new Set(['מנה', 'מנות'])
const STEM_LENGTH = 4

function courseStem(text: string): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w && !COURSE_FILLER.has(w))
  return (words[0] ?? '').slice(0, STEM_LENGTH)
}

/**
 * Plan 614: the course (dish type) a menu section name stands for, or '' when none fits. A section is free text
 * ("ראשונות"), a course is a registry key with a label ("מנה ראשונה"): they match on the first 4 letters of the
 * first word, ignoring "מנה" / "מנות".
 */
export function courseKeyForSection(sectionName: string, courses: { key: string; label: string }[]): string {
  const wanted = courseStem(sectionName)
  if (wanted.length < 3) return ''
  return courses.find((c) => courseStem(c.label) === wanted || courseStem(c.key) === wanted)?.key ?? ''
}

const PLACEHOLDER_MENU_NAMES = new Set([
  'אירוע',
  'אירוע חדש',
  'תפריט',
  'תפריט חדש',
  'תפריט לאירוע',
  'event',
  'new event',
  'menu'
])

/**
 * Plan 614: the AI fills the menu name even when the chef gave none and falls back to a generic word ("אירוע").
 * That is not a name: the menu then gets the date, like any menu without a name. Returns the AI name, or '' for none.
 */
export function aiMenuNameOrEmpty(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  return PLACEHOLDER_MENU_NAMES.has(trimmed.toLowerCase()) ? '' : trimmed
}
