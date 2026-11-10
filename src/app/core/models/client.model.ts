import { CLIENT_KINDS, CLIENT_LIFECYCLES, CLIENT_TYPES, RESERVED_CLIENT_TAGS } from '@schemas/entities'

/** Plan 514: who an event is for. Mirror of shared/schemas/entities/client.schema.ts. */
export { CLIENT_TYPES, CLIENT_KINDS, CLIENT_LIFECYCLES, RESERVED_CLIENT_TAGS }

export type ClientType = (typeof CLIENT_TYPES)[number]
/** Plan 544: what a client is to the business (diner, event client, lead). */
export type ClientKind = (typeof CLIENT_KINDS)[number]
export type ClientLifecycle = (typeof CLIENT_LIFECYCLES)[number]

/** Plan 544: per-client counts the server keeps; each one may be missing. */
export interface ClientCounters {
  requests?: number
  bookings?: number
  events?: number
  noShows?: number
  conversations?: number
}

/**
 * Client view of a client record. Owner-only to write; staff receive only `name`, `phone`, `tags` and `kinds`
 * (plus the base fields), so every other field is optional here. A deleted client goes to Trash (plan 544).
 * The server alone writes `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`,
 * `counters`, `waId`, `mergedInto` and `doNotContact`.
 */
export interface Client {
  _id: string
  name: string
  phone: string
  /** Digits of `phone`; the server derives it on every write. Staff do not receive it. */
  phoneNormalized?: string
  /** Match key (last 9 digits of `phoneNormalized`); server-derived. Staff do not receive it. */
  phoneKey?: string
  clientType?: ClientType
  companyName?: string
  email?: string
  notes?: string
  source?: string
  kinds?: ClientKind[]
  tags?: string[]
  lifecycle?: ClientLifecycle
  firstSeenAt?: number
  lastContactAt?: number
  counters?: ClientCounters
  consent?: { terms?: number; marketing?: { given: boolean; at: number; via: string } }
  language?: 'he' | 'en' | 'ar' | 'ru'
  waId?: string
  mergedInto?: string
  doNotContact?: { at: number; reason: string; via: 'guest' | 'member' }
  businessId?: string
  createdBy?: string
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}
