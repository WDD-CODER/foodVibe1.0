const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { targetFromEnv, parseTarget, loadServerEnv, mongoUri } = require('../utils/db-target')

let dir
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbt-')) })
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

describe('loadServerEnv', () => {
  it('local never reads .env.live', () => {
    fs.writeFileSync(path.join(dir, '.env.live'), 'MONGO_URI=secret-live\n')
    const env = {}
    loadServerEnv('local', { serverDir: dir, env })
    expect(env.MONGO_URI).toBeUndefined()
  })
  it('local loads .env', () => {
    fs.writeFileSync(path.join(dir, '.env'), 'MONGO_LOCAL_URI=mongodb://l/x\n')
    const env = {}
    loadServerEnv('local', { serverDir: dir, env })
    expect(env.MONGO_LOCAL_URI).toBe('mongodb://l/x')
  })
  it('atlas loads .env.live and overrides', () => {
    fs.writeFileSync(path.join(dir, '.env'), 'MONGO_URI=old\n')
    fs.writeFileSync(path.join(dir, '.env.live'), 'MONGO_URI=secret-live\n')
    const env = {}
    loadServerEnv('atlas', { serverDir: dir, env })
    expect(env.MONGO_URI).toBe('secret-live')
  })
  it('atlas without file and without MONGO_URI throws', () => {
    expect(() => loadServerEnv('atlas', { serverDir: dir, env: {} })).toThrow(/\.env\.live not found/)
  })
  it('atlas without file but MONGO_URI in env works (Render)', () => {
    const env = { MONGO_URI: 'render-uri' }
    expect(() => loadServerEnv('atlas', { serverDir: dir, env })).not.toThrow()
    expect(env.MONGO_URI).toBe('render-uri')
  })
})

describe('mongoUri', () => {
  it('local has no fallback to MONGO_URI and the message holds no URI', () => {
    let msg = ''
    try { mongoUri('local', { env: { MONGO_URI: 'secret-live' } }) } catch (e) { msg = e.message }
    expect(msg).toMatch(/MONGO_LOCAL_URI is not set/)
    expect(msg).not.toContain('secret-live')
  })
  it('atlas needs MONGO_URI', () => {
    expect(() => mongoUri('atlas', { env: { MONGO_LOCAL_URI: 'x' } })).toThrow(/MONGO_URI is not set/)
    expect(mongoUri('atlas', { env: { MONGO_URI: 'a' } })).toBe('a')
  })
  it('local returns MONGO_LOCAL_URI', () => {
    expect(mongoUri('local', { env: { MONGO_LOCAL_URI: 'l' } })).toBe('l')
  })
})

describe('targetFromEnv', () => {
  it('defaults', () => {
    expect(targetFromEnv({})).toBe('local')
    expect(targetFromEnv({ NODE_ENV: 'development' })).toBe('local')
    expect(targetFromEnv({ NODE_ENV: 'production' })).toBe('atlas')
    expect(targetFromEnv({ DB_TARGET: 'atlas' })).toBe('atlas')
    expect(() => targetFromEnv({ DB_TARGET: 'x' })).toThrow("DB_TARGET must be 'local' or 'atlas'")
  })
})

describe('parseTarget', () => {
  it('parses', () => {
    expect(parseTarget([])).toBe('local')
    expect(parseTarget(['--target=atlas'])).toBe('atlas')
    expect(() => parseTarget(['--target=prod'])).toThrow(/must be/)
    expect(() => parseTarget([], { required: true })).toThrow('--target=local|atlas is required')
  })
})
