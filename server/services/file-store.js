'use strict'
/**
 * Plan 619 (C-FILES): the private file store. The only writer of the server-only `storedFiles` collection.
 * A file is uploaded signed by the server and kept as a non-public asset; the app hands out only a link that
 * expires. File storage never blocks a feature: with no keys (or a failing provider) every call answers calmly.
 * The three CLOUDINARY_* values are read at call time and never logged, returned or put into an error.
 */
const mongoose = require('mongoose')
const { newId } = require('../utils/id')
const { actorOf } = require('../utils/actor')
const { logger } = require('../logger')
const { storedFileSchema, FILE_BASE64_MAX, FILE_KINDS, FILE_MIME_TYPES, VOICE_FILE_KEEP_DAYS } = require('../generated/schemas/entities')
const { uploadRequest, downloadUrl, destroyRequest } = require('./cloudinary-requests')

const DAY_MS = 86_400_000
const MAX_BYTES = 1_350_000
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/

let testStore = null
let offLogged = false

const col = () => mongoose.connection.db.collection('storedFiles')

function envConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null
}

/** True when all three keys are set, or a test store is set. */
function isFileStoreConfigured() {
  return testStore !== null || envConfig() !== null
}

/** The real store over fetch + FormData. Errors carry the HTTP status only. */
function createCloudinaryStore(config) {
  const send = async ({ url, fields }) => {
    const form = new FormData()
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v))
    const res = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  return {
    async upload({ publicId, mimeType, buffer }) {
      const body = await send(uploadRequest(config, { publicId, mimeType, buffer, timestamp: Math.floor(Date.now() / 1000) }))
      if (!body || typeof body.public_id !== 'string') throw new Error('HTTP 200 without public_id')
      return {
        providerId: body.public_id,
        resourceType: typeof body.resource_type === 'string' ? body.resource_type : 'image',
        format: typeof body.format === 'string' && body.format ? body.format.slice(0, 12) : undefined,
      }
    },
    url(file, expiresAtSec) {
      return downloadUrl(config, {
        publicId: file.providerId, resourceType: file.resourceType, format: file.format ?? '',
        expiresAt: expiresAtSec, timestamp: Math.floor(Date.now() / 1000),
      })
    },
    async destroy(file) {
      const body = await send(destroyRequest(config, {
        publicId: file.providerId, resourceType: file.resourceType, timestamp: Math.floor(Date.now() / 1000),
      }))
      return body?.result === 'ok' || body?.result === 'not found'
    },
  }
}

/** A fake that keeps buffers in a Map; the fake every test of the program uses. */
function createMemoryFileStore() {
  const store = {
    files: new Map(),
    failNextUpload: false,
    failNextDestroy: false,
    async upload({ publicId, mimeType, buffer }) {
      if (store.failNextUpload) { store.failNextUpload = false; throw new Error('HTTP 500') }
      store.files.set(publicId, buffer)
      const format = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1]
      return { providerId: publicId, resourceType: mimeType.startsWith('audio/') ? 'video' : 'image', format }
    },
    url(file, expiresAtSec) { return `memory://${file.providerId}?exp=${expiresAtSec}` },
    async destroy(file) {
      if (store.failNextDestroy) { store.failNextDestroy = false; throw new Error('HTTP 500') }
      store.files.delete(file.providerId)
      return true
    },
  }
  return store
}

/** Swaps the store (null restores the real one). */
function setFileStoreForTests(fake) {
  testStore = fake ?? null
  offLogged = false
}

function currentStore() {
  if (testStore) return testStore
  const config = envConfig()
  return config ? createCloudinaryStore(config) : null
}

