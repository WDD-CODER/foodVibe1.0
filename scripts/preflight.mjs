/**
 * Preflight — environment check before dev-server / browser / database work.
 *
 * Checks (one line each, `OK` or `FAIL: <reason>`):
 *   1. dev server answers on this checkout's port (.worktree-port, else 4200)
 *   2. MongoDB accepts a TCP connection (MONGO_PORT, else 27017)
 *   3. current branch is not the main branch
 *   4. log route: POST /api/v1/log on the slot's backend answers 202 (Plan 384)
 *   5. --visual only: gstack browse binary exists
 *
 * Exit 0 when every check passed, 1 otherwise, so a calling workflow can abort.
 * Node built-ins only — no mongosh/curl dependency, so it behaves the same on
 * Windows, Git Bash and CI.
 *
 * Usage: node scripts/preflight.mjs [--visual] [--port 4201]
 */
import { existsSync, readFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import net from 'net'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const argv = process.argv.slice(2)
const flagValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : null
}

// Dev server port: the slot's .worktree-port when inside a wt-N slot, else main's 4200.
const portFile = join(repoRoot, '.worktree-port')
const devPort = Number(flagValue('--port') ?? (existsSync(portFile) ? readFileSync(portFile, 'utf8').trim() : 4200))
const mongoPort = Number(process.env.MONGO_PORT ?? 27017)
// 3 s is enough for a local socket; a longer wait only delays the FAIL.
const TIMEOUT_MS = 3000
const MAIN_BRANCH = 'main'

const results = []
const report = (name, ok, reason = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : `: ${reason}`}`)
}

function httpStatus(port) {
  return new Promise((done) => {
    const req = http.get({ host: 'localhost', port, path: '/', timeout: TIMEOUT_MS }, (res) => {
      res.resume()
      done(res.statusCode)
    })
    req.on('timeout', () => { req.destroy(); done(null) })
    req.on('error', () => done(null))
  })
}

function tcpOpen(port) {
  return new Promise((done) => {
    const s = net.connect({ host: '127.0.0.1', port })
    s.setTimeout(TIMEOUT_MS)
    s.on('connect', () => { s.destroy(); done(true) })
    s.on('timeout', () => { s.destroy(); done(false) })
    s.on('error', () => done(false))
  })
}

const status = await httpStatus(devPort)
report(`dev server :${devPort}`, status === 200, status ? `HTTP ${status}` : `nothing listening — start it with \`npm start\` (main) or take a plan in the slot`)

const mongo = await tcpOpen(mongoPort)
report(`mongodb :${mongoPort}`, mongo, 'no TCP listener — start MongoDB first')

let branch = ''
try {
  branch = execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim()
} catch { /* detached HEAD prints empty, handled below */ }
report(`branch != ${MAIN_BRANCH}`, branch !== MAIN_BRANCH, `on ${MAIN_BRANCH} — all code goes through a feature/ fix/ chore/ branch`)

// Log route (Plan 384): the backend port is the frontend port - 1200 (a wt-N slot and main both follow it).
function postLog(port) {
  const body = JSON.stringify({ level: 'info', event: 'preflight.log.ok', message: 'preflight', timestamp: new Date().toISOString() })
  return new Promise((done) => {
    const req = http.request({ host: 'localhost', port, path: '/api/v1/log', method: 'POST', timeout: TIMEOUT_MS, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      res.resume()
      done(res.statusCode)
    })
    req.on('timeout', () => { req.destroy(); done(null) })
    req.on('error', () => done(null))
    req.end(body)
  })
}
const bePort = devPort - 1200
const logStatus = await postLog(bePort)
report(`log route :${bePort}/api/v1/log`, logStatus === 202, logStatus ? `HTTP ${logStatus}, expected 202` : 'backend not answering - start it with the dev server')

if (argv.includes('--visual')) {
  const gstack = join(homedir(), '.claude/skills/gstack/browse/dist/browse')
  // Windows builds ship browse.exe
  report('gstack browse binary', existsSync(gstack) || existsSync(gstack + '.exe'),`${gstack} missing — run gstack-upgrade`)
}

process.exit(results.every(Boolean) ? 0 : 1)
