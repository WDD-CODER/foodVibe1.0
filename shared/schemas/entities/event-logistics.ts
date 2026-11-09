/** Plan 518: the event-logistics vocabulary, shared by client and server (checklist items and the event's answers). */

export const LOGISTICS_PHASES = ['intake', 'site_visit'] as const
export const LOGISTICS_SECTIONS = ['infrastructure', 'space', 'service', 'rentals', 'access', 'staff', 'weather', 'food', 'other'] as const
export const LOGISTICS_ANSWER_TYPES = ['status', 'quantity', 'text'] as const
export const LOGISTICS_ANSWER_STATUSES = ['unchecked', 'needed', 'not_needed', 'client_provides'] as const
export const LOGISTICS_PAYERS = ['client', 'quoted', 'chef'] as const
export const LOGISTICS_TEXT_MAX = 500
export const LOGISTICS_LABEL_MAX = 120
export const LOGISTICS_ANSWERS_MAX = 300

export type LogisticsPhase = (typeof LOGISTICS_PHASES)[number]
export type LogisticsSection = (typeof LOGISTICS_SECTIONS)[number]
export type LogisticsAnswerType = (typeof LOGISTICS_ANSWER_TYPES)[number]
export type LogisticsAnswerStatus = (typeof LOGISTICS_ANSWER_STATUSES)[number]
export type LogisticsPayer = (typeof LOGISTICS_PAYERS)[number]
