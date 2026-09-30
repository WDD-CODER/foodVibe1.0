#!/usr/bin/env node
/**
 * Fails if the client's BACKUP_ENTITY_TYPES (async-storage.service.ts) drifts from
 * the `backup: true` entries in server/constants/collections.js — the single source
 * of truth. Run: npm run lint:backup-entity-types
 * Exit 0 if they match, 1 and a diff otherwise.
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { join } from 'path'

const require = createRequire(import.meta.url)
const { BACKUP_ENTITY_TYPES: serverList } = require(join(process.cwd(), 'server/constants/collections.js'))

const clientPath = join(process.cwd(), 'src/app/core/services/async-storage.service.ts')
const clientSource = readFileSync(clientPath, 'utf8')

const match = clientSource.match(/BACKUP_ENTITY_TYPES\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
if (!match) {
  console.error('check-backup-entity-types: could not find BACKUP_ENTITY_TYPES in', clientPath)
  process.exit(1)
}

const clientList = [...match[1].matchAll(/'([^']+)'|ACTIVITY_STORAGE_KEY/g)]
  .map(m => m[1] ?? 'activity_log') // ACTIVITY_STORAGE_KEY resolves to 'activity_log'

const serverSet = new Set(serverList)
const clientSet = new Set(clientList)

const missingFromClient = serverList.filter(n => !clientSet.has(n))
const extraInClient = clientList.filter(n => !serverSet.has(n))

if (missingFromClient.length > 0 || extraInClient.length > 0) {
  console.error('check-backup-entity-types: client BACKUP_ENTITY_TYPES drifted from server collections.js (backup: true)')
  if (missingFromClient.length > 0) console.error('  missing from client:', missingFromClient.join(', '))
  if (extraInClient.length > 0) console.error('  extra in client (not backup:true on server):', extraInClient.join(', '))
  process.exit(1)
}

console.log('check-backup-entity-types: OK —', serverList.length, 'entries match')
