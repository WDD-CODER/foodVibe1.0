'use strict';
/**
 * Plan 675 (C-CHANNEL, C-TESTDATA): the simulator's routes. The owner (or a platform admin) writes as a test guest of
 * their own business; the message goes through the same `handleInbound` a real message uses, with `channel: 'sim'`.
 * `POST /clock` is added by plan 676.
 */
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, isPlatformAdmin } = require('../middleware/auth');
const { requireModule } = require('../middleware/require-module');
const { dataWriteLimiter } = require('../middleware/write-limit');
const { scopeFilter } = require('../utils/business-scope');
const { actorOf } = require('../utils/actor');
const { newId } = require('../utils/id');
const { logger } = require('../logger');
const { handleInbound } = require('../services/inbound');
const { normalizePhone, phoneKey, findLiveClientByPhoneKey } = require('../utils/client-upsert');
const { LIVE } = require('../jobs/purge-deleted');
const { remindOne } = require('../jobs/reminders');
const { markOne } = require('../jobs/no-show');
const { loadTableContext } = require('../services/table-bookings');

const router = Router();
const db = () => mongoose.connection.db;

const isString = v => typeof v === 'string';
const businessOf = req => scopeFilter(req).businessId;

function ownerOnly(req, res, next) {
  if (req.user && (req.user.businessRole === 'owner' || isPlatformAdmin(req))) return next();
  return res.status(403).json({ error: 'OWNER_ONLY' });
}

router.use(verifyToken, requireModule('frontdesk'), ownerOnly, dataWriteLimiter);

function badInput(res) {
  return res.status(400).json({ error: 'BAD_INPUT' });
}

router.post('/inbound', async (req, res) => {
  try {
    const { phone, name, text, buttonId } = req.body || {};
    const waId = isString(phone) ? normalizePhone(phone) : '';
    if (waId.length < 9 || waId.length > 15) return badInput(res);
    if (name !== undefined && (!isString(name) || name.length > 80)) return badInput(res);
    if (text !== undefined && (!isString(text) || text.length > 4000)) return badInput(res);
    if (buttonId !== undefined && (!isString(buttonId) || buttonId.length > 100 || !buttonId)) return badInput(res);
    if (!text && !buttonId) return badInput(res);

    const businessId = businessOf(req);
    const existing = await findLiveClientByPhoneKey(db(), businessId, phoneKey(waId));
    if (existing && !(existing.tags || []).includes('test')) return res.status(409).json({ error: 'REAL_CLIENT' });

    const result = await handleInbound(db(), {
      businessId, channel: 'sim', waId, guestName: name || undefined, text, buttonId,
      providerMessageId: 'sim-in:' + newId(), at: Date.now(), actor: actorOf(req),
    }, { log: req.log || logger });
    result.settled.catch(() => {});
    return res.json({ conversationId: result.conversationId, messageId: result.messageId });
  } catch (err) {
    (req.log || logger).error({ err, event: 'sim.inbound.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clock', async (req, res) => {
  try {
    const { conversationId, job } = req.body || {};
    if (!isString(conversationId) || !conversationId || !['reminder', 'late'].includes(job)) return badInput(res);
    const businessId = businessOf(req);
    const conversation = await db().collection('conversations').findOne({ _id: conversationId, businessId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (conversation.test !== true) return res.status(409).json({ error: 'NOT_TEST' });
    const now = Date.now();
    const booking = await db().collection('bookings').findOne(
      { businessId, clientId: conversation.clientId, test: true, kind: 'table', status: 'confirmed', ...LIVE },
      { sort: { startAt: 1 } }
    );
    if (!booking) return res.json({ job, done: false, reason: 'NO_BOOKING' });
    if (job === 'reminder') {
      const r = await remindOne(db(), booking, now, { conversation });
      (req.log || logger).info({ event: 'sim.clock', job, result: r });
      return res.json(r === 'ALREADY' ? { job, done: false, reason: 'ALREADY' } : { job, done: true });
    }
    const { service } = await loadTableContext(db(), businessId);
    if (!service.autoNoShow) return res.json({ job, done: false, reason: 'AUTO_NO_SHOW_OFF' });
    const at = Math.max(now, booking.startAt + service.holdMinutes * 60000 + 60000);
    const done = await markOne(db(), booking, at);
    (req.log || logger).info({ event: 'sim.clock', job, done });
    return res.json(done ? { job, done: true } : { job, done: false, reason: 'BAD_STATUS' });
  } catch (err) {
    (req.log || logger).error({ err, event: 'sim.clock.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/test-data', async (req, res) => {
  try {
    const businessId = businessOf(req);
    const d = db();
    const deleted = {};
    const testBookings = await d.collection('bookings').find({ businessId, test: true }).project({ _id: 1 }).toArray();
    const ids = testBookings.map(b => b._id);
    deleted.tableHolds = (await d.collection('tableHolds').deleteMany({
      businessId, $or: [{ test: true }, { bookingId: { $in: ids } }],
    })).deletedCount;
    for (const col of ['messages', 'conversations', 'requests', 'bookings', 'waitlistEntries']) {
      deleted[col] = (await d.collection(col).deleteMany({ businessId, test: true })).deletedCount;
    }
    deleted.clients = (await d.collection('clients').deleteMany({ businessId, tags: 'test' })).deletedCount;
    (req.log || logger).info({ event: 'sim.test_data.deleted', deleted });
    return res.json({ deleted });
  } catch (err) {
    (req.log || logger).error({ err, event: 'sim.test_data.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
