/**
 * Child processes that never open a console window.
 *
 * Each wrapper is the matching `child_process` function with `windowsHide: true` added to its options; the arguments,
 * every other option and the return value (stdout, status, signal, error) stay as they were. `windowsHide` is ignored
 * on macOS and Linux. `{ showWindow: true, why: '<reason>' }` opts one call out of hiding; `showWindow` without a
 * `why` throws. `makeProc(cp)` builds the same set over another child_process object (the tests).
 *
 * Run as a script, this file is the hidden-console launcher (Windows dev servers):
 *   node proc.mjs --launch <shell 0|1> <command> [args...]
 * A detached Windows process has no console, so every console program it starts opens a window of its own. The
 * caller starts this launcher detached (it needs no console), and the launcher starts the real command NOT detached
 * with `windowsHide: true`: one hidden console that the whole chain (cmd.exe, cross-env, node --watch) shares. The
 * launcher keeps the command's stdio and exits with its exit code. Same shape as detachedOptions in run-supervisor.mjs.
 */
import * as realCp from 'child_process'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const isOptions = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** The call's arguments with hidden-window options: the options object is copied, or added (before a trailing callback). */
export function hideArgs(args) {
  const out = [...args]
  let idx = out.findIndex((v, i) => i > 0 && isOptions(v))
  if (idx === -1) {
    // an explicit undefined/null options slot is filled; otherwise one is added before a trailing callback
    const hole = out.findIndex((v, i) => i > 0 && v == null)
    if (hole !== -1) {
      idx = hole
      out[idx] = {}
    } else {
      idx = out.length > 1 && typeof out[out.length - 1] === 'function' ? out.length - 1 : Math.max(out.length, 1)
      out.splice(idx, 0, {})
    }
  }
  const { showWindow, why, ...rest } = out[idx]
  if (showWindow) {
    if (typeof why !== 'string' || !why.trim()) throw new Error('proc: showWindow needs a `why` (the reason this call may show a window)')
    delete rest.windowsHide
    out[idx] = rest
  } else {
    out[idx] = { ...rest, windowsHide: true }
  }
  return out
}

/** The six wrappers over a child_process object. */
export function makeProc(cp) {
  const wrap = (name) => (...args) => cp[name](...hideArgs(args))
  return {
    spawn: wrap('spawn'),
    spawnSync: wrap('spawnSync'),
    execFile: wrap('execFile'),
    execFileSync: wrap('execFileSync'),
    exec: wrap('exec'),
    execSync: wrap('execSync'),
  }
}

export const proc = makeProc(realCp)
export const { spawn, spawnSync, execFile, execFileSync, exec, execSync } = proc
export default proc

/** This file's path: what a caller passes to `node` to start the launcher. */
export const LAUNCHER = fileURLToPath(import.meta.url)

/** The launcher's argv for `cmd args` (`shell`: run as one command string through the shell, e.g. npm.cmd). */
export const launcherArgs = (cmd, args = [], shell = false) => [LAUNCHER, '--launch', shell ? '1' : '0', cmd, ...args]

/** The launcher itself: start the command not detached with a hidden console, pass its stdio and its exit code on. */
export function launch(argv, p = proc) {
  const [sh, cmd, ...args] = argv
  const opts = { stdio: 'inherit' }
  // a shell gets one command string, not an args array (DEP0190)
  const child = sh === '1' ? p.spawn([cmd, ...args].join(' '), { ...opts, shell: true }) : p.spawn(cmd, args, opts)
  child.on('error', (e) => {
    process.stderr.write(`proc launcher: ${cmd} did not start: ${e.message}\n`)
    process.exit(1)
  })
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
  return child
}

const self = (p) => {
  const n = resolve(p || '')
  return process.platform === 'win32' ? n.toLowerCase() : n
}
if (process.argv[2] === '--launch' && self(process.argv[1]) === self(LAUNCHER)) launch(process.argv.slice(3))
