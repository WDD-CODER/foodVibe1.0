import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { isOpenPlanPath, listOpenPlans, findOpenPlan, findOpenPlanIn, OPEN_PLAN_SHELL_RE } from '../lib/plan-paths.mjs'
import { closePlans } from '../plan-close.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASH = process.platform === 'win32' && existsSync('C:/Program Files/Git/bin/bash.exe') ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'

const plan = (nnn, items) => `# Plan ${nnn} — X\n\nStatus: active\n\n## Atomic Sub-tasks\n${items}\n`

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'plan-paths-'))
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  return root
}

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

function gitRepo(files = {}) {
  const root = fixture(files)
  git(root, ['init', '-q', '-b', 'main'])
  git(root, ['config', 'user.email', 't@t'])
  git(root, ['config', 'user.name', 't'])
  git(root, ['config', 'commit.gpgsign', 'false'])
  git(root, ['commit', '-q', '--allow-empty', '-m', 'base'])
  return root
}

test('isOpenPlanPath: plans/ and plans/design/ only', () => {
  assert.equal(isOpenPlanPath('plans/374-x.plan.md'), true)
  assert.equal(isOpenPlanPath('plans/design/x.plan.md'), true)
  assert.equal(isOpenPlanPath('plans\\design\\374-x.plan.md'), true)
  assert.equal(isOpenPlanPath('plans/300-400/x.plan.md'), false)
  assert.equal(isOpenPlanPath('plans/archive/x.plan.md'), false)
  assert.equal(isOpenPlanPath('plans/design/README.md'), false)
  assert.equal(isOpenPlanPath('src/plans/x.plan.md'), false)
})

test('the shell regex is the same rule', () => {
  assert.equal(OPEN_PLAN_SHELL_RE, '^(plans|plans/design)/[^/]+\\.plan\\.md$')
})

test('take-plan lookup: an origin/main listing resolves plans/design/374-* (and ignores range folders)', () => {
  const listing = ['plans/300-400/374-old.plan.md', 'plans/design/374-venues-d.plan.md', 'plans/406-x.plan.md', '']
  assert.equal(findOpenPlanIn(listing, '374'), 'plans/design/374-venues-d.plan.md')
  assert.equal(findOpenPlanIn(listing, '406'), 'plans/406-x.plan.md')
  assert.equal(findOpenPlanIn(['plans/300-400/318-x.plan.md'], '318'), null)
})

test('listOpenPlans / findOpenPlan read a fixture tree (next-plan-number counts design plans)', () => {
  const root = fixture({
    'plans/406-a.plan.md': '',
    'plans/design/374-b.plan.md': '',
    'plans/design/README.md': '',
    'plans/300-400/318-c.plan.md': '',
    'plans/archive/x.plan.md': ''
  })
  try {
    assert.deepEqual(listOpenPlans(root), ['plans/406-a.plan.md', 'plans/design/374-b.plan.md'])
    assert.equal(findOpenPlan(root, '374'), 'plans/design/374-b.plan.md')
    assert.equal(findOpenPlan(root, '318'), null)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('plan-close moves a finished plans/design/NNN-* into plans/<range>/', () => {
  const root = fixture({
    'plans/design/374-b.plan.md': plan('374', '- [x] A1'),
    'plans/design/373-c.plan.md': plan('373', '- [ ] A1'),
    '.claude/todo.md': '# Todo\n',
    '.claude/todo-archive/001.md': '### Plan 374 — B\n- [x] A1\n### Plan 373 — C\n- [x] A1\n'
  })
  try {
    const lines = closePlans(root)
    assert.deepEqual(lines, ['PLAN_CLOSE: closed plans/design/374-b.plan.md → plans/300-400/374-b.plan.md'])
    assert.equal(existsSync(join(root, 'plans/design/374-b.plan.md')), false)
    assert.match(readFileSync(join(root, 'plans/300-400/374-b.plan.md'), 'utf8'), /^Status: done$/m)
    assert.equal(existsSync(join(root, 'plans/design/373-c.plan.md')), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

function branchGuard(root, relPath) {
  const out = execFileSync(BASH, [join(root, 'scripts/branch-guard.sh')], {
    cwd: root,
    input: JSON.stringify({ tool_input: { file_path: relPath } }),
    encoding: 'utf8'
  })
  return JSON.parse(out.trim().split('\n').pop()).permission
}

test('branch-guard on main: Planner may write plans/design/*, not a range folder', () => {
  const root = gitRepo()
  try {
    mkdirSync(join(root, 'scripts'))
    copyFileSync(join(repoRoot, 'scripts/branch-guard.sh'), join(root, 'scripts/branch-guard.sh'))
    assert.equal(branchGuard(root, 'plans/design/999-x.plan.md'), 'allow')
    assert.equal(branchGuard(root, 'plans/999-x.plan.md'), 'allow')
    assert.equal(branchGuard(root, 'plans/300-400/999-x.plan.md'), 'deny')
    assert.equal(git(root, ['branch', '--show-current']), 'main')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

function prePush(root, files) {
  const base = git(root, ['rev-parse', 'HEAD'])
  for (const f of files) {
    mkdirSync(dirname(join(root, f)), { recursive: true })
    writeFileSync(join(root, f), 'x\n')
  }
  git(root, ['add', '-A'])
  git(root, ['commit', '-q', '-m', 'change'])
  const head = git(root, ['rev-parse', 'HEAD'])
  try {
    execFileSync(BASH, [join(repoRoot, '.husky/pre-push')], {
      cwd: root,
      input: `refs/heads/main ${head} refs/heads/main ${base}\n`,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return 0
  } catch (e) {
    return e.status
  }
}

test('pre-push to main: accepts plans/design/NNN-*, refuses range folders and code', () => {
  const root = gitRepo()
  try {
    assert.equal(prePush(root, ['plans/design/374-x.plan.md', 'plans/406-y.plan.md', '.claude/todo.md']), 0)
    assert.equal(prePush(root, ['plans/300-400/318-x.plan.md']), 1)
    assert.equal(prePush(root, ['scripts/foo.mjs']), 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
