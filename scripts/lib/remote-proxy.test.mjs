// Plan 388 — run: node --test scripts/lib/remote-proxy.test.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createRemoteProxy, GATE_COOKIE } from './remote-proxy.mjs'

const TOKEN = 'secret-token-123'
let fe, be, proxy, fePort, bePort, proxyPort

/** Throwaway server that echoes who it is and the headers it received. */
function echoServer(name) {
  return http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ name, url: req.url, host: req.headers.host, origin: req.headers.origin ?? null, cookie: req.headers.cookie ?? null }))
  })
}

const listen = (server) => new Promise((resolve) => server.listen(0, 'localhost', () => resolve(server.address().port)))

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: 'localhost', port: proxyPort, path, headers }, (res) => {
        let body = ''
        res.on('data', (d) => (body += d))
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
      })
      .on('error', reject)
  })
}

before(async () => {
  fe = echoServer('fe')
  be = echoServer('be')
  fePort = await listen(fe)
  bePort = await listen(be)
  proxy = createRemoteProxy({ fePort, bePort, token: TOKEN })
  proxyPort = await listen(proxy)
})

after(() => {
  for (const s of [proxy, fe, be]) s.close()
})

const authed = { cookie: `${GATE_COOKIE}=${TOKEN}` }

test('no cookie → 403', async () => {
  const r = await get('/')
  assert.equal(r.status, 403)
})

test('wrong token in ?k → 403', async () => {
  const r = await get('/?k=nope')
  assert.equal(r.status, 403)
})

test('wrong cookie → 403', async () => {
  const r = await get('/', { cookie: `${GATE_COOKIE}=nope` })
  assert.equal(r.status, 403)
})

test('?k=<token> → 302 to the same URL without k, sets the gate cookie', async () => {
  const r = await get(`/recipe-book?order=asc&k=${TOKEN}`)
  assert.equal(r.status, 302)
  assert.equal(r.headers.location, '/recipe-book?order=asc')
  assert.match(String(r.headers['set-cookie']), new RegExp(`^${GATE_COOKIE}=${TOKEN}; HttpOnly; Secure`))
})

test('with cookie: /api/* goes to the backend, the rest to the frontend', async () => {
  const api = JSON.parse((await get('/api/v1/data/recipes', authed)).body)
  const page = JSON.parse((await get('/recipe-book', authed)).body)
  assert.equal(api.name, 'be')
  assert.equal(api.url, '/api/v1/data/recipes')
  assert.equal(page.name, 'fe')
})

test('Host and Origin are rewritten to localhost; the gate cookie is not forwarded', async () => {
  const r = JSON.parse(
    (await get('/api/x', { ...authed, cookie: `${GATE_COOKIE}=${TOKEN}; fv_refresh_3003=abc`, origin: 'https://abc.trycloudflare.com' })).body
  )
  assert.equal(r.host, `localhost:${bePort}`)
  assert.equal(r.origin, `http://localhost:${fePort}`)
  assert.equal(r.cookie, 'fv_refresh_3003=abc')
})
