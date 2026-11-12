import type { BusinessType, FrontDeskRequestKind } from '@schemas/entities/front-desk-profile.schema'
import type { KnowledgeTopic } from '@schemas/entities/knowledge-item.schema'
import type { FrontDeskIntake } from '@schemas/front-desk-intake.schema'
import {
  BASELINE_FRONTDESK_FIELDS,
  BASELINE_KITCHEN_FIELDS,
  BASELINE_CARD_FIELDS,
  type BaselineInput
} from '@schemas/entities/business.schema'

/** Plan 556: one form field that is saved as a knowledge item; its question is the dictionary key `onboarding_q_<key>`. */
export interface ItemField {
  key: string
  topic: KnowledgeTopic
  visibility: 'public' | 'internal'
  /** A long answer: shown as a textarea. */
  long?: boolean
}

const item = (
  key: string,
  topic: KnowledgeTopic,
  visibility: 'public' | 'internal' = 'public',
  long = true
): ItemField => ({
  key,
  topic,
  visibility,
  long
})

export const FAQ_ROWS = 15
export const FAQ_TOPICS: readonly KnowledgeTopic[] = [
  'faq',
  'hours',
  'location',
  'menu',
  'prices',
  'policy',
  'dietary',
  'events',
  'other'
]

export const BASICS_PROFILE_FIELDS = ['logo_url', 'phone', 'address', 'service_area'] as const
export const BASICS_ITEMS: ItemField[] = [item('whatsapp_today', 'other', 'internal', false)]
export const HOURS_ITEMS: ItemField[] = [item('holidays_policy', 'policy')]
/** Three questions saved as ONE internal item (the question is the first key's). */
export const CHANNEL_KEYS = ['who_answers', 'channels_today', 'answer_hours'] as const
export const POLICY_ITEMS: ItemField[] = [
  ...['cancellation', 'deposits', 'minimum_order', 'accessibility', 'parking', 'children', 'pets'].map((k) =>
    item(k, 'policy')
  ),
  item('kashrut', 'dietary'),
  item('allergens', 'dietary')
]
export const TONE_ITEMS: ItemField[] = [
  item('never_say', 'other', 'internal'),
  item('handoff_when', 'other', 'internal')
]
/** Two questions saved as ONE internal item (the question is the first key's). */
export const APPROVAL_KEYS = ['approver', 'alert_phone'] as const

/** The knowledge items each business type's own section asks for. */
export const TYPE_ITEMS: Record<BusinessType, ItemField[]> = {
  restaurant: [
    item('seating', 'other', 'public', false),
    item('menu_link', 'menu', 'public', false),
    item('price_range', 'prices', 'public', false),
    item('busy_hours', 'other', 'internal'),
    item('quiet_hours', 'other', 'internal'),
    item('booking_today', 'other', 'internal')
  ],
  private_chef: [
    item('services', 'events'),
    item('equipment_on_site', 'events'),
    item('price_per_guest', 'prices'),
    item('price_includes', 'prices'),
    item('travel_fee', 'prices'),
    item('sample_menus', 'menu'),
    item('payment_terms', 'policy')
  ],
  catering: [
    item('serving_styles', 'events'),
    item('tasting_policy', 'events'),
    item('staff_equipment', 'events'),
    item('price_by_style', 'prices'),
    item('delivery_fees', 'prices'),
    item('payment_deposit', 'policy')
  ],
  other: []
}

/** Number fields of a type's section (everything else in a section is text). */
export const TYPE_NUMBER_FIELDS: Record<BusinessType, string[]> = {
  restaurant: ['max_party_no_call', 'sitting_minutes'],
  private_chef: ['min_guests', 'max_guests', 'min_budget_per_guest', 'lead_hours'],
  catering: ['min_guests', 'lead_days'],
  other: []
}
export const TYPE_TEXT_FIELDS: Record<BusinessType, string[]> = {
  restaurant: [],
  private_chef: ['travel_areas'],
  catering: ['areas'],
  other: []
}
export const TYPE_FLAGS: Record<BusinessType, string[]> = {
  restaurant: [],
  private_chef: ['consultation_enabled'],
  catering: ['tasting_enabled'],
  other: []
}

