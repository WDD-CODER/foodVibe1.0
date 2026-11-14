import test from 'node:test'
import assert from 'node:assert/strict'
import { withApiAuth } from '../qa/lib/styleqa-sign-in.mjs'

function fake() {
  const calls = []
  return { calls, get(url, opts) { calls.push({ url, opts, self: this }); return Promise.resolve('ok') } }
}
const API = 'http://localhost:3001'

test('an API URL gets the bearer header', async () => {
  const req = fake()
  withApiAuth(req, API, 'tok')
  assert.equal(await req.get(`${API}/api/v1/data/venues`), 'ok')
  assert.equal(req.calls[0].opts.headers.authorization, 'Bearer tok')
  assert.equal(req.calls[0].self, req)
})

test("a caller's own headers are kept", async () => {
  const req = fake()
  withApiAuth(req, API, 'tok')
  await req.get(`${API}/x`, { headers: { 'x-a': '1' }, timeout: 5 })
  assert.equal(req.calls[0].opts.headers['x-a'], '1')
  assert.equal(req.calls[0].opts.headers.authorization, 'Bearer tok')
  assert.equal(req.calls[0].opts.timeout, 5)
})

test('a URL on another origin gets no header', async () => {
  const req = fake()
  withApiAuth(req, API, 'tok')
  await req.get('https://fonts.example.com/a.css')
  assert.equal(req.calls[0].opts?.headers?.authorization, undefined)
})
