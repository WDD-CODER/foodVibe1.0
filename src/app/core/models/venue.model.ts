export type EnvironmentType = 'professional_kitchen' | 'outdoor_field' | 'client_home' | 'popup_venue'

export interface VenueInfraItem {
  equipment_id_: string
  available_quantity_: number
}

/** One schedule block, e.g. { days_: 'א׳-ה׳', time_: '08:00–23:00' } — a venue can have
 * more than one (weekday vs weekend), matching UI refactor/VenueDetail.dc.html. */
export interface VenueOperatingHours {
  days_: string
  time_: string
}

export interface VenueProfile {
  _id: string
  name_hebrew: string
  environment_type_: EnvironmentType
  available_infrastructure_: VenueInfraItem[]
  notes_?: string
  created_at_: string
  /** Plan 305 ACTION-LIST H — new data concept, no old-app equivalent. */
  address_?: string
  capacity_?: number
  contact_name_?: string
  contact_phone_?: string
  operating_hours_?: VenueOperatingHours[]
  /** design-port session 6 — matches Venues.dc.html/VenueDetail.dc.html's active/inactive pill. */
  active_?: boolean
  /** design-port session 6 — Cloudinary-hosted URL, same pattern as recipe.model.ts's imageUrl_. */
  photo_url_?: string
}
