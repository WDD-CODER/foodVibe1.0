import type { BusinessType, FrontDeskQuestion, RequestKindConfig } from './entities/front-desk-profile.schema'

/** Plan 548: a question whose key is listed here fills that `wanted` field; any other question goes to `answers`. */
export const WANTED_QUESTION_KEYS = {
  date: 'date',
  time: 'time',
  party_size: 'partySize',
  event_type: 'eventTypeKey',
  budget_per_guest: 'budgetPerGuest',
  location: 'location'
} as const

type Kinds = Record<string, RequestKindConfig>

/** The starting body of a profile (no `slug`, `displayName` or base fields). */
export interface FrontDeskTemplate {
  businessType: BusinessType
  hours: []
  requestKinds: Kinds
  assistant: { level: 0; tone: 'warm' }
  status: 'draft'
}

const q = (
  key: string,
  label: string,
  type: FrontDeskQuestion['type'],
  required = false,
  options?: string[]
): FrontDeskQuestion => ({ key, label, type, required, ...(options && { options }) })

const dateQ = (required = true) => q('date', 'fd_q_date', 'date', required)
const timeQ = (required = true) => q('time', 'fd_q_time', 'time', required)

const consultation = (): RequestKindConfig => ({
  enabled: true,
  questions: [dateQ(), timeQ(), q('topic', 'fd_q_topic', 'text')],
  rules: { minLeadHours: 24, maxLeadDays: 90 },
  defaultDurationMinutes: 30,
  expireAfterHours: 24
})

function kindsFor(type: BusinessType): Kinds {
  switch (type) {
    case 'restaurant':
      return {
        table: {
          enabled: true,
          questions: [
            dateQ(),
            timeQ(),
            q('party_size', 'fd_q_party_size', 'number', true),
            q('seating', 'fd_q_seating', 'choice', false, ['fd_opt_inside', 'fd_opt_outside', 'fd_opt_bar']),
            q('occasion', 'fd_q_occasion', 'text')
          ],
          rules: { maxPartySize: 12, minLeadHours: 2, maxLeadDays: 60 },
          defaultDurationMinutes: 120,
          expireAfterHours: 4
        }
      }
    case 'private_chef':
      return {
        consultation: consultation(),
        event: {
          enabled: true,
          questions: [
            dateQ(),
            q('party_size', 'fd_q_guests', 'number', true),
            q('location', 'fd_q_location', 'text', true),
            q('kitchen_on_site', 'fd_q_kitchen_on_site', 'choice', false, ['fd_opt_yes', 'fd_opt_no']),
            q('dietary', 'fd_q_dietary', 'text'),
            q('budget_per_guest', 'fd_q_budget_per_guest', 'number')
          ],
          rules: { minPartySize: 2, maxPartySize: 40, minLeadHours: 72, maxLeadDays: 365 },
          expireAfterHours: 48
        }
      }
    case 'catering':
      return {
        event: {
          enabled: true,
          questions: [
            dateQ(),
            q('party_size', 'fd_q_guests', 'number', true),
            q('event_type', 'fd_q_event_type', 'choice', true, []),
            q('location', 'fd_q_venue', 'text'),
            q('serving_style', 'fd_q_serving_style', 'choice', false, ['fd_opt_buffet', 'fd_opt_plated', 'fd_opt_cocktail']),
            q('budget_per_guest', 'fd_q_budget_per_guest', 'number')
          ],
          rules: { minPartySize: 30, minLeadHours: 336, maxLeadDays: 540 },
          expireAfterHours: 72
        },
        tasting: {
          enabled: true,
          questions: [dateQ(), timeQ(), q('party_size', 'fd_q_people', 'number', true)],
          rules: { maxPartySize: 6, minLeadHours: 48, maxLeadDays: 120 },
          defaultDurationMinutes: 60,
          expireAfterHours: 48
        }
      }
    case 'other':
      return { consultation: consultation() }
  }
}

/** A fresh profile body for a business type; the caller adds `slug` and `displayName`. */
export function templateFor(businessType: BusinessType): FrontDeskTemplate {
  return {
    businessType,
    hours: [],
    requestKinds: kindsFor(businessType),
    assistant: { level: 0, tone: 'warm' },
    status: 'draft'
  }
}
