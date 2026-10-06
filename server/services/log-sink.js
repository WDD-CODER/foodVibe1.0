/**
 * Single durable sink for application logs (Plan 382, ADR 0016): MongoDB `app_logs`, 90-day TTL.
 *
 * `warn` / `error` are always persisted; `info` only when LOG_PERSIST_INFO=1. Every entry is
 * also echoed as one JSON line to stdout so slot logs (`.claude/be.log`) and Render see it.
 * No PII: callers pass `userId` (= user._id) only — never email, name, IP or user-agent.
 * A sink failure never throws into the caller.
 */

'use strict';

const mongoose = require('mongoose');

const COLLECTION = 'app_logs';
const TTL_SECONDS = 90 * 24 * 3600;

function shouldPersist(level) {
  return level !== 'info' || process.env.LOG_PERSIST_INFO === '1';
}

/** Idempotent — called from connectDb() on every startup. */
async function ensureLogIndexes(db) {
  const col = db.collection(COLLECTION);
  await Promise.all([
    col.createIndex({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS, name: 'ttl_createdAt' }),
    col.createIndex({ level: 1, createdAt: -1 }, { name: 'level_createdAt' }),
    col.createIndex({ event: 1, createdAt: -1 }, { name: 'event_createdAt' }),
    col.createIndex({ userId: 1, createdAt: -1 }, { name: 'userId_createdAt' })
  ]);
}

/**
 * @param {{ source: 'client'|'server', level: 'info'|'warn'|'error', event: string,
 *   message: string, context?: object, userId?: string|null, requestId?: string,
 *   url?: string, clientTs?: string }} entry
 */
async function write(entry) {
  const doc = {
    source: entry.source,
    level: entry.level,
    event: entry.event,
    message: entry.message,
    context: entry.context ?? null,
    userId: entry.userId ?? null,
    requestId: entry.requestId ?? null,
    url: entry.url ?? null,
    clientTs: entry.clientTs ?? null,
    createdAt: new Date()
  };
  try {
    console.log(JSON.stringify(doc));
    if (!shouldPersist(doc.level)) return;
    const db = mongoose.connection.db;
    if (!db) throw new Error('no db connection');
    await db.collection(COLLECTION).insertOne(doc);
  } catch (err) {
    console.error('[log/sink]', err.message);
  }
}

module.exports = { write, ensureLogIndexes, COLLECTION };
