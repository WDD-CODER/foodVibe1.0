/** Plan 764 (C-SETTINGS, map E9): the one rule for which design a menu wears, so the editor and the PDF agree. */
import type { MenuDesignDraft } from '../entities/menu-design.schema'
import { baseDesign } from './menu-base-templates'

export interface ResolvableDesign {
  _id: string
  createdAt: number
  deletedAt?: number
}

/**
 * The menu's own live design, else the business default, else the first live design by `createdAt`, else the
 * `classic` base template. `designs` are the designs of the menu's business.
 */
export function resolveMenuDesign<T extends ResolvableDesign>(
  menu: { designId?: string } | null | undefined,
  designs: readonly T[],
  business: { menuDesign?: { defaultDesignId?: string } } | null | undefined
): T | MenuDesignDraft {
  const live = designs.filter(design => design.deletedAt === undefined)
  const byId = (id: string | undefined): T | undefined => (id ? live.find(design => design._id === id) : undefined)
  const oldest = [...live].sort((a, b) => a.createdAt - b.createdAt)[0]
  return byId(menu?.designId) ?? byId(business?.menuDesign?.defaultDesignId) ?? oldest ?? baseDesign('classic')
}
