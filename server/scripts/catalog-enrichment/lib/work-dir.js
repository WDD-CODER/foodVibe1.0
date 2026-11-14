'use strict'
/**
 * Plan 583: the catalog enrichment work folder and the local-only database connection.
 *
 * The work folder sits beside the main checkout (`<parent of main checkout>/foodvibe-catalog-work`), found through
 * `git rev-parse --git-common-dir`, so every worktree slot reads and writes the same files. Downloads, candidates,
 * decisions, the ledger, audits, the backup and the report live there; nothing from it is committed.
 */

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const MASTER = '__master__'
const LOCAL_ONLY = 'catalog enrichment is local only'

function workDir() {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: __dirname, encoding: 'utf8'
  }).trim()
  const mainCheckout = path.dirname(path.resolve(common))
  const dir = path.join(path.dirname(mainCheckout), 'foodvibe-catalog-work')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const workPath = (...parts) => path.join(workDir(), ...parts)

function readJson(file, fallback = undefined) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback
    throw new Error(`missing ${file}`)
  }
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

/**
 * Reads `--target=` (required) and the flags a script allows. Any target but `local` throws.
 * @returns {{ target: 'local', write: boolean, [flag: string]: string | boolean }}
 */
function parseArgs(argv, allowed = []) {
  const args = { write: false }
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue }
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg)
    if (!m || (m[1] !== 'target' && !allowed.includes(m[1]))) throw new Error(`Unknown argument: ${arg}`)
    args[m[1]] = m[2] ?? true
  }
  assertLocal(args.target)
  return args
}

function assertLocal(target) {
  if (target !== 'local') throw new Error(LOCAL_ONLY)
}

/** Connects to the local database with the driver mongoose ships (no extra package). */
async function connectLocal(target) {
  assertLocal(target)
  const { loadServerEnv, mongoUri } = require('../../../utils/db-target')
  loadServerEnv('local')
  const { MongoClient } = require('mongoose').mongo
  const client = new MongoClient(mongoUri('local'), { serverSelectionTimeoutMS: 30000 })
  await client.connect()
  const db = client.db()
  console.log(`[catalog] target=local database=${db.databaseName}`)
  return { client, db }
}

/** Runs a script's main and turns any error into one line and exit 1. */
function runMain(main) {
  main().catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}

module.exports = { MASTER, LOCAL_ONLY, workDir, workPath, readJson, writeJson, parseArgs, assertLocal, connectLocal, runMain }