/** Every key the form keeps as a plain control (text / number / flag). */
export const ALL_ITEM_FIELDS: ItemField[] = [
  ...BASICS_ITEMS,
  ...HOURS_ITEMS,
  ...POLICY_ITEMS,
  ...TONE_ITEMS,
  ...Object.values(TYPE_ITEMS).flat()
]
export const ALL_TEXT_KEYS: string[] = [
  'display_name',
  'slug',
  ...BASICS_PROFILE_FIELDS,
  ...CHANNEL_KEYS,
  ...APPROVAL_KEYS,
  'greeting',
  'handoff_text',
  ...ALL_ITEM_FIELDS.map((f) => f.key),
  ...Object.values(TYPE_TEXT_FIELDS).flat()
]
export const ALL_NUMBER_KEYS: string[] = [...new Set(Object.values(TYPE_NUMBER_FIELDS).flat())]
export const ALL_FLAG_KEYS: string[] = [...new Set(Object.values(TYPE_FLAGS).flat())]
export const BASELINE_KEYS: (keyof BaselineInput)[] = [
  ...BASELINE_CARD_FIELDS,
  ...BASELINE_KITCHEN_FIELDS,
  ...BASELINE_FRONTDESK_FIELDS
]
/** The dictionary key of each baseline field's label (plans 431 and 567). */
export const BASELINE_LABELS: Record<string, string> = {
  inquiriesPerMonth: 'baseline_inquiries_per_month',
  eventsClosedPerMonth: 'baseline_events_closed_per_month',
  avgRevenuePerEvent: 'baseline_avg_revenue_per_event',
  estProfitPct: 'baseline_est_profit_pct',
  foodCostPct: 'baseline_food_cost_pct',
  hoursPerWeekOrdering: 'baseline_hours_per_week_ordering',
  hoursPerWeekQuotes: 'baseline_hours_per_week_quotes',
  wastePct: 'baseline_waste_pct',
  supplierOverrunPct: 'baseline_supplier_overrun_pct',
  phoneInquiriesPerDay: 'baseline_phone_inquiries_per_day',
  messagesPerDay: 'baseline_messages_per_day',
  avgResponseMinutes: 'baseline_avg_response_minutes',
  hostHoursPerWeek: 'baseline_host_hours_per_week',
  noShowsPerWeek: 'baseline_no_shows_per_week',
  missedInquiriesPerWeek: 'baseline_missed_inquiries_per_week'
}

export interface FaqRow {
  question: string
  answer: string
  topic: KnowledgeTopic
}

/** What the page hands to `buildIntake`: the form's values, the rows kept outside the form, the chosen type. */
export interface IntakeState {
  type: BusinessType
  values: Record<string, unknown>
  hours: { days: string; time: string; dayIndexes?: number[]; open?: string; close?: string }[]
  closedDates: string[]
  eventTypes: string[]
  faq: FaqRow[]
  baseline: Record<string, unknown>
  tone: 'warm' | 'formal'
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())
/** A finite number, or undefined for an empty / invalid box. */
export function toNumber(v: unknown): number | undefined {
  if (v === '' || v == null) return undefined
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : undefined
}
const list = (v: unknown): string[] =>
  text(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30)

/** One-line `label: value` text of a group of fields saved as a single item; '' when none is filled. */
function joined(keys: readonly string[], values: Record<string, unknown>, translate: (key: string) => string): string {
  return keys
    .filter((k) => text(values[k]))
    .map((k) => `${translate('onboarding_q_' + k)}: ${text(values[k])}`)
    .join('\n')
}

type KindChange = NonNullable<NonNullable<FrontDeskIntake['profile']['requestKinds']>[FrontDeskRequestKind]>
type Rules = NonNullable<KindChange['rules']>

function pruned<T extends object>(obj: T): T | undefined {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined)
  return entries.length ? (Object.fromEntries(entries) as T) : undefined
}

