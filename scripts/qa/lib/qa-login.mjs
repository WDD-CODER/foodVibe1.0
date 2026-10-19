/**
 * QA login, shared by the evidence server (plan 408) and Code QA (plans 413-415).
 *
 * Credentials come from the environment, else from `.env` / `server/.env` of the checkout — never from a
 * command line, never printed. A session is { token, user, exp, refreshCookie }; nothing here logs it.
 *
 * A page is signed in the way the evidence server always did it: token + user go into sessionStorage
 * before the app boots, and the app's startup refresh call is answered with the same token, so no
 * refresh cookie and no refresh rate limit is involved.
 */
import { existsSync, readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** `key` from the environment, else from `.env` / `server/.env` under `root`; '' when absent. */
export function qaCredential(key, root = repoRoot) {
  if (process.env[key]) return process.env[key]
  for (const file of [join(root, '.env'), join(root, 'server', '.env')]) {
    if (!existsSync(file)) continue
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm').exec(readFileSync(file, 'utf8'))
    if (m) return m[1].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return ''
}

/** Access-token expiry in ms since epoch (0 when unreadable). */
export function tokenExp(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

/** The refresh cookie the login response set, as { name, value, path, expires } or null. */
function refreshCookieOf(response) {
  const all = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
  for (const raw of all) {
    const [pair, ...attrs] = raw.split(';').map((s) => s.trim())
    const eq = pair.indexOf('=')
    const name = pair.slice(0, eq)
    if (!/^fv_refresh/.test(name)) continue
    const attr = (k) => attrs.find((a) => a.toLowerCase().startsWith(`${k}=`))?.split('=').slice(1).join('=')
    const maxAge = Number(attr('max-age'))
    const expires = Number.isFinite(maxAge) && maxAge > 0
      ? Math.floor(Date.now() / 1000) + maxAge
      : attr('expires') ? Math.floor(Date.parse(attr('expires')) / 1000) : -1
    return { name, value: pair.slice(eq + 1), path: attr('path') || '/', expires }
  }
  return null
}

/**
 * Signs in once. `userKey` / `passKey` name the credential (QA_USER / QA_PASS by default; QA_USER2 /
 * QA_PASS2 for the second account). Throws 'QA_USER / QA_PASS are not set' or 'login failed: HTTP <n>'.
 */
export async function loginQa({ api, userKey = 'QA_USER', passKey = 'QA_PASS', root = repoRoot } = {}) {
  const name = qaCredential(userKey, root)
  const password = qaCredential(passKey, root)
  if (!name || !password) throw new Error(`${userKey} / ${passKey} are not set`)
  const r = await fetch(`${api.replace(/\/$/, '')}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, password })
  })
  if (!r.ok) throw new Error(`login failed: HTTP ${r.status}`)
  const { token, user } = await r.json()
  if (!token || !user) throw new Error('login failed: response has no token/user')
  return { token, user, exp: tokenExp(token), refreshCookie: refreshCookieOf(r) }
}

/**
 * Signs a Playwright browser context in as `session`: token + user in sessionStorage before any app code
 * runs, and the app's startup refresh call answered with the same token. `app` is the app origin (CORS
 * headers for builds that call the API cross-origin).
 */
export async function seedQaContext(context, session, app) {
  await context.addInitScript(({ token, user }) => {
    sessionStorage.setItem('fv_token', token)
    sessionStorage.setItem('loggedInUser', JSON.stringify(user))
  }, { token: session.token, user: session.user })
  await context.route('**/api/v1/auth/refresh', (route) => {
    const headers = {
      'access-control-allow-origin': app,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'POST, OPTIONS'
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ token: session.token }) })
  })
}

/** A Playwright storageState holding only the refresh cookie (for flows that reload and refresh for real). */
export function storageStateOf(session) {
  const c = session.refreshCookie
  if (!c) return { cookies: [], origins: [] }
  return {
    cookies: [{ name: c.name, value: c.value, domain: 'localhost', path: c.path, expires: c.expires, httpOnly: true, secure: false, sameSite: 'Lax' }],
    origins: []
  }
}
