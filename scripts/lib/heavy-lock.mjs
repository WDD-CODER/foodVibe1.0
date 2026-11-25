/**
 * One heavy job on this PC at a time. Test suites use every core: two at once each run 2–3 times slower. Every kit
 * script that runs a gate, a merge check, the final gate or local CI takes this lock first, whichever session, project
 * or run started it; builders and reviewers (model calls, mostly waiting) never take it.
 *
 * The lock is a folder under ~/.ai-workflow-kit/ (KIT_HEAVY_LOCK_DIR overrides it); creating a folder is atomic. Its
 * owner.json names the holder's pid, label and start. A holder whose process is gone is taken over at once (by an
 * atomic rename, so only one waiter wins). Two gates of one process (run-plans --concurrency 2) take turns too. The
 * holder sets KIT_HEAVY_LOCK_HELD=<pid> in its environment, so the commands it starts never wait for their own job.
 * KIT_HEAVY_LOCK=off turns it off; under `node --test` it is off unless KIT_HEAVY_LOCK=on (a test's fake gates).
 *
 *   import { holdHeavyLock, holdHeavyLockSync } from './lib/heavy-lock.mjs'
 *   const release = await holdHeavyLock('the plan gate'); try { … } finally { release() }
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const WAIT_MS = 2000
const SAY_EVERY_MS = 60_000
// A folder that is still being made or removed on Windows answers EPERM / EACCES / EBUSY: held, try again.
const BUSY = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY'])
const rmQuiet = (p) => { try { rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* next try */ } }

export const lockDir = (env = process.env) => join(env.KIT_HEAVY_LOCK_DIR || join(homedir(), '.ai-workflow-kit'), 'heavy.lock')

function alive(pid) {
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

function owner(dir) {
  try { return JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8')) } catch { return null }
}

/**
 * Whether this process should take the lock: not when it is off, under a test runner, or when a parent process holds
 * it now (KIT_HEAVY_LOCK_HELD names another pid and the lock's owner is that pid). This process itself always takes it:
 * a second gate of one process waits for the first.
 */
export function lockWanted(env = process.env) {
  if (env.KIT_HEAVY_LOCK === 'off') return false
  if (env.NODE_TEST_CONTEXT && env.KIT_HEAVY_LOCK !== 'on') return false
  const held = Number(env.KIT_HEAVY_LOCK_HELD)
  if (held && held !== process.pid && owner(lockDir(env))?.pid === held && alive(held)) return false
  return true
}

/** One try: { got: true } or { got: false, holder }. A holder that is gone is renamed away (one waiter wins) and retried. */
function tryTake(dir, label, say) {
  for (let i = 0; i < 2; i++) {
    try {
      mkdirSync(join(dir, '..'), { recursive: true })
      mkdirSync(dir)
      writeFileSync(join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, label, at: new Date().toISOString() }))
      return { got: true }
    } catch (e) {
      if (!BUSY.has(e.code)) throw e
      const o = owner(dir)
      // No owner.json: another process is between its mkdir and its write (wait), or died there (30 s on: take over).
      let orphan = false
      if (!o) { try { orphan = Date.now() - statSync(dir).mtimeMs > 30_000 } catch { continue } }
      if (orphan || (o && o.pid !== process.pid && !alive(o.pid))) {
        const gone = `${dir}.gone-${process.pid}-${Date.now()}`
        try { renameSync(dir, gone) } catch { return { got: false, holder: owner(dir) } }
        say(`HEAVY_LOCK: taken over — ${o ? `${o.label} (pid ${o.pid}) is gone` : 'a holder that never wrote its name'}`)
        rmQuiet(gone)
        continue
      }
      return { got: false, holder: o }
    }
  }
  return { got: false, holder: owner(dir) }
}

function releaser(dir, env) {
  let done = false
  const prev = env.KIT_HEAVY_LOCK_HELD
  env.KIT_HEAVY_LOCK_HELD = String(process.pid)
  const release = () => {
    if (done) return
    done = true
    if (prev === undefined) delete env.KIT_HEAVY_LOCK_HELD
    else env.KIT_HEAVY_LOCK_HELD = prev
    if (owner(dir)?.pid === process.pid) rmQuiet(dir)
    process.off('exit', release)
  }
  process.on('exit', release)
  return release
}

const waitingLine = (h) => `HEAVY_LOCK: waiting — ${h?.label ?? 'another heavy job'}${h?.pid ? ` (pid ${h.pid})` : ''} holds it${h?.at ? ` since ${String(h.at).slice(11, 16)} UTC` : ''}; one heavy job on this PC at a time`

/** Wait for the lock (async); returns release(). No lock wanted: returns a no-op. */
export async function holdHeavyLock(label, { env = process.env, say = (l) => console.log(l), waitMs = WAIT_MS } = {}) {
  if (!lockWanted(env)) return () => {}
  const dir = lockDir(env)
  let last = 0
  for (;;) {
    const t = tryTake(dir, label, say)
    if (t.got) return releaser(dir, env)
    if (Date.now() - last >= SAY_EVERY_MS) { say(waitingLine(t.holder)); last = Date.now() }
    await new Promise((r) => setTimeout(r, waitMs))
  }
}

/** The same, blocking (for the scripts whose gate runs synchronously). */
export function holdHeavyLockSync(label, { env = process.env, say = (l) => console.log(l), waitMs = WAIT_MS } = {}) {
  if (!lockWanted(env)) return () => {}
  const dir = lockDir(env)
  const sleeper = new Int32Array(new SharedArrayBuffer(4))
  let last = 0
  for (;;) {
    const t = tryTake(dir, label, say)
    if (t.got) return releaser(dir, env)
    if (Date.now() - last >= SAY_EVERY_MS) { say(waitingLine(t.holder)); last = Date.now() }
    Atomics.wait(sleeper, 0, 0, waitMs)
  }
}

/** Who holds the lock now ({ pid, label, at } or null) — for a status line. */
export function heavyLockHolder(env = process.env) {
  const dir = lockDir(env)
  return existsSync(dir) ? owner(dir) : null
}

// CLI, for a heavy command typed by hand or run by an agent:
//   node scripts/lib/heavy-lock.mjs run -- <command…>   wait for the lock, run the command, free the lock, exit with its code
//   node scripts/lib/heavy-lock.mjs status              who holds it now (HEAVY_LOCK: free | held by …)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [verb, ...rest] = process.argv.slice(2)
  if (verb === 'status') {
    const h = heavyLockHolder()
    // A holder that is gone counts as free: the next job takes the lock over at once.
    if (h && !alive(h.pid)) console.log(`HEAVY_LOCK: free (left by ${h.label}, pid ${h.pid}, which is gone)`)
    else console.log(h ? `HEAVY_LOCK: held by ${h.label} (pid ${h.pid}) since ${String(h.at).slice(11, 16)} UTC` : 'HEAVY_LOCK: free')
  } else if (verb === 'run' && rest[0] === '--' && rest.length > 1) {
    const command = rest.slice(1).join(' ')
    const release = holdHeavyLockSync(`${command.slice(0, 60)} (by hand)`)
    let code = 1
    try { code = spawnSync(command, { shell: true, stdio: 'inherit', env: process.env }).status ?? 1 } finally { release() }
    process.exit(code)
  } else {
    console.error('usage: node scripts/lib/heavy-lock.mjs run -- <command…> | status')
    process.exit(1)
  }
}