/** Checks kind, mime type, length and the base64 alphabet before anything is decoded. */
function readUploadedFile({ kind, base64, mimeType }) {
  if (!FILE_KINDS.includes(kind)) return { error: 'BAD_MIME' }
  if (typeof base64 !== 'string' || base64.length < 1) return { error: 'BAD_FILE' }
  if (base64.length > FILE_BASE64_MAX) return { error: 'FILE_TOO_LARGE' }
  const mime = typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : ''
  if (!FILE_MIME_TYPES[kind].includes(mime)) return { error: 'BAD_MIME' }
  if (!BASE64_RE.test(base64)) return { error: 'BAD_FILE' }
  return { buffer: Buffer.from(base64, 'base64'), mimeType: mime }
}

async function bestEffortDestroy(store, file) {
  try { await store.destroy(file) } catch { /* best effort */ }
}

/** Stores a file for the caller's business. Returns the file id, or null (never throws, never logs content). */
async function putPrivateFile(req, { kind, mimeType, buffer, deleteAfterDays } = {}) {
  const log = req?.log ?? logger
  try {
    const store = currentStore()
    if (!store) {
      if (!offLogged) { offLogged = true; log.info({ event: 'file_store.off' }) }
      return null
    }
    const bytes = buffer?.length ?? 0
    if (!FILE_KINDS.includes(kind) || !FILE_MIME_TYPES[kind].includes(mimeType) || bytes < 1 || bytes > MAX_BYTES) {
      log.warn({ event: 'file_store.rejected', kind, bytes })
      return null
    }
    const businessId = req.user.businessId
    const publicId = `fv/${businessId}/${kind}/${newId()}`
    let up
    try {
      up = await store.upload({ publicId, mimeType, buffer })
    } catch {
      log.warn({ event: 'file_store.upload_failed', kind, bytes })
      return null
    }
    const now = Date.now()
    const doc = {
      _id: newId(), businessId, kind, mimeType, bytes, provider: 'cloudinary',
      providerId: up.providerId, resourceType: up.resourceType,
      createdBy: actorOf(req).userId, createdAt: now,
    }
    if (up.format) doc.format = up.format
    if (kind === 'voice') doc.deleteAfter = now + VOICE_FILE_KEEP_DAYS * DAY_MS
    else if (Number.isInteger(deleteAfterDays) && deleteAfterDays >= 1 && deleteAfterDays <= 3650) doc.deleteAfter = now + deleteAfterDays * DAY_MS
    try {
      storedFileSchema.parse(doc)
      await col().insertOne(doc)
    } catch {
      await bestEffortDestroy(store, doc)
      log.warn({ event: 'file_store.upload_failed', kind, bytes, reason: 'db' })
      return null
    }
    return doc._id
  } catch {
    log.warn({ event: 'file_store.upload_failed', kind, bytes: buffer?.length ?? 0 })
    return null
  }
}

/** Clears `deleteAfter` of an invoice file (the invoice was saved). False for another business, a voice file or an unknown id. */
async function keepStoredFile(db, businessId, fileId) {
  const res = await db.collection('storedFiles').updateOne(
    { _id: String(fileId), businessId, kind: { $ne: 'voice' } },
    { $unset: { deleteAfter: '' } }
  )
  return res.matchedCount > 0
}

/** A link that stops working after `ttlSeconds`, or null when not configured. */
function signedFileUrl(file, ttlSeconds) {
  const store = currentStore()
  if (!store) return null
  return store.url(file, Math.floor(Date.now() / 1000) + ttlSeconds)
}

/** Deletes the provider asset, then the document. False (document kept) when not configured or the provider fails. */
async function deleteStoredFile(file) {
  const store = currentStore()
  if (!store) return false
  try {
    const gone = await store.destroy(file)
    if (!gone) throw new Error('not deleted')
  } catch {
    logger.warn({ event: 'file_store.delete_failed', kind: file.kind })
    return false
  }
  await col().deleteOne({ _id: file._id })
  return true
}

module.exports = {
  isFileStoreConfigured, putPrivateFile, keepStoredFile, signedFileUrl, deleteStoredFile, readUploadedFile,
  setFileStoreForTests, createMemoryFileStore, createCloudinaryStore,
}
