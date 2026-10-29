import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { execFileSync, spawnSync } from 'child_process'

const scriptsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const picomatchDir = dirname(require.resolve('picomatch/package.json'))

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const PLAN = `# Plan 900 — Demo

Status: active

## Read-Write Scope

\`\`\`scope
src/in-scope/**
\`\`\`

## Atomic Sub-tasks
- [ ] S1: demo
`

/** A throwaway repo with its own copy of the workflow scripts, a plan 900 on main, and a feat/900-demo branch. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'ci-scope-'))
  mkdirSync(join(root, 'scripts'), { recursive: true })
  for (const f of ['ci-scope-check.mjs', 'scope-check.mjs', 'lib']) {
    cpSync(join(scriptsDir, f), join(root, 'scripts', f), { recursive: true })
  }
  cpSync(picomatchDir, join(root, 'scripts', 'node_modules', 'picomatch'), { recursive: true })
  mkdirSync(join(root, 'plans'), { recursive: true })
  writeFileSync(join(root, 'plans', '900-demo.plan.md'), PLAN)
  git(root, ['init', '-q', '-b', 'main'])
  git(root, ['config', 'user.email', 't@t'])
  git(root, ['config', 'user.name', 't'])
  git(root, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(root, '.gitignore'), 'scripts/\n')
  git(root, ['add', '-A'])
  git(root, ['commit', '-q', '-m', 'base'])
  git(root, ['checkout', '-q', '-b', 'feat/900-demo'])
  return root
}

function commitFile(root, rel, text = 'x\n') {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
  git(root, ['add', '-f', rel])
  git(root, ['commit', '-q', '-m', `add ${rel}`])
}

function run(root, args, env = {}) {
  return spawnSync(process.execPath, [join(root, 'scripts', 'ci-scope-check.mjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HEAD_REF: '', BASE_SHA: '', BASE_REF: '', ...env }
  })
}

test('a diff inside the plan scope exits 0', () => {
  const root = repo()
  try {
    commitFile(root, 'src/in-scope/a.ts')
    commitFile(root, 'plans/900-demo.plan.md', PLAN + '\nnote\n') // the plan file itself is always allowed
    const r = run(root, ['--branch=feat/900-demo', '--base=main'])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /SCOPE: ok/)
    assert.match(r.stdout, /ci-scope-check: ok/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a diff with one file outside the scope exits 1 and names the file', () => {
  const root = repo()
  try {
    commitFile(root, 'src/in-scope/a.ts')
    commitFile(root, 'src/elsewhere/b.ts')
    const r = run(root, ['--branch=feat/900-demo', '--base=main'])
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stdout, /SCOPE: out/)
    assert.match(r.stdout, /src\/elsewhere\/b\.ts/)
    assert.doesNotMatch(r.stdout, /src\/in-scope\/a\.ts/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a branch that is not feat/NNN-* exits 0 with "skipped"', () => {
  const root = repo()
  try {
    commitFile(root, 'src/elsewhere/b.ts')
    for (const name of ['fix/900-demo', 'chore/anything', 'feat/no-number', 'main', '']) {
      const r = run(root, [`--branch=${name}`, '--base=main'])
      assert.equal(r.status, 0, `${name}: ${r.stdout}${r.stderr}`)
      assert.match(r.stdout, /skipped/)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a feat branch with no open plan is skipped', () => {
  const root = repo()
  try {
    const r = run(root, ['--branch=feat/901-none', '--base=main'])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /skipped \(no open plan numbered 901/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('branch and base can come from the environment (the workflow path)', () => {
  const root = repo()
  try {
    commitFile(root, 'src/elsewhere/b.ts')
    const base = git(root, ['rev-parse', 'main'])
    const r = run(root, [], { HEAD_REF: 'feat/900-demo', BASE_SHA: base })
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stdout, /src\/elsewhere\/b\.ts/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('an unknown base fails instead of passing silently', () => {
  const root = repo()
  try {
    commitFile(root, 'src/elsewhere/b.ts')
    const r = run(root, ['--branch=feat/900-demo', '--base=0000000000000000000000000000000000000000'])
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stderr, /not a commit/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('--checkout-branch names a detached checkout after the branch', () => {
  const root = repo()
  try {
    commitFile(root, 'src/in-scope/a.ts')
    git(root, ['checkout', '-q', '--detach'])
    const r = run(root, ['--branch=feat/900-demo', '--base=main', '--checkout-branch'])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.equal(git(root, ['branch', '--show-current']), 'feat/900-demo')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
