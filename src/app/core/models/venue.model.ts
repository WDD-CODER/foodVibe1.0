export type EnvironmentType = 'professional_kitchen' | 'outdoor_field' | 'client_home' | 'popup_venue'

export interface VenueInfraItem {
  equipmentId: string
  availableQuantity: number
}

/** One schedule block, e.g. { days: 'א׳-ה׳', time: '08:00–23:00' } — a venue can have
 * more than one (weekday vs weekend), matching UI refactor/VenueDetail.dc.html. */
export interface VenueOperatingHours {
  days: string
  time: string
  /** Plan 372: structured form of the row — Sunday = 0 … Saturday = 6; `days` / `time` are generated from these. */
  dayIndexes?: number[]
  /** Plan 372: `HH:MM`. */
  open?: string
  close?: string
}

/** Plan 372: one contact person at a venue. */
export interface VenueContact {
  name: string
  phone?: string
  role?: string
}

export interface VenueProfile {
  _id: string
  nameHebrew: string
  environmentType: EnvironmentType
  availableInfrastructure: VenueInfraItem[]
  notes?: string
  createdAt: number
  /** Plan 305 ACTION-LIST H — new data concept, no old-app equivalent. */
  address?: string
  capacity?: number
  contactName?: string
  contactPhone?: string
  /** Plan 372: replaces contactName / contactPhone, which stay in the schema but are no longer read or written. */
  contacts?: VenueContact[]
  operatingHours?: VenueOperatingHours[]
  /** design-port session 6 — matches Venues.dc.html/VenueDetail.dc.html's active/inactive pill. */
  active?: boolean
  /** design-port session 6 — Cloudinary-hosted URL, same pattern as recipe.model.ts's imageUrl. */
  photoUrl?: string
}
