/**
 * Remote proxy — plan 388. One public origin in front of a checkout's dev servers, so a
 * tunnel can expose the whole app on one URL:
 *   /api/*        → localhost:<be>   (backend)
 *   everything else → localhost:<fe> (Angular dev server, incl. the live-reload WebSocket)
 *
 * Host / Origin / Referer are rewritten to localhost so the dev server's host check and the
 * backend's ALLOWED_ORIGIN CORS check accept the request unchanged.
 *
 * Secret gate: `?k=<token>` sets an HttpOnly cookie and redirects to the same URL without
 * `k`; any request without that cookie gets 403. The cookie is stripped before forwarding,
 * so the secret never reaches the app servers or their logs.
 */
import http from 'node:http'
import net from 'node:net'
import { timingSafeEqual } from 'node:crypto'

export const GATE_COOKIE = 'fv_remote'

/** Cookie header → { name: value }. */
export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

/** Constant-time compare; false for anything that isn't the token. */
export function tokenMatches(given, token) {
  const a = Buffer.from(String(given ?? ''))
  const b = Buffer.from(String(token))
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Backend for /api, dev server for the rest. */
export function targetPort(url, { fePort, bePort }) {
  const path = url.split('?')[0]
  return path === '/api' || path.startsWith('/api/') ? bePort : fePort
}

/**
 * What the gate does with a request:
 *   { action: 'pass' } | { action: 'redirect', location, setCookie } | { action: 'deny' }
 */
export function gate(req, token) {
  const url = new URL(req.url, 'http://proxy.local')
  if (url.searchParams.has('k')) {
    if (!tokenMatches(url.searchParams.get('k'), token)) return { action: 'deny' }
    url.searchParams.delete('k')
    return {
      action: 'redirect',
      location: url.pathname + url.search,
      setCookie: `${GATE_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/`
    }
  }
  const cookies = parseCookies(req.headers.cookie)
  return tokenMatches(cookies[GATE_COOKIE], token) ? { action: 'pass' } : { action: 'deny' }
}

/** Request headers as the local servers expect them (localhost host/origin, no gate cookie). */
export function rewriteHeaders(headers, port, fePort) {
  const out = { ...headers, host: `localhost:${port}` }
  const local = `http://localhost:${fePort}`
  if (out.origin) out.origin = local
  if (out.referer) {
    try {
      const r = new URL(out.referer)
      out.referer = local + r.pathname + r.search
    } catch {
      delete out.referer
    }
  }
  if (out.cookie) {
    const kept = out.cookie
      .split(';')
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith(`${GATE_COOKIE}=`))
    if (kept.length) out.cookie = kept.join('; ')
    else delete out.cookie
  }
  return out
}

/** HTTP server proxying to the checkout's dev servers behind the secret gate. */
export function createRemoteProxy({ fePort, bePort, token }) {
  const server = http.createServer((req, res) => {
    const g = gate(req, token)
    if (g.action === 'deny') {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('Forbidden — open the full link with ?k=…')
    }
    if (g.action === 'redirect') {
      res.writeHead(302, { location: g.location, 'set-cookie': g.setCookie, 'cache-control': 'no-store' })
      return res.end()
    }
    const port = targetPort(req.url, { fePort, bePort })
    const upstream = http.request(
      { host: 'localhost', port, method: req.method, path: req.url, headers: rewriteHeaders(req.headers, port, fePort) },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers)
        up.pipe(res)
      }
    )
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Bad gateway — is the dev server running?')
    })
    req.pipe(upstream)
  })

  server.on('upgrade', (req, socket, head) => {
    if (gate(req, token).action !== 'pass') return socket.destroy()
    const port = targetPort(req.url, { fePort, bePort })
    const upstream = net.connect(port, 'localhost', () => {
      const headers = rewriteHeaders(req.headers, port, fePort)
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`]
      for (const [k, v] of Object.entries(headers)) {
        for (const value of Array.isArray(v) ? v : [v]) lines.push(`${k}: ${value}`)
      }
      upstream.write(lines.join('\r\n') + '\r\n\r\n')
      if (head?.length) upstream.write(head)
      socket.pipe(upstream).pipe(socket)
    })
    upstream.on('error', () => socket.destroy())
    socket.on('error', () => upstream.destroy())
  })

  return server
}
