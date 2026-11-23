'use strict';
/**
 * Plan 681: the shape of one eval dialogue of the assistant (`server/eval/frontdesk/dialogues/NN-<slug>.json`).
 * Strict: an unknown key is an error, so a typo in a file fails `--dry` and the test, never the scoring.
 * A dialogue names its own clock, facts, rules and existing bookings; none depends on another having run.
 */
const { z } = require('zod');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WALL = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

const BUSINESS_TYPES = ['restaurant', 'catering', 'private_chef'];
const SERVER_ACTIONS = ['none', 'offer', 'alternatives', 'booking', 'request', 'changed', 'cancelled', 'handoff'];
/** A button the guest taps: its prefix and, for a numbered one, its position in the last outbound message. */
const BUTTON = /^(OK|OTHER|ALT:[1-3]|BK:[1-3])$/;

const factSchema = z.strictObject({
  topic: z.enum(['hours', 'location', 'menu', 'prices', 'policy', 'dietary', 'events', 'faq', 'other']),
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(1000),
});

const bookingSchema = z.strictObject({
  date: z.string().regex(DATE),
  time: z.string().regex(TIME),
  partySize: z.number().int().min(1).max(60),
  /** At most four tables, as a booking holds (C-BOOK). */
  tableNumbers: z.array(z.number().int().min(1).max(14)).min(1).max(4).optional(),
  ofGuest: z.literal(true).optional(),
});

const setupSchema = z.strictObject({
  modules: z.array(z.enum(['frontdesk', 'tables'])).min(1),
  confirmMode: z.enum(['auto', 'manual']).optional(),
  autoMaxParty: z.number().int().min(1).max(30).optional(),
  level: z.union([z.literal(0), z.literal(1)]),
  now: z.string().regex(WALL),
  facts: z.array(factSchema).max(10).optional(),
  floor: z.enum(['room14', 'none']).optional(),
  bookings: z.array(bookingSchema).max(10).optional(),
  /** Dates the business is closed (the profile's `closedDates`). */
  closedDates: z.array(z.string().regex(DATE)).max(5).optional(),
  /** Rules laid over the template's rules, per request kind (e.g. `{ event: { minBudgetPerGuest: 200 } }`). */
  rules: z.record(z.string(), z.record(z.string(), z.number())).optional(),
});

const turnSchema = z
  .strictObject({
    guest: z.string().min(1).max(500).optional(),
    button: z.string().regex(BUTTON).optional(),
    /** The model answer the scripted run returns for this turn (C-AI / C-AI2 answer schema). */
    script: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(t => (t.guest === undefined) !== (t.button === undefined), { message: 'a turn has guest or button, never both' })
  .refine(t => !(t.button && t.script), { message: 'a button turn never reaches the model' });

const expectedSchema = z.strictObject({
  intent: z.string().min(1),
  collected: z.record(z.string(), z.unknown()).optional(),
  serverAction: z.enum(SERVER_ACTIONS),
  handoff: z.boolean(),
  booking: z.strictObject({ date: z.string().regex(DATE), time: z.string().regex(TIME), partySize: z.number().int() }).optional(),
  lastOut: z
    .strictObject({
      kind: z.enum(['text', 'template', 'button']),
      template: z.string().optional(),
      buttons: z.number().int().min(0).max(3).optional(),
    })
    .optional(),
  /** Level 0: a suggestion is stored on the conversation and nothing is sent. */
  suggestion: z.literal(true).optional(),
});

const evalDialogueSchema = z.strictObject({
  id: z.string().regex(/^\d{2}$/),
  title: z.string().min(1).max(120).refine(t => !/[\r\n]/.test(t), { message: 'one line' }),
  businessType: z.enum(BUSINESS_TYPES),
  tags: z.array(z.string().min(1)).min(1),
  setup: setupSchema,
  turns: z.array(turnSchema).min(1).max(12),
  expected: expectedSchema,
});

module.exports = { evalDialogueSchema, BUSINESS_TYPES, SERVER_ACTIONS };
