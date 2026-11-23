'use strict';
/**
 * demo-restaurant-data.js — Plan 674. The data of one demo restaurant, built as plain objects.
 * Pure: no database, no clock (`now` is a parameter). Every id is a fixed `demo_rest…` string, so a second run of the
 * seed script finds the documents it already wrote. The 40 bookings are placed by the shared table engine.
 */

const { templateFor } = require('../../generated/schemas/front-desk-templates');
const { assign } = require('../../generated/schemas/front-desk/table-engine');
const { jerusalemEpoch } = require('../../generated/schemas/front-desk/local-time');
const { jerusalemDate } = require('../../middleware/usage');

const DAY = 86400000;
const MIN = 60000;

const OWNER_ID = 'demo_rest_owner';
const BUSINESS_ID = 'demo_restaurant';
const OWNER_NAME = 'demo_host';

const AREAS = [
  { key: 'inside', name: 'בפנים', order: 0 },
  { key: 'outside', name: 'בחוץ', order: 1 },
  { key: 'barzone', name: 'בר', order: 2 },
];

// number, area, shape, min, max, x, y, w, h — whole cells, no overlap; inside columns 2-24, outside 27-38, bar row 21.
const TABLES = [
  ['1', 'inside', 'square', 1, 2, 2, 2, 2, 2],
  ['2', 'inside', 'square', 1, 2, 5, 2, 2, 2],
  ['3', 'inside', 'square', 1, 2, 8, 2, 2, 2],
  ['4', 'inside', 'square', 1, 2, 11, 2, 2, 2],
  ['5', 'inside', 'rect', 3, 4, 2, 6, 3, 2],
  ['6', 'inside', 'rect', 3, 4, 6, 6, 3, 2],
  ['7', 'inside', 'rect', 3, 4, 10, 6, 3, 2],
  ['8', 'inside', 'round', 5, 6, 2, 10, 3, 3],
  ['9', 'inside', 'rect', 6, 8, 7, 10, 4, 2],
  ['10', 'outside', 'square', 2, 4, 27, 3, 2, 2],
  ['11', 'outside', 'square', 2, 4, 30, 3, 2, 2],
  ['12', 'outside', 'round', 4, 6, 27, 8, 3, 3],
  ['13', 'barzone', 'square', 1, 2, 4, 21, 2, 2],
  ['14', 'barzone', 'square', 1, 2, 8, 21, 2, 2],
];
const tableKey = number => `demot${String(number).padStart(2, '0')}`;

const JOINS = [
  { key: 'demoj01', tableKeys: [tableKey(5), tableKey(6)], minSeats: 6, maxSeats: 8, online: true },
  { key: 'demoj02', tableKeys: [tableKey(10), tableKey(11)], minSeats: 5, maxSeats: 8, online: true },
];

const CLIENTS = [
  ['demo_rest_client_1', 'נועה כהן', '050-1000001', true],
  ['demo_rest_client_2', 'איתי לוי', '052-1000002'],
  ['demo_rest_client_3', 'מיכל אברהם', '054-1000003'],
  ['demo_rest_client_4', 'עומר דוד', '053-1000004'],
  ['demo_rest_client_5', 'שירה מזרחי', '058-1000005'],
  ['demo_rest_client_6', 'יובל פרידמן', '055-1000006'],
];

const TIMES = ['12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:00', '20:30', '21:00', '21:00'];
const PARTIES = [2, 4, 2, 6, 3, 2, 8, 4, 2, 5];
const ASK_AREAS = ['inside', 'inside', 'barzone', 'inside', 'outside', 'inside', 'inside', 'outside', 'barzone', 'inside'];
// day offset from today -> bookings that day (40 in all)
const DAY_COUNTS = [[-1, 6], [0, 10], [1, 5], [2, 5], [3, 5], [4, 5], [5, 4]];

const WAITLIST = [
  ['demo_rest_wait_1', 'רונית שמעוני', '050-2000001', 2, 'waiting', 10, 25],
  ['demo_rest_wait_2', 'גיא בן חיים', '052-2000002', 4, 'waiting', 20, 35],
  ['demo_rest_wait_3', 'ליאת אזולאי', '054-2000003', 2, 'notified', 35, 15],
  ['demo_rest_wait_4', 'אורי גולן', '053-2000004', 5, 'left', 50, 40],
];

/** The date `n` days after `date` (YYYY-MM-DD), by calendar arithmetic. */
function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function buildProfile(base, now) {
  const template = templateFor('restaurant');
  const table = { ...template.requestKinds.table, enabled: true };
  return {
    _id: 'demo_rest_profile', ...base, createdAt: now - 60 * DAY, updatedAt: now - 7 * DAY,
    businessType: 'restaurant', slug: 'demo-restaurant', displayName: 'מסעדת הדגמה',
    phone: '03-5550100', address: 'רחוב הרצל 10, תל אביב',
    hours: [{ days: 'כל יום', time: '12:00–23:00', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '12:00', close: '23:00' }],
    requestKinds: { ...template.requestKinds, table },
    assistant: { level: 0, tone: template.assistant.tone },
    status: 'pilot',
    tableService: {
      confirmMode: 'auto', autoMaxParty: 6, slotMinutes: 15,
      turnMinutes: [{ maxParty: 4, minutes: 90 }, { maxParty: 30, minutes: 120 }],
      lastSeatingBeforeCloseMinutes: 60, bufferMinutes: 0, holdMinutes: 15, autoNoShow: false,
      reminderHour: '10:00', cancellationCutoffHours: 3,
    },
  };
}

