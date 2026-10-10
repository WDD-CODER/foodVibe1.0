#!/usr/bin/env node
/**
 * QA evidence server (plan 408) — lets the browser-only QA agent leave a PNG next to each finding.
 *
 *   GET  /health               → {"ok":true,"app":"<QA_APP>","loggedIn":true|false}
 *   GET  /html2canvas.min.js   → html2canvas from node_modules, for in-page captures
 *   POST /save                 → {run, name, dataUrl, url?, w?, h?} → bugs/qa-runs/<run>/shots/<name>.png
 *   GET  /shot?run&name&url&w&h&full=0|1&auth=1|0&wait=<ms>&selector=<css>
 *                              → Playwright render of <QA_APP><url> → same folder
 *
 * Env: QA_PORT (4206), QA_APP (http://localhost:4205), QA_API (http://localhost:3005), QA_USER, QA_PASS
 * (the last two fall back to `.env`, then `server/.env`).
 * Binds 127.0.0.1 only. Never logs the password or the token.
 *
 * Auth for /shot: one login at startup (POST /api/v1/auth/login), re-login when the access token
 * is near expiry or the API answers 401. The page gets the token + user in sessionStorage, and the
 * app's startup refresh call (local/slot builds auto-sign-in the guest when it fails) is answered
 * with the same token, so no refresh cookie and no refresh rate limit is involved.
 */
import { createServer } from 'http'
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')

const PORT = Number(process.env.QA_PORT || 4206)
const APP = (process.env.QA_APP || 'http://localhost:4205').replace(/\/$/, '')
const API = (process.env.QA_API || 'http://localhost:3005').replace(/\/$/, '')

/** QA_USER / QA_PASS from the environment, else from `.env` / `server/.env` — kept off command lines. */
function qaCredential(key) {
  if (process.env[key]) return process.env[key]
  for (const file of [join(repoRoot, '.env'), join(repoRoot, 'server', '.env')]) {
    if (!existsSync(file)) continue
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm').exec(readFileSync(file, 'utf8'))
    if (m) return m[1].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return ''
}

const QA_USER = qaCredential('QA_USER')
const QA_PASS = qaCredential('QA_PASS')

const BODY_LIMIT = 25 * 1024 * 1024
const SHOT_TIMEOUT_MS = 30_000
const LOADER_TEXT = 'רגע, מכינים הכל...'
const SAFE_NAME = /^[A-Za-z0-9._-]+$/
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const INSTALL_CMD = 'npx playwright install chromium'

// --- small helpers -----------------------------------------------------------

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', APP)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Vary', 'Origin')
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.end(body)
}

const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8')

