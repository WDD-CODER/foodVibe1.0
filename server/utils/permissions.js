'use strict'
/**
 * Plan 427 (contract C-PERM): the one place that decides what an owner or a staff member may do.
 * Generic write routes call `assertCan` before every write; later plans (428, 429, 442, 445, 446) call it
 * for their own actions instead of inventing role checks. Deny by default.
 */

const { MONEY_FIELDS } = require('../generated/schemas/money-fields')
const { MASTER_BUSINESS_ID } = require('./business-scope')

const ACTIONS = [
  'create', 'edit', 'delete', 'editMoney', 'changeStage',
  'addNote', 'markArrival', 'manageTeam', 'editSettings', 'editTaxonomy',
]
const OWNER_ONLY_ACTIONS = new Set(['editMoney', 'manageTeam', 'editSettings', 'editTaxonomy'])
const EVENTS = 'menuEvents'

/** Taxonomy kinds only an owner may add, change or delete. */
const LOCKED_TAXONOMY_KINDS = ['eventType', 'menuType', 'station']
/** Written by the app on every member's behalf (history, activity, translation keys): not checked per creator. */
const SYSTEM_TYPES = ['VERSION_HISTORY', 'activity_log', 'DICTIONARY_OVERRIDES']

const deny = reason => ({ ok: false, reason })
const OK = Object.freeze({ ok: true })

/**
 * @param {{ userId?: string, businessId?: string, businessRole?: string, isPlatformAdmin?: boolean }} user
 * @param {string} action one of ACTIONS
 * @param {{ type?: string, doc?: object, patch?: object }} [ctx]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function can(user, action, ctx = {}) {
  if (!ACTIONS.includes(action)) return deny('UNKNOWN_ACTION')
  const { type, doc } = ctx
  if (doc) {
    if (doc.businessId === MASTER_BUSINESS_ID) return user?.isPlatformAdmin === true ? OK : deny('MASTER_ONLY')
    if (!user?.businessId || doc.businessId !== user.businessId) return deny('OTHER_BUSINESS')
  }
  if (user?.businessRole === 'owner') return OK
  if (user?.businessRole !== 'staff') return deny('NO_ROLE')

  if (OWNER_ONLY_ACTIONS.has(action)) return deny('OWNER_ONLY')
  if (action === 'create') return OK
  const isCreator = !!doc && !!user.userId && doc.createdBy === user.userId
  if (action === 'edit' || action === 'delete') return isCreator ? OK : deny('NOT_CREATOR')
  // Event actions: only on events.
  if (type !== undefined && type !== EVENTS) return deny('NOT_AN_EVENT')
  if (action === 'changeStage') return isCreator ? OK : deny('NOT_CREATOR')
  return OK // addNote, markArrival: any event of his business
}

/** Sends the 403 and logs when `can` says no. Returns true when the caller may go on. */
function assertCan(req, res, action, ctx = {}) {
  const result = can(req.user, action, ctx)
  if (result.ok) return true
  req.log?.warn({ event: 'permission.denied', action, type: ctx.type, reason: result.reason })
  res.status(403).json({ error: 'FORBIDDEN', messageKey: 'no_permission' })
  return false
}

/** Parses `a.b[].c` into [{ key, list }]. */
const parsePath = path => path.split('.').map(seg => ({ key: seg.replace(/\[\]$/, ''), list: seg.endsWith('[]') }))

/** The nodes reached by walking `steps` from `root` (arrays of `[]` steps are flattened). */
function walk(root, steps) {
  let nodes = [root]
  for (const { key, list } of steps) {
    const next = []
    for (const node of nodes) {
      if (node === null || typeof node !== 'object') continue
      const value = node[key]
      if (value === undefined) continue
      if (list) {
        if (Array.isArray(value)) next.push(...value)
      } else {
        next.push(value)
      }
    }
    nodes = next
  }
  return nodes
}

/** Every defined value at `path` in `doc` (arrays are walked), in document order. */
function valuesAt(doc, path) {
  return walk(doc, parsePath(path))
}

/** Deep copy of `body` without the type's money fields. */
function stripMoneyFields(type, body) {
  const copy = structuredClone(body)
  for (const path of MONEY_FIELDS[type] || []) {
    const steps = parsePath(path)
    const last = steps.pop()
    for (const node of walk(copy, steps)) {
      if (node !== null && typeof node === 'object' && !Array.isArray(node)) delete node[last.key]
    }
  }
  return copy
}

/** True when any money field of `type` differs between the two documents. */
function moneyFieldsChanged(type, before, after) {
  return (MONEY_FIELDS[type] || []).some(path =>
    JSON.stringify(valuesAt(before || {}, path)) !== JSON.stringify(valuesAt(after || {}, path)))
}

module.exports = { can, assertCan, stripMoneyFields, moneyFieldsChanged, valuesAt, LOCKED_TAXONOMY_KINDS, SYSTEM_TYPES, ACTIONS }