function buildFloorPlan(base, now) {
  return {
    _id: 'demo_rest_floorplan', ...base, createdAt: now - 60 * DAY, updatedAt: now - 30 * DAY,
    grid: { cols: 40, rows: 24 },
    areas: AREAS.map(a => ({ ...a })),
    tables: TABLES.map(([number, areaKey, shape, minSeats, maxSeats, x, y, w, h]) => ({
      key: tableKey(number), number, areaKey, shape, minSeats, maxSeats, x, y, w, h,
      turned: false, active: true, online: number !== '14',
    })),
    joins: JOINS.map(j => ({ ...j, tableKeys: [...j.tableKeys] })),
  };
}

function buildClients(base, now) {
  return CLIENTS.map(([id, name, phone, vip], i) => {
    const digits = phone.replace(/\D/g, '');
    return {
      _id: id, ...base, createdAt: now - (50 - i) * DAY, updatedAt: now - 7 * DAY, name, phone,
      phoneNormalized: digits, phoneKey: digits.slice(-9), liveKey: digits.slice(-9), clientType: 'private',
      source: 'manual', kinds: ['diner'], lifecycle: 'active', ...(vip ? { tags: ['vip'] } : {}),
    };
  });
}

/** Places the 40 bookings with the engine; every date gets its count from the fixed asks or the builder throws. */
function buildBookings(base, now, profile, plan, clients) {
  const today = jerusalemDate(now);
  const service = profile.tableService;
  const bookings = [];
  for (const [offset, count] of DAY_COUNTS) {
    const date = addDays(today, offset);
    const holds = [];
    let placed = 0;
    for (let i = 0; i < TIMES.length && placed < count; i++) {
      const startAt = jerusalemEpoch(date, TIMES[i]);
      const ask = { date, time: TIMES[i], partySize: PARTIES[i], areaKey: ASK_AREAS[i], onlineOnly: false, now: startAt - 3 * DAY };
      const found = assign(plan, profile, holds, ask);
      if (!found.ok) continue;
      for (const tableKeyOf of found.tableKeys) {
        holds.push({ tableKey: tableKeyOf, startAt: found.startAt, endAt: found.endAt + service.bufferMinutes * MIN });
      }
      placed++;
      const n = bookings.length + 1;
      const client = clients[(n - 1) % clients.length];
      const durationMinutes = (found.endAt - found.startAt) / MIN;
      const createdAt = Math.min(now, found.startAt - 2 * DAY);
      const entry = (status, at) => ({ status, at, by: OWNER_ID, byName: OWNER_NAME, via: 'server' });
      let status = 'confirmed';
      const statusHistory = [entry('confirmed', createdAt)];
      const extra = {};
      if (found.endAt <= now) {
        status = offset === -1 && (placed === 3 || placed === 5) ? 'no_show' : 'finished';
        if (status === 'no_show') {
          statusHistory.push(entry('no_show', found.startAt + 15 * MIN));
        } else {
          statusHistory.push(entry('seated', found.startAt), entry('finished', found.endAt));
          extra.seatedAt = found.startAt;
          extra.finishedAt = found.endAt;
        }
      } else if (found.startAt <= now) {
        status = 'seated';
        statusHistory.push(entry('seated', found.startAt));
        extra.seatedAt = found.startAt;
      }
      bookings.push({
        _id: `demo_rest_booking_${String(n).padStart(2, '0')}`, ...base, createdAt, updatedAt: statusHistory[statusHistory.length - 1].at,
        kind: 'table', status, source: 'phone', date, time: TIMES[i], startAt: found.startAt, endAt: found.endAt, durationMinutes,
        partySize: PARTIES[i], clientId: client._id, guestName: client.name, guestPhone: client.phone, statusHistory,
        publicToken: `demo_rest_booking_${String(n).padStart(2, '0')}`.padEnd(24, 'x'),
        tableKeys: found.tableKeys, areaKey: plan.tables.find(t => t.key === found.tableKeys[0]).areaKey, ...extra,
      });
    }
    if (placed < count) throw new Error(`demo restaurant: ${date} reached only ${placed} of ${count} bookings`);
  }
  return bookings;
}

function buildWaitlist(base, now) {
  const date = jerusalemDate(now);
  return WAITLIST.map(([id, guestName, guestPhone, partySize, status, joinedAgo, quoted]) => ({
    _id: id, ...base, createdAt: now - joinedAgo * MIN, updatedAt: now - joinedAgo * MIN, date, guestName, guestPhone, partySize,
    quotedMinutes: quoted, status, joinedAt: now - joinedAgo * MIN,
    ...(status === 'notified' ? { notifiedAt: now - 5 * MIN } : {}),
  }));
}

/** `{ frontDeskProfiles, floorPlans, clients, bookings, waitlistEntries }` for `now`; the same `now` gives the same documents. */
function buildDemoRestaurant({ now, ownerId = OWNER_ID, businessId = BUSINESS_ID }) {
  const base = { schemaVersion: 2, businessId, createdBy: ownerId };
  const profile = buildProfile(base, now);
  const plan = buildFloorPlan(base, now);
  const clients = buildClients(base, now);
  return {
    frontDeskProfiles: [profile],
    floorPlans: [plan],
    clients,
    bookings: buildBookings(base, now, profile, plan, clients),
    waitlistEntries: buildWaitlist(base, now),
  };
}

module.exports = { buildDemoRestaurant, OWNER_ID, BUSINESS_ID, OWNER_NAME };
