#!/usr/bin/env node
/**
 * Remote port — plan 388. Opens a temporary, secret-gated public https link to this
 * checkout's running app (Planner main folder or a wt-N slot), for validating away from home.
 *
 * Usage:
 *   node scripts/remote-port.mjs on [--hours=3]   start (or reprint) the link
 *   node scripts/remote-port.mjs off              stop it
 *   node scripts/remote-port.mjs status           on (link, expiry) / off
 *
 * How: a local proxy on 4290+N (main = 4290) routes /api → backend, the rest → frontend,
 * behind a secret cookie gate (scripts/lib/remote-proxy.mjs); a Cloudflare quick tunnel
 * (`cloudflared`, no account) points at the proxy. The proxy process owns the tunnel and
 * stops both at the time limit. State: .worktree-remote (gitignored). Log: .claude/remote.log.
 */
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, openSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import { randomBytes } from 'node:crypto'
import { slotNumber, ports } from './lib/slot.mjs'
import { createRemoteProxy } from './lib/remote-proxy.mjs'

const thisFile = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(thisFile), '..')
const STATE = join(repoRoot, '.worktree-remote')
const LOG = join(repoRoot, '.claude', 'remote.log')
const isWin = process.platform === 'win32'
const n = slotNumber() ?? 0
const { fe, be } = ports() ?? { fe: 4200, be: 3000 }
const proxyPort = 4290 + n
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
const URL_TIMEOUT_MS = 45_000

const [cmd = 'status', ...rest] = process.argv.slice(2)
const arg = (name) => rest.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)

function fail(msg) {
  console.log(`REMOTE: ${msg}`)
  process.exit(1)
}

function readState() {
  try {
    return JSON.parse(readFileSync(STATE, 'utf8'))
  } catch {
    return null
  }
}

function removeState() {
  try {
    unlinkSync(STATE)
  } catch {
    // already gone
  }
}

function alive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}

/** Kills a process and its children. Args array, no shell — Git Bash would rewrite `/PID`. */
function killTree(pid) {
  if (!alive(pid)) return
  if (isWin) spawnSync('taskkill', ['/T', '/F', '/PID', String(pid)], { stdio: 'ignore', windowsHide: true })
  else {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // gone
    }
  }
}

function listening(port) {
  return new Promise((resolvePort) => {
    const s = net.connect(port, 'localhost')
    s.once('connect', () => {
      s.destroy()
      resolvePort(true)
    })
    s.once('error', () => resolvePort(false))
  })
}

function findCloudflared() {
  try {
    const out = execFileSync(isWin ? 'where' : 'which', ['cloudflared'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const first = out.split(/\r?\n/).find(Boolean)
    if (first) return first.trim()
  } catch {
    // not on PATH
  }
  const candidates = isWin
    ? [
        'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
        'C:\\Program Files\\cloudflared\\cloudflared.exe',
        join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe')
      ]
    : ['/usr/local/bin/cloudflared', '/opt/homebrew/bin/cloudflared']
  return candidates.find((p) => p && existsSync(p)) ?? null
}

const link = (s) => `${s.url}/?k=${s.token}`
const when = (ms) => new Date(ms).toLocaleString()
const printOn = (s) => console.log(`REMOTE: on url=${link(s)} expires=${when(s.expiresAt)} (${s.fe}/${s.be} via ${s.proxyPort})`)

async function on() {
  const existing = readState()
  if (existing && alive(existing.pid) && existing.url) return printOn(existing)
  if (existing) removeState()

  const hours = Number(arg('hours') ?? 3)
  if (!(hours > 0 && hours <= 12)) fail('--hours must be between 0 and 12')
  if (!(await listening(fe))) fail(`frontend not running on ${fe} — start the dev servers first`)
  if (!(await listening(be))) fail(`backend not running on ${be} — start the dev servers first`)
  if (await listening(proxyPort)) fail(`port ${proxyPort} is already in use — run "off" or free it`)
  const cf = findCloudflared()
  if (!cf) fail('cloudflared is not installed — one-time: winget install --id Cloudflare.cloudflared')

  const token = randomBytes(24).toString('base64url')
  const logFd = openSync(LOG, 'w')
  // The secret goes through the environment, not argv, so it doesn't show in process lists.
  const child = spawn(process.execPath, [thisFile, '__serve', `--hours=${hours}`, `--cf=${cf}`], {
    cwd: repoRoot,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, REMOTE_TOKEN: token }
  })
  child.unref()

  const deadline = Date.now() + URL_TIMEOUT_MS + 5_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500))
    const s = readState()
    if (s?.url && s.pid === child.pid) return printOn(s)
    if (!alive(child.pid)) break
  }
  killTree(child.pid)
  const tail = existsSync(LOG) ? readFileSync(LOG, 'utf8').split(/\r?\n/).filter(Boolean).slice(-8).join('\n  ') : ''
  fail(`tunnel did not come up — log tail:\n  ${tail}`)
}

function off() {
  const s = readState()
  if (s) {
    killTree(s.pid)
    killTree(s.cfPid)
    removeState()
  }
  console.log('REMOTE: off')
}

function status() {
  const s = readState()
  if (s && alive(s.pid) && s.url) return printOn(s)
  if (s) removeState()
  console.log('REMOTE: off')
}

/** Detached worker: proxy + tunnel, writes the state file, stops both at the time limit. */
function serve() {
  const token = process.env.REMOTE_TOKEN
  const cf = arg('cf')
  const ttlMs = Number(arg('hours')) * 3600_000
  if (!token || !cf || !(ttlMs > 0)) process.exit(1)

  let tunnel = null
  let done = false
  const proxy = createRemoteProxy({ fePort: fe, bePort: be, token })

  const cleanup = (code = 0) => {
    if (done) return
    done = true
    if (tunnel && alive(tunnel.pid)) tunnel.kill()
    if (readState()?.pid === process.pid) removeState()
    proxy.close()
    console.log(`[remote] stopped (${code === 0 ? 'time limit / off' : 'error'})`)
    setTimeout(() => process.exit(code), 200)
  }
  process.on('SIGTERM', () => cleanup(0))
  process.on('SIGINT', () => cleanup(0))

  proxy.on('error', (e) => {
    console.log(`[remote] proxy error: ${e.message}`)
    cleanup(1)
  })
  proxy.listen(proxyPort, 'localhost', () => {
    console.log(`[remote] proxy on ${proxyPort} → fe ${fe} / be ${be}`)
    tunnel = spawn(cf, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${proxyPort}`], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const urlTimer = setTimeout(() => {
      console.log('[remote] no tunnel URL in time')
      cleanup(1)
    }, URL_TIMEOUT_MS)
    let found = false
    const onOutput = (chunk) => {
      const text = String(chunk)
      process.stdout.write(text)
      const m = !found && text.match(URL_RE)
      if (!m) return
      found = true
      clearTimeout(urlTimer)
      const expiresAt = Date.now() + ttlMs
      writeFileSync(STATE, JSON.stringify({ pid: process.pid, cfPid: tunnel.pid, url: m[0], token, proxyPort, fe, be, expiresAt }, null, 2))
      setTimeout(() => cleanup(0), ttlMs)
    }
    tunnel.stdout.on('data', onOutput)
    tunnel.stderr.on('data', onOutput)
    tunnel.on('exit', (code) => {
      console.log(`[remote] tunnel exited (${code})`)
      cleanup(found ? 0 : 1)
    })
  })
}

const commands = { on, off, status, __serve: serve }
if (!commands[cmd]) fail(`unknown command "${cmd}" — use on | off | status`)
await commands[cmd]()
