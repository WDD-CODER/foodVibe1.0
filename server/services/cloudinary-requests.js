'use strict'
/**
 * Plan 619 (C-FILES): pure request builders for the private file store (Cloudinary). No process.env, no fetch.
 * Shapes taken from the provider's documentation as read on 2026-11-17:
 *  - https://cloudinary.com/documentation/authentication_signatures (signature rule)
 *  - https://cloudinary.com/documentation/image_upload_api_reference_upload (upload)
 *  - https://cloudinary.com/documentation/control_access_to_media (download endpoint with expires_at)
 *  - https://cloudinary.com/documentation/image_upload_api_reference_destroy_by_public_id (delete)
 * The download endpoint's signing formula is not written on its page; it is signed with the documented API rule.
 */
const crypto = require('node:crypto')

const API = 'https://api.cloudinary.com/v1_1'
const UNSIGNED_KEYS = new Set(['file', 'cloud_name', 'resource_type', 'api_key'])

/** SHA-1 hex of the sorted `name=value` pairs joined with `&`, with the secret appended. */
function signParams(params, apiSecret) {
  const text = Object.keys(params)
    .filter(k => !UNSIGNED_KEYS.has(k) && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(text + apiSecret).digest('hex')
}

/** `video` for audio, `image` for pictures and PDF. */
function resourceTypeOf(mimeType) {
  if (typeof mimeType === 'string' && mimeType.startsWith('audio/')) return 'video'
  return 'image'
}

function uploadRequest(config, { publicId, mimeType, buffer, timestamp }) {
  const type = 'authenticated'
  const signature = signParams({ public_id: publicId, timestamp, type }, config.apiSecret)
  return {
    url: `${API}/${config.cloudName}/${resourceTypeOf(mimeType)}/upload`,
    fields: {
      file: `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`,
      api_key: config.apiKey,
      timestamp,
      public_id: publicId,
      type,
      signature,
    },
  }
}

function downloadUrl(config, { publicId, resourceType, format, expiresAt, timestamp }) {
  const type = 'authenticated'
  const signed = { expires_at: expiresAt, format, public_id: publicId, timestamp, type }
  const signature = signParams(signed, config.apiSecret)
  const query = { api_key: config.apiKey, ...signed, signature }
  const qs = Object.keys(query).map(k => `${k}=${encodeURIComponent(String(query[k]))}`).join('&')
  return `${API}/${config.cloudName}/${resourceType}/download?${qs}`
}

function destroyRequest(config, { publicId, resourceType, timestamp }) {
  const type = 'authenticated'
  const signature = signParams({ public_id: publicId, timestamp, type }, config.apiSecret)
  return {
    url: `${API}/${config.cloudName}/${resourceType}/destroy`,
    fields: { public_id: publicId, type, api_key: config.apiKey, timestamp, signature },
  }
}

module.exports = { signParams, resourceTypeOf, uploadRequest, downloadUrl, destroyRequest }
