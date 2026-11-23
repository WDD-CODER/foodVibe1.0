'use strict';
/**
 * Plan 675 (C-CHANNEL): the one sender. Every outbound message of the app goes through `sendOut`: it checks
 * do-not-contact (R-02), the test rule and the live profile (R-19), the 24-hour window and the button limit (R-12),
 * writes the `messages` row and calls the transport. No other file calls a transport's `send`.
 * Logs carry the reason, the kind, the author and the conversation id only — never a name, a phone or a text.
 */
const { newId } = require('../utils/id');
const { logger } = require('../logger');
const { checkStoredDoc } = require('../middleware/validate');
const { channelFor } = require('./channels');
const { MESSAGE_TEMPLATES } = require('../generated/schemas/front-desk/message-templates');

const MAX_BUTTONS = 3;
const LIVE_STATUSES = ['pilot', 'active'];

/** `{ ok: true, message }` or `{ ok: false, reason }`; `reason` is one of DO_NOT_CONTACT, WINDOW_CLOSED, NOT_LIVE, TEST_ONLY, BAD_TEMPLATE, SEND_FAILED. */
async function sendOut(db, conversation, outbound, author, { now = Date.now(), memberId } = {}) {
  const refuse = reason => {
    logger.info({ event: 'outbound.refused', reason, kind: outbound && outbound.kind, author, conversationId: conversation._id });
    return { ok: false, reason };
  };
  const isTemplate = outbound.kind === 'template';
  if (isTemplate) {
    const t = outbound.template && Object.prototype.hasOwnProperty.call(MESSAGE_TEMPLATES, outbound.template.name)
      ? MESSAGE_TEMPLATES[outbound.template.name] : null;
    if (!t || !Array.isArray(outbound.template.params)) return refuse('BAD_TEMPLATE');
  }

  const businessId = conversation.businessId;
  const client = await db.collection('clients').findOne({ _id: conversation.clientId, businessId });
  if (client && client.doNotContact) return refuse('DO_NOT_CONTACT');

  const transport = channelFor(conversation);
  if (transport.real) {
    if (conversation.test === true) return refuse('TEST_ONLY');
    const profile = await db.collection('frontDeskProfiles').findOne({ businessId, deletedAt: { $exists: false } });
    if (!profile || !LIVE_STATUSES.includes(profile.status)) return refuse('NOT_LIVE');
  }

  if (!isTemplate && now > conversation.windowExpiresAt) return refuse('WINDOW_CLOSED');

  let out = outbound;
  if (outbound.kind === 'button' && (outbound.buttons || []).length > MAX_BUTTONS) {
    const lines = outbound.buttons.map((b, i) => `${i + 1}. ${b.title}`);
    out = { kind: 'text', text: [outbound.text || '', ...lines].join('\n') };
  }

  let sent;
  try {
    sent = await transport.send(db, conversation, out);
  } catch (err) {
    logger.warn({ event: 'outbound.send.threw', conversationId: conversation._id, errName: err && err.name });
    sent = { providerMessageId: 'failed:' + newId(), status: 'failed' };
  }
  const status = sent && sent.status ? sent.status : 'failed';
  const row = {
    _id: newId(), businessId, conversationId: conversation._id, direction: 'out', author,
    ...(memberId && { memberId }),
    kind: out.kind,
    text: isTemplate ? '' : (out.text || ''),
    ...(isTemplate && { template: { name: out.template.name, params: out.template.params } }),
    ...(out.buttons && out.buttons.length && { buttons: out.buttons.map(b => ({ id: b.id, title: b.title })) }),
    at: now,
    providerMessageId: (sent && sent.providerMessageId) || 'failed:' + newId(),
    status,
    ...(conversation.test && { test: true }),
  };
  const check = checkStoredDoc('messages', row);
  if (!check.ok) throw Object.assign(new Error('BAD_MESSAGE'), { code: 'BAD_MESSAGE', issues: check.issues });
  await db.collection('messages').insertOne(row);
  await db.collection('conversations').updateOne(
    { _id: conversation._id, businessId },
    { $set: { lastMessageAt: now, updatedAt: now } }
  );
  if (status === 'failed') {
    logger.info({ event: 'outbound.refused', reason: 'SEND_FAILED', kind: out.kind, author, conversationId: conversation._id });
    return { ok: false, reason: 'SEND_FAILED', message: row };
  }
  logger.info({ event: 'outbound.sent', kind: out.kind, author, conversationId: conversation._id });
  return { ok: true, message: row };
}

module.exports = { sendOut };
