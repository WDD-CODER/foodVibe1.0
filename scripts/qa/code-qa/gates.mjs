/**
 * Code QA layer 1 — gates (plan 413): the project's own build, lint and test commands.
 * A failed build ends the run (BLOCKED.md); any other failure is an S2 finding with the last 30 output lines.
 */
import { spawn } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { redact } from './findings.mjs'

export const GATES = [
  { id: 'build', cmd: 'npx ng build -c slot', timeoutMs: 20 * 60_000, blocking: true },
  { id: 'lint', cmd: 'npm run lint', timeoutMs: 10 * 60_000 },
  { id: 'lint-icons', cmd: 'npm run lint:icons', timeoutMs: 5 * 60_000 },
  { id: 'lint-no-native-select', cmd: 'npm run lint:no-native-select', timeoutMs: 5 * 60_000 },
  { id: 'unit-tests', cmd: 'npx ng test --watch=false --browsers=ChromeHeadless', timeoutMs: 25 * 60_000 },
  { id: 'server-tests', cmd: 'npm test --prefix server', timeoutMs: 15 * 60_000 }
]

/** Runs one shell command; resolves { code, out, timedOut }. Never rejects. */
export function runCommand(cmd, { cwd, timeoutMs, signal }) {
  return new Promise((done) => {
    const child = spawn(cmd, { cwd, shell: true, env: { ...process.env, CI: '1', FORCE_COLOR: '0', NG_CLI_ANALYTICS: 'false' } })
    let out = ''
    const add = (b) => { out = (out + b.toString()).slice(-200_000) }
    child.stdout.on('data', add)
    child.stderr.on('data', add)
    let timedOut = false
    const kill = () => {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: false })
      else child.kill('SIGKILL')
    }
    const timer = setTimeout(() => { timedOut = true; kill() }, timeoutMs)
    signal?.addEventListener('abort', () => { timedOut = true; kill() }, { once: true })
    child.on('close', (code) => { clearTimeout(timer); done({ code: code ?? 1, out, timedOut }) })
    child.on('error', (err) => { clearTimeout(timer); done({ code: 1, out: out + String(err), timedOut }) })
  })
}

const tail = (text, n = 30) => redact(text.replace(/\x1b\[[0-9;]*m/g, '')).split(/\r?\n/).filter((l) => l.trim()).slice(-n).join('\n')

/**
 * Runs every gate in order. Returns { status, durationMs, coverage, coveredPages, findings, blocked }.
 * `blockedDir` gets BLOCKED.md when the build fails.
 */
export async function runGates({ root, blockedDir, signal, gates = GATES, log = () => {} }) {
  const started = Date.now()
  const findings = []
  const ran = []
  for (const g of gates) {
    if (signal?.aborted) break
    const t0 = Date.now()
    const r = await runCommand(g.cmd, { cwd: root, timeoutMs: g.timeoutMs, signal })
    const secs = Math.round((Date.now() - t0) / 1000)
    ran.push(`${g.id} ${r.code === 0 ? 'ok' : r.timedOut ? 'timeout' : 'fail'} ${secs}s`)
    log(`gate ${g.id} -> ${r.code === 0 ? 'ok' : `exit ${r.code}${r.timedOut ? ' (timed out)' : ''}`} (${secs}s)`)
    if (r.code === 0) continue
    if (g.blocking) {
      mkdirSync(blockedDir, { recursive: true })
      writeFileSync(join(blockedDir, 'BLOCKED.md'), [
        `# Code QA blocked — ${g.id} failed`,
        '',
        `Command: \`${g.cmd}\` exited ${r.code}${r.timedOut ? ' (timed out)' : ''}. Later layers were skipped.`,
        '',
        '```',
        tail(r.out, 60),
        '```',
        ''
      ].join('\n'), 'utf8')
      return {
        status: 'fail', durationMs: Date.now() - started, coverage: ran.join(' · '), coveredPages: '*',
        blocked: `${g.id} failed (\`${g.cmd}\`) — see BLOCKED.md`,
        findings: [{ check: g.id, page: 'GLOBAL', locator: g.cmd, severity: 'S1', type: 'BUILD', title: `${g.id} fails`, where: g.cmd, actual: `exit ${r.code}`, detail: tail(r.out) }]
      }
    }
    findings.push({
      check: g.id, page: 'GLOBAL', locator: g.cmd, severity: 'S2', type: 'GATE',
      title: `${g.id} ${r.timedOut ? 'timed out' : 'fails'}`, where: g.cmd,
      expected: 'exit 0', actual: r.timedOut ? `no result after ${Math.round(g.timeoutMs / 60_000)} min` : `exit ${r.code}`,
      detail: tail(r.out)
    })
  }
  const partial = signal?.aborted && ran.length < gates.length
  return {
    status: partial ? 'partial' : 'ok', durationMs: Date.now() - started,
    // A partial run covers nothing, so an unrun gate's old finding is never marked gone.
    coverage: `${ran.length}/${gates.length} commands — ${ran.join(' · ')}`, coveredPages: partial ? [] : '*', findings
  }
}
