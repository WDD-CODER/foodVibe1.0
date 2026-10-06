'use strict';
/**
 * Captures the server logger's JSON records in memory (Plan 383). Attach once per test file,
 * after buildTestApp(); records written before attaching are not seen.
 */

const { Writable } = require('node:stream');
const { addLogDestination } = require('../../logger');

function captureLogs(level = 'debug') {
  const records = [];
  addLogDestination(new Writable({
    write(chunk, _enc, callback) {
      records.push(JSON.parse(chunk.toString()));
      callback();
    },
  }), level);
  return {
    records,
    /** Records whose `event` matches. */
    byEvent: event => records.filter(r => r.event === event),
  };
}

module.exports = { captureLogs };
