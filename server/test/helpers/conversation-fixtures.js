'use strict';
/**
 * Plan 675: fixtures of the conversation tests (also for plans 676, 679, 687): a business with a front desk profile,
 * a client, a conversation, and a `wait` the test controls.
 */

const { findOrCreateConversation } = require('../../services/conversations');

const NOW = Date.parse('2026-03-02T10:00:00Z');

/** Seeds a business and its profile (`status`, default `active`). Returns `{ businessId }`. */
async function seedBusiness(db, { businessId = 'b1', profileStatus = 'active' } = {}) {
  await db.collection('businesses').deleteMany({ _id: businessId });
  await db.collection('businesses').insertOne({ _id: businessId, name: 'One', ownerId: 'own1', createdAt: 1 });
  await db.collection('frontDeskProfiles').deleteMany({ businessId });
  await db.collection('frontDeskProfiles').insertOne({
    _id: 'p_' + businessId, businessId, status: profileStatus, schemaVersion: 2, createdAt: 1, updatedAt: 1, createdBy: 'own1',
  });
  return { businessId };
}

/** Seeds a client and a live conversation. `doNotContact`, `channel`, `test`, `at` are overridable. */
async function seedConversation(db, { businessId = 'b1', channel = 'sim', waId = '972521234567', doNotContact, test, at = NOW } = {}) {
  const clientId = 'c_' + waId;
  await db.collection('clients').insertOne({
    _id: clientId, businessId, name: 'Guest', phone: waId, phoneKey: waId.slice(-9), createdAt: at, updatedAt: at,
    ...(doNotContact && { doNotContact: { at, reason: 'asked', via: 'member' } }),
  });
  const { conversation } = await findOrCreateConversation(db, { businessId, channel, waId, clientId, at, test });
  return { clientId, conversation };
}

/** A `wait` the test releases by hand: `w.wait` goes into `setWaitForTest`, `w.release()` resolves every pending call. */
function controllableWait() {
  const pending = [];
  const calls = [];
  return {
    calls,
    wait: ms => new Promise(resolve => { calls.push(ms); pending.push(resolve); }),
    release() { while (pending.length) pending.shift()(); },
  };
}

module.exports = { NOW, seedBusiness, seedConversation, controllableWait };
