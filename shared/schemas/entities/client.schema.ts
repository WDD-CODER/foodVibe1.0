import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'

export const CLIENT_TYPES = ['private', 'business', 'production_company'] as const

export const clientTypeSchema = z.enum(CLIENT_TYPES)

/** Plan 544 (C-CONTACT): what a client is to the business; a client may be several at once. */
export const CLIENT_KINDS = ['diner', 'event_client', 'lead'] as const

/** Plan 544: tags with a meaning later plans act on (no special handling yet). */
export const RESERVED_CLIENT_TAGS = ['vip', 'allergy', 'repeat_no_show'] as const

/** Plan 544: a client's lifecycle stage (the field only; no plan writes it yet). */
export const CLIENT_LIFECYCLES = ['new', 'active', 'dormant'] as const

/** Plan 544: the canonical `source` keys the server writes (`source` itself stays free text). */
export const CLIENT_SOURCES = ['manual', 'public_form', 'whatsapp', 'event_migration'] as const

/** Plan 544: fields only the server writes; the generic data API drops them from every client write. */
export const CLIENT_SERVER_FIELDS = [
  'phoneNormalized',
  'phoneKey',
  'kinds',
  'lifecycle',
  'firstSeenAt',
  'lastContactAt',
  'counters',
  'waId',
  'mergedInto',
  'doNotContact',
  'liveKey'
] as const

const counterField = z.number().int().min(0).optional()

/**
 * A client: who the events, requests and bookings are for (ADR 0027, ADR 0031). Owner-only to write; staff read only
 * `name`, `phone`, `tags` and `kinds` (STAFF_READ_FIELDS). A delete is soft (Trash). Carries no clone-lineage fields
 * (`_masterId`, `_userModified`). The `CLIENT_SERVER_FIELDS` are written by the server alone.
 */
export const clientSchema = z.strictObject({
  ...baseDocShape,
  name: nameField,
  phone: z.string().min(7).max(30).regex(/^[0-9+\-\s()]{7,20}$/),
  /** Digits of `phone`; the server derives it on every write, a client-sent value is ignored. */
  phoneNormalized: z.string().max(30),
  /** Match key (R-01): last 9 digits of `phoneNormalized`; server-derived on every write. */
  phoneKey: z.string().max(30).optional(),
  /** Plan 545: server-only; equals `phoneKey` while the client is live and unmerged (unique per business), absent otherwise. */
  liveKey: z.string().max(30).optional(),
  clientType: clientTypeSchema.default('private'),
  companyName: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
  kinds: z.array(z.enum(CLIENT_KINDS)).max(3).optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  lifecycle: z.enum(CLIENT_LIFECYCLES).optional(),
  firstSeenAt: z.number().optional(),
  lastContactAt: z.number().optional(),
  /** Each counter is optional so the server can set one at a time. */
  counters: z
    .strictObject({
      requests: counterField,
      bookings: counterField,
      events: counterField,
      noShows: counterField,
      conversations: counterField
    })
    .optional(),
  consent: z
    .strictObject({
      terms: z.number().optional(),
      marketing: z.strictObject({ given: z.boolean(), at: z.number(), via: z.string().max(40) }).optional()
    })
    .optional(),
  language: z.enum(['he', 'en', 'ar', 'ru']).optional(),
  waId: z.string().max(30).optional(),
  mergedInto: z.string().optional(),
  /** R-02: server-owned; set only by the dedicated clients route or the assistant's removal intent. */
  doNotContact: z
    .strictObject({ at: z.number(), reason: z.string().max(200), via: z.enum(['guest', 'member']) })
    .optional()
})
