'use strict';
/**
 * Plan 681: the fixed room of the assistant's eval. It is plan 663's engine fixture (`shared/schemas/testing`), not a
 * second room: 14 tables in three areas (inside, outside, bar), one inactive, two not online, two joins. The table
 * settings are the C-TSERVICE defaults; a dialogue sets only `confirmMode` and `autoMaxParty`.
 */
const { ROOM, ALL_WEEK_HOURS, tableKeyOf } = require('../../generated/schemas/testing/table-engine-fixtures');
const { TABLE_SERVICE_DEFAULTS } = require('../../generated/schemas/front-desk/table-service');

/** The floor plan of `businessId`, ready to insert. */
function room14For(businessId, now) {
  return { ...ROOM, _id: 'fp_' + businessId, businessId, createdAt: now, updatedAt: now, createdBy: 'eval' };
}

/** The table settings of a dialogue's profile. */
function tableServiceFor(setup) {
  return {
    confirmMode: setup.confirmMode ?? TABLE_SERVICE_DEFAULTS.confirmMode,
    autoMaxParty: setup.autoMaxParty ?? TABLE_SERVICE_DEFAULTS.autoMaxParty,
  };
}

module.exports = { room14For, tableServiceFor, tableKeyOf, ROOM, ALL_WEEK_HOURS, TABLE_SERVICE_DEFAULTS };
