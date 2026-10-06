/**
 * Server logger (Plan 383) — one pino instance for the whole API.
 *
 * - Every line is one JSON object: level, time (ISO), service, event, requestId?, userId?, msg.
 *   `LOG_PRETTY=1` swaps stdout for pino-pretty (local terminal only — never on Render or in
 *   slots, where Plan 384 parses the JSON lines).
 * - Level: LOG_LEVEL, else `info` in production and `debug` everywhere else.
 * - `warn` and above are also bridged into the `app_logs` Mongo sink (Plan 382) with
 *   `source: 'server'`. The bridge never blocks and never throws into the caller.
 * - No PII: auth headers, cookies, passwords and emails are redacted; request lines carry
 *   method/url/id only (no headers, no IP).
 */

'use strict'

const { Writable } = require('node:stream')
const pino = require('pino')
const sink = require('./services/log-sink')

const IS_PROD = process.env.NODE_ENV === 'production'
const LEVEL = process.env.LOG_LEVEL || (IS_PROD ? 'info' : 'debug')

// Fields the bridge maps explicitly or drops; everything else lands in the sink's `context`.
const BRIDGE_SKIP = new Set(['level', 'time', 'pid', 'hostname', 'service', 'msg', 'event', 'requestId', 'userId', 'err', 'req', 'res'])

function bridgeError(err) {
  if (!err || typeof err !== 'object') return undefined
  return IS_PROD
    ? { name: err.type || err.name, message: err.message }
    : { name: err.type || err.name, message: err.message, stack: err.stack }
}

/** Maps one pino JSON record to a log-sink entry. Exported for tests. */
function toSinkEntry(rec) {
  const context = {}
  for (const [key, value] of Object.entries(rec)) {
    if (!BRIDGE_SKIP.has(key)) context[key] = value
  }
  const err = bridgeError(rec.err)
  if (err) context.err = err
  if (rec.res && rec.res.statusCode) context.statusCode = rec.res.statusCode
  return {
    source: 'server',
    level: rec.level >= 50 ? 'error' : 'warn',
    event: rec.event || 'server.log.unnamed',
    message: String(rec.msg || (err && err.message) || rec.event || '').slice(0, 500),
    context: Object.keys(context).length ? context : null,
    userId: rec.userId ?? null,
    requestId: rec.requestId ?? null,
    url: rec.req && rec.req.url ? rec.req.url : null,
  }
}

const mongoBridge = new Writable({
  write(chunk, _enc, callback) {
    try {
      const entry = toSinkEntry(JSON.parse(chunk.toString()))
      sink.write(entry).catch(() => {})
    } catch {
      // A malformed line or a sink failure must never surface into request handling.
    }
    callback()
  },
})

const stdoutStream = process.env.LOG_PRETTY === '1'
  ? require('pino-pretty')({ colorize: true, translateTime: 'SYS:HH:MM:ss.l' })
  : process.stdout

const streams = pino.multistream([
  { level: LEVEL, stream: stdoutStream },
  { level: 'warn', stream: mongoBridge },
])

const logger = pino(
  {
    level: LEVEL,
    base: { service: 'foodvibe-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.email'],
      censor: '[redacted]',
    },
  },
  streams
)

/** Adds an extra destination (tests capture records through this). */
function addLogDestination(stream, level = 'debug') {
  streams.add({ level, stream })
}

module.exports = { logger, addLogDestination, toSinkEntry }
