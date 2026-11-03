import { CLIENT_TYPES } from '@schemas/entities'

/** Plan 514: who an event is for. Mirror of shared/schemas/entities/client.schema.ts. */
export { CLIENT_TYPES }

export type ClientType = (typeof CLIENT_TYPES)[number]

/**
 * Client view of a client record. Owner-only to write; staff receive only `name` and `phone`
 * (plus the base fields), so every other field is optional here.
 */
export interface Client {
  _id: string
  name: string
  phone: string
  /** Digits of `phone`; the server derives it on every write. Staff do not receive it. */
  phoneNormalized?: string
  clientType?: ClientType
  companyName?: string
  email?: string
  notes?: string
  source?: string
  businessId?: string
  createdBy?: string
  createdAt?: number
  updatedAt?: number
}