/** The request kinds' changes of the chosen type (only what was filled). */
function kindsOf(s: IntakeState): FrontDeskIntake['profile']['requestKinds'] {
  const v = s.values
  const num = (k: string) => toNumber(v[k])
  const out: Partial<Record<FrontDeskRequestKind, KindChange>> = {}
  if (s.type === 'restaurant') {
    const rules = pruned<Rules>({ maxPartySize: num('max_party_no_call') })
    const change = pruned<KindChange>({ rules, defaultDurationMinutes: num('sitting_minutes') })
    if (change) out.table = change
  } else if (s.type === 'private_chef') {
    out.consultation = { enabled: v['consultation_enabled'] === true }
    const rules = pruned<Rules>({
      minPartySize: num('min_guests'),
      maxPartySize: num('max_guests'),
      minBudgetPerGuest: num('min_budget_per_guest'),
      minLeadHours: num('lead_hours'),
      areas: list(v['travel_areas']).length ? list(v['travel_areas']) : undefined
    })
    if (rules) out.event = { rules }
  } else if (s.type === 'catering') {
    const days = num('lead_days')
    const rules = pruned<Rules>({
      minPartySize: num('min_guests'),
      minLeadHours: days === undefined ? undefined : Math.round(days * 24),
      areas: list(v['areas']).length ? list(v['areas']) : undefined
    })
    const change = pruned<KindChange>({ rules, eventTypeOptions: s.eventTypes.length ? s.eventTypes : undefined })
    if (change) out.event = change
    out.tasting = { enabled: v['tasting_enabled'] === true }
  }
  return Object.keys(out).length ? out : undefined
}

/** Plan 556: the one request body of the onboarding form. Empty fields write nothing. */
export function buildIntake(s: IntakeState, translate: (key: string) => string): FrontDeskIntake {
  const v = s.values
  const knowledge: FrontDeskIntake['knowledge'] = []
  const push = (topic: KnowledgeTopic, question: string, answer: string, visibility: 'public' | 'internal') => {
    if (answer) knowledge.push({ topic, question, answer: answer.slice(0, 1200), visibility })
  }
  const fields = [...BASICS_ITEMS, ...HOURS_ITEMS, ...POLICY_ITEMS, ...TONE_ITEMS, ...TYPE_ITEMS[s.type]]
  for (const f of fields) push(f.topic, translate('onboarding_q_' + f.key), text(v[f.key]), f.visibility)
  push('other', translate('onboarding_q_' + CHANNEL_KEYS[0]), joined(CHANNEL_KEYS, v, translate), 'internal')
  push('other', translate('onboarding_q_' + APPROVAL_KEYS[0]), joined(APPROVAL_KEYS, v, translate), 'internal')
  for (const row of s.faq) push(row.topic, text(row.question).slice(0, 200), text(row.answer), 'public')

  const serviceArea = text(v['service_area']) || (s.type === 'private_chef' ? text(v['travel_areas']) : '')
  const greeting = text(v['greeting'])
  const handoffText = text(v['handoff_text'])
  const profile: FrontDeskIntake['profile'] = {
    ...(text(v['display_name']) && { displayName: text(v['display_name']) }),
    ...(text(v['slug']) && { slug: text(v['slug']) }),
    ...(text(v['logo_url']) && { logoUrl: text(v['logo_url']) }),
    ...(text(v['phone']) && { phone: text(v['phone']) }),
    ...(text(v['address']) && { address: text(v['address']) }),
    ...(serviceArea && { serviceArea }),
    ...(s.hours.length && { hours: s.hours }),
    ...(s.closedDates.length && { closedDates: s.closedDates }),
    assistant: { tone: s.tone, ...(greeting && { greeting }), ...(handoffText && { handoffText }) },
    ...(kindsOf(s) && { requestKinds: kindsOf(s) })
  }
  const baseline = Object.fromEntries(
    Object.entries(s.baseline).flatMap(([k, val]) => {
      const n = toNumber(val)
      return n === undefined ? [] : [[k, n]]
    })
  )
  return {
    businessType: s.type,
    profile,
    knowledge,
    ...(Object.keys(baseline).length && { baseline })
  }
}
