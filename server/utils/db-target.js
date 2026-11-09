'use strict'
/**
 * The one place that decides local or Atlas (plan 530). Local is the default; only the
 * `atlas` target ever opens server/.env.live. No error message contains a URI.
 */
const fs = require('node:fs')
const path = require('node:path')
const dotenv = require('dotenv')

const defaultServerDir = () => path.resolve(__dirname, '..')

function targetFromEnv(env = process.env) {
  if (env.DB_TARGET !== undefined && env.DB_TARGET !== '') {
    if (env.DB_TARGET === 'local' || env.DB_TARGET === 'atlas') return env.DB_TARGET
    throw new Error("DB_TARGET must be 'local' or 'atlas'")
  }
  return env.NODE_ENV === 'production' ? 'atlas' : 'local'
}

function parseTarget(argv, { required = false } = {}) {
  const arg = argv.find(a => a.startsWith('--target='))
  if (arg === undefined) {
    if (required) throw new Error('--target=local|atlas is required')
    return 'local'
  }
  const value = arg.slice('--target='.length)
  if (value !== 'local' && value !== 'atlas') throw new Error("--target must be 'local' or 'atlas'")
  return value
}

function loadFile(file, env, override) {
  const parsed = dotenv.parse(fs.readFileSync(file))
  for (const [k, v] of Object.entries(parsed)) {
    if (override || env[k] === undefined) env[k] = v
  }
}

function loadServerEnv(target, { serverDir = defaultServerDir(), env = process.env } = {}) {
  const base = path.join(serverDir, '.env')
  if (fs.existsSync(base)) loadFile(base, env, false)
  if (target !== 'atlas') return
  const live = path.join(serverDir, '.env.live')
  if (fs.existsSync(live)) {
    loadFile(live, env, true)
  } else if (!env.MONGO_URI) {
    throw new Error('server/.env.live not found — the Atlas URI lives only there (see server/.env.example)')
  }
}

function mongoUri(target, { env = process.env } = {}) {
  if (target === 'atlas') {
    if (!env.MONGO_URI) throw new Error("MONGO_URI is not set (server/.env.live, or the host's environment on Render)")
    return env.MONGO_URI
  }
  if (!env.MONGO_LOCAL_URI) throw new Error('MONGO_LOCAL_URI is not set in server/.env')
  return env.MONGO_LOCAL_URI
}

module.exports = { targetFromEnv, parseTarget, loadServerEnv, mongoUri }
