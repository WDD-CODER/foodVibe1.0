import { test } from 'node:test'
import assert from 'node:assert/strict'
import { devChains, chainRoot } from '../lib/slot-procs.mjs'

// Synthetic process tables: devChains/chainRoot take the table, so no real process is touched.
const isWin = process.platform === 'win32'
const SEP = isWin ? '\\' : '/'
const NODE = isWin ? 'node.exe' : 'node'
const SHELL = isWin ? 'cmd.exe' : 'sh'
const SLOT = isWin ? 'C:\\work\\app-wt-1' : '/work/app-wt-1'
const MAIN = isWin ? 'C:\\work\\app' : '/work/app'

function table(rows) {
  const t = new Map(rows.map(([pid, ppid, name, cmd]) => [pid, { pid, ppid, name, cmd, t: pid, children: [] }]))
  for (const p of t.values()) if (t.has(p.ppid)) t.get(p.ppid).children.push(p.pid)
  return t
}

// npm run dev:local -> shell -> cross-env (folder in its path) -> node --watch index.js [-> node index.js]
const backend = (base, folder, withApp) => [
  [base, 1, NODE, 'node npm-cli.js run dev:local'],
  [base + 1, base, SHELL, `${SHELL} /d /s /c cross-env NODE_ENV=development node --watch index.js`],
  [base + 2, base + 1, NODE, `node "${folder}${SEP}server${SEP}node_modules${SEP}cross-env${SEP}dist${SEP}bin${SEP}cross-env.js" NODE_ENV=development node --watch index.js`],
  [base + 3, base + 2, NODE, 'node --watch index.js'],
  ...(withApp ? [[base + 4, base + 3, NODE, 'node index.js']] : [])
]

test('a watcher with no child and no port is an orphan, rooted at npm', () => {
  const t = table([[1, 0, 'init', 'init'], ...backend(100, SLOT, false)])
  const [c] = devChains(SLOT, t, new Map())
  assert.equal(c.root, 100)
  assert.equal(c.orphan, true)
  assert.equal(chainRoot(t, 103), 100)
})

test('a running server (its app holds the port) is not an orphan', () => {
  const t = table([[1, 0, 'init', 'init'], ...backend(100, SLOT, true)])
  const [c] = devChains(SLOT, t, new Map([[104, [3001]]]))
  assert.equal(c.orphan, false)
  assert.deepEqual(c.ports, [3001])
})

test('the main folder never matches a slot folder that shares its prefix', () => {
  const t = table([[1, 0, 'init', 'init'], ...backend(100, SLOT, false), ...backend(200, MAIN, false)])
  assert.deepEqual(devChains(MAIN, t, new Map()).map((c) => c.root), [200])
  assert.deepEqual(devChains(SLOT, t, new Map()).map((c) => c.root), [100])
})

test('QA harness: an orphan watcher is found, a live QA listener is left alone', () => {
  const log = `${MAIN}${SEP}.claude${SEP}qa-backend.log`
  const t = table([
    [1, 0, 'init', 'init'],
    [300, 1, SHELL, `${SHELL} /d /c "set QA_PORT=4206&& node --watch evidence.js < NUL > ${log}"`],
    [301, 300, NODE, 'node --watch evidence.js'],
    [400, 1, SHELL, `${SHELL} /d /c "node --watch evidence.js < NUL > ${log}"`],
    [401, 400, NODE, 'node --watch evidence.js'],
    [402, 401, NODE, 'node evidence.js']
  ])
  const chains = devChains(MAIN, t, new Map([[402, [4206]]]))
  assert.deepEqual(chains.filter((c) => c.orphan).map((c) => c.root), [300])
  assert.deepEqual(chains.filter((c) => !c.orphan).map((c) => c.root), [400])
})

test('a non-dev parent (the agent shell) is never part of the chain', () => {
  const t = table([[1, 0, 'init', 'init'], [50, 1, isWin ? 'bash.exe' : 'bash', 'bash -c npm run dev:local'], ...backend(100, SLOT, false).map((r) => (r[0] === 100 ? [100, 50, r[2], r[3]] : r))])
  assert.equal(devChains(SLOT, t, new Map())[0].root, 100)
})
