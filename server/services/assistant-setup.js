'use strict';
/**
 * Plan 756: what the assistant page shows about how the assistant is set up — the engine's fixed numbers, read from the
 * constants the turn itself uses, and this business's own values. Read-only; logs carry no profile value.
 */
const { QUIET_MS, MAX_WAIT_MS } = require('./inbound');
const { FRONTDESK_DAILY_TURNS } = require('./frontdesk-turn');
const { TURN_LIMIT, FOLLOW_UP_MAX } = require('./frontdesk-guardrails');
const { HISTORY_WINDOW, GLUE_MAX } = require('./frontdesk-prompt');
const { MAX_FACTS_CHARS } = require('./knowledge');
const { FIRST_MODEL_LIMIT_MS, TURN_BUDGET_MS } = require('../routes/ai/frontdesk');
const { tablesFor } = require('./frontdesk-tables');
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service');
const { modelChain } = require('./gemini-client');

const PROFILE_FIELDS = ['displayName', 'phone', 'address', 'serviceArea'];

const filled = value => typeof value === 'string' && value.length > 0;
const hasRows = value => Array.isArray(value) && value.length > 0;

const engineNumbers = () => ({
  quietMs: QUIET_MS,
  maxWaitMs: MAX_WAIT_MS,
  dailyTurns: FRONTDESK_DAILY_TURNS,
  turnLimit: TURN_LIMIT,
  followUpMax: FOLLOW_UP_MAX,
  historyWindow: HISTORY_WINDOW,
  glueMax: GLUE_MAX,
  factsMaxChars: MAX_FACTS_CHARS,
  firstModelMs: FIRST_MODEL_LIMIT_MS,
  turnBudgetMs: TURN_BUDGET_MS,
});

/** This business's own values, as the turn reads them; `null` when it has no front desk profile. */
async function businessSetup(db, businessId) {
  const profile = await db.collection('frontDeskProfiles').findOne({ businessId });
  if (!profile) return null;
  const items = db.collection('knowledgeItems');
  const approved = { businessId, status: 'approved', deletedAt: { $exists: false } };
  const [knowledgeApproved, knowledgePublic, tables] = await Promise.all([
    items.countDocuments(approved),
    items.countDocuments({ ...approved, visibility: 'public' }),
    tablesFor(db, businessId),
  ]);
  const assistant = profile.assistant ?? {};
  return {
    level: assistant.level ?? 0,
    status: profile.status ?? 'draft',
    tone: assistant.tone === 'formal' ? 'formal' : 'warm',
    handoffTextSet: filled(assistant.handoffText?.trim()),
    activeHoursSet: hasRows(assistant.activeHours),
    hoursSet: hasRows(profile.hours),
    profileFieldsFilled: PROFILE_FIELDS.filter(name => filled(profile[name])).length,
    profileFieldsTotal: PROFILE_FIELDS.length,
    kindsOn: Object.values(profile.requestKinds ?? {}).filter(kind => kind?.enabled === true).length,
    knowledgeApproved,
    knowledgePublic,
    tablesOn: !!tables,
    confirmMode: tableServiceOf(profile).confirmMode,
  };
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} businessId
 * @param {{ admin?: boolean }} [ask] `admin`: the platform admin also gets the model order
 * @returns {Promise<{ engine: object, business: object | null, models?: string[] }>}
 */
async function assistantSetup(db, businessId, { admin = false } = {}) {
  const out = { engine: engineNumbers(), business: await businessSetup(db, businessId) };
  if (admin) out.models = [...modelChain()];
  return out;
}

module.exports = { assistantSetup };