function readBody(req) {
  return new Promise((ok, fail) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > BODY_LIMIT) {
        fail(Object.assign(new Error('body too large (25 MB max)'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', fail)
  })
}

function pngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return null
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

/** Writes the PNG + one index.tsv line; returns the repo-relative path. */
function storeShot(run, name, png, url, w, h, source) {
  const dir = join(repoRoot, 'bugs', 'qa-runs', run, 'shots')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.png`), png)
  const line = [new Date().toISOString(), name, url || '', `${w || '?'}×${h || '?'}`, `source=${source}`].join('\t')
  appendFileSync(join(dir, 'index.tsv'), `${line}\n`)
  return `bugs/qa-runs/${run}/shots/${name}.png`
}

function checkRunName(run, name) {
  if (!SAFE_NAME.test(run || '')) return 'run must match ^[A-Za-z0-9._-]+$'
  if (!SAFE_NAME.test(name || '')) return 'name must match ^[A-Za-z0-9._-]+$'
  if (run === '.' || run === '..' || name === '.' || name === '..') return 'run/name may not be . or ..'
  return null
}

// --- QA login ----------------------------------------------------------------

let session = null // { token, user, exp } — never logged
let loginInFlight = null

function tokenExp(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

async function login() {
  if (!QA_USER || !QA_PASS) throw new Error('QA_USER / QA_PASS are not set')
  const r = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: QA_USER, password: QA_PASS })
  })
  if (!r.ok) throw new Error(`login failed: HTTP ${r.status}`)
  const { token, user } = await r.json()
  if (!token || !user) throw new Error('login failed: response has no token/user')
  session = { token, user, exp: tokenExp(token) }
  return session
}

/** A session good for at least another 2 minutes; logs in again when needed. */
async function ensureSession(force = false) {
  if (!force && session && session.exp - Date.now() > 120_000) return session
  if (!loginInFlight) loginInFlight = login().finally(() => { loginInFlight = null })
  return loginInFlight
}

// --- Playwright ----------------------------------------------------------------

let browserPromise = null
let installHintPrinted = false

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('@playwright/test')
      return chromium.launch()
    })()
    browserPromise.catch(() => { browserPromise = null })
  }
  const browser = await browserPromise
  if (!browser.isConnected()) {
    browserPromise = null
    return getBrowser()
  }
  return browser
}

const isMissingBrowser = (err) => /Executable doesn't exist|playwright install/i.test(String(err && err.message))

async function renderShot({ url, w, h, full, auth, wait, selector }, onContext) {
  const browser = await getBrowser()
  const mobile = w < 700
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'he-IL'
  })
  onContext(context)
  try {
    if (auth) {
      const s = await ensureSession()
      // An API 401 means the token went bad early: the next shot signs in again.
      context.on('response', (r) => {
        if (r.status() === 401 && r.url().startsWith(`${API}/api/`) && session === s) session = null
      })
      await context.addInitScript(({ token, user }) => {
        sessionStorage.setItem('fv_token', token)
        sessionStorage.setItem('loggedInUser', JSON.stringify(user))
      }, { token: s.token, user: s.user })
      await context.route(`${API}/api/v1/auth/refresh`, (route) => {
        const headers = {
          'access-control-allow-origin': APP,
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'content-type, authorization',
          'access-control-allow-methods': 'POST, OPTIONS'
        }
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ token: s.token }) })
      })
    }
    const page = await context.newPage()
    await page.goto(`${APP}${url}`, { waitUntil: 'networkidle', timeout: 20_000 }).catch(() => {})
    await page.getByText(LOADER_TEXT).first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
    if (wait > 0) await page.waitForTimeout(Math.min(wait, 10_000))
    if (selector) {
      const el = page.locator(selector).first()
      await el.waitFor({ state: 'visible', timeout: 5_000 })
      return await el.screenshot()
    }
    return await page.screenshot({ fullPage: full })
  } finally {
    await context.close().catch(() => {})
  }
}

async function handleShot(req, res, q) {
  const run = q.get('run')
  const name = q.get('name')
  const url = q.get('url') || '/'
  const bad = checkRunName(run, name)
  if (bad) return send(res, 400, bad)
  if (!url.startsWith('/') || url.startsWith('//')) return send(res, 400, 'url must be a path starting with /')
  const w = Number(q.get('w') || 1280)
  const h = Number(q.get('h') || 800)
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 200 || h < 200 || w > 4000 || h > 4000) {
    return send(res, 400, 'w and h must be integers between 200 and 4000')
  }
  const opts = {
    url, w, h,
    full: q.get('full') === '1',
    auth: q.get('auth') !== '0',
    wait: Number(q.get('wait') || 0) || 0,
    selector: q.get('selector') || ''
  }

  let context = null
  let timer
  const timeout = new Promise((_, fail) => {
    timer = setTimeout(() => fail(Object.assign(new Error('shot timed out after 30 s'), { status: 504 })), SHOT_TIMEOUT_MS)
  })
  try {
    const png = await Promise.race([renderShot(opts, (c) => { context = c }), timeout])
    const size = pngSize(png) || { w, h }
    const rel = storeShot(run, name, png, url, size.w, size.h, 'playwright')
    return send(res, 200, rel)
  } catch (err) {
    if (context) await context.close().catch(() => {})
    if (isMissingBrowser(err)) {
      if (!installHintPrinted) {
        console.log(`QA evidence: Playwright chromium is not installed. Run once: ${INSTALL_CMD}`)
        installHintPrinted = true
      }
      return send(res, 503, `Playwright chromium is not installed on this PC. Run once: ${INSTALL_CMD}`)
    }
    if (/QA_USER|login failed/.test(err.message)) return send(res, 502, `cannot sign in as the QA user: ${err.message}`)
    return send(res, err.status || 500, `shot failed: ${err.message}`)
  } finally {
    clearTimeout(timer)
  }
}

async function handleSave(req, res) {
  // JSON only: a text/plain POST skips the CORS preflight, so any open web page could write files here.
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, 'content-type must be application/json')
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch (err) {
    return send(res, err.status || 400, err.status ? err.message : 'body must be JSON')
  }
  const { run, name, dataUrl, url } = body || {}
  const bad = checkRunName(run, name)
  if (bad) return send(res, 400, bad)
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec(typeof dataUrl === 'string' ? dataUrl : '')
  if (!m) return send(res, 400, 'dataUrl must be a data:image/png;base64,… URL')
  const png = Buffer.from(m[1], 'base64')
  const size = pngSize(png)
  if (!size) return send(res, 400, 'dataUrl is not a PNG')
  const w = Number(body.w) || size.w
  const h = Number(body.h) || size.h
  return send(res, 200, storeShot(run, name, png, typeof url === 'string' ? url : '', w, h, 'page'))
}

// --- server --------------------------------------------------------------------

const html2canvasPath = join(repoRoot, 'node_modules', 'html2canvas', 'dist', 'html2canvas.min.js')

const server = createServer(async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }
  const { pathname, searchParams } = new URL(req.url, `http://127.0.0.1:${PORT}`)
  try {
    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, { ok: true, app: APP, loggedIn: !!(session && session.exp > Date.now()) })
    }
    if (req.method === 'GET' && pathname === '/html2canvas.min.js') {
      if (!existsSync(html2canvasPath)) return send(res, 404, 'html2canvas is not installed - run npm install')
      return send(res, 200, readFileSync(html2canvasPath), 'application/javascript; charset=utf-8')
    }
    if (req.method === 'POST' && pathname === '/save') return await handleSave(req, res)
    if (req.method === 'GET' && pathname === '/shot') return await handleShot(req, res, searchParams)
    return send(res, 404, 'not found')
  } catch (err) {
    if (!res.headersSent) send(res, 500, `error: ${err.message}`)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`QA evidence: listening on http://127.0.0.1:${PORT} (app ${APP}, api ${API})`)
  ensureSession()
    .then(() => console.log('QA evidence: signed in as the QA user'))
    .catch((err) => console.log(`QA evidence: not signed in yet - ${err.message}`))
})

const shutdown = async () => {
  if (browserPromise) await browserPromise.then((b) => b.close()).catch(() => {})
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
