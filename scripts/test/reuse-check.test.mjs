// node --test scripts/test/ — scripts/lib/reuse-check.mjs and scope-check.mjs --reuse (plan 450).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRegistry, parseReuseCheck, checkPlanReuse } from '../lib/reuse-check.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIX = 'scripts/test/fixtures/reuse'
const REGISTRY = `${FIX}/registry.md`
const registry = parseRegistry(readFileSync(resolve(repoRoot, REGISTRY), 'utf8'))

function reuse(plan, registryPath = REGISTRY) {
  return spawnSync(process.execPath, ['scripts/scope-check.mjs', '--reuse', `--plan=${FIX}/${plan}`, `--registry=${registryPath}`], { cwd: repoRoot, encoding: 'utf8' })
}

function check(plan) {
  return checkPlanReuse({ planPath: `${FIX}/${plan}`, planText: readFileSync(resolve(repoRoot, FIX, plan), 'utf8'), registry })
}

test('parseRegistry: cutoff, family headings and repo paths', () => {
  assert.equal(registry.enforcedFrom, 459)
  assert.deepEqual(registry.families.map((f) => f.id), ['search-combobox', 'list-page', 'engine-classes', 'helpers', 'list-logic'])
  assert.ok(registry.paths.some((p) => p.path === 'src/app/shared/custom-select/'))
  assert.ok(!registry.paths.some((p) => p.path === 'app-custom-select'), 'selectors are not paths')
})

test('parseRegistry: also reads the invariants-style "Enforced from plan:" line', () => {
  assert.equal(parseRegistry('Enforced from plan: 12\n').enforcedFrom, 12)
  assert.equal(parseRegistry('# none\n').enforcedFrom, null)
})

test('parseReuseCheck: bullet rows with family, rung and why (why keeps its dashes)', () => {
  const { present, rows } = parseReuseCheck(readFileSync(resolve(repoRoot, FIX, '500-filled.plan.md'), 'utf8'))
  assert.equal(present, true)
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map((r) => [r.family, r.rung]), [['search-combobox', 2], ['list-page', 3], ['none', 4]])
  assert.equal(rows[0].piece, 'Supplier picker in the order form')
  assert.equal(rows[1].why, 'menu-library needs a grid — not a new shell')
})

test('parseReuseCheck: table rows', () => {
  const { rows } = parseReuseCheck(readFileSync(resolve(repoRoot, FIX, '500-table.plan.md'), 'utf8'))
  assert.deepEqual(rows.map((r) => [r.piece, r.family, r.rung]), [['Supplier picker', 'search-combobox', 1], ['Timeline strip', 'none', 4]])
})

test('checkPlanReuse: filled, table and none sections pass', () => {
  for (const p of ['500-filled.plan.md', '500-table.plan.md', '500-none.plan.md']) {
    const r = check(p)
    assert.equal(r.ok, true, `${p}: ${r.lines.join(' | ')}`)
    assert.match(r.lines[0], /^REUSE: ok /)
  }
})

test('checkPlanReuse: missing, empty, rung-4 without why, template placeholders and unknown family fail', () => {
  assert.match(check('500-missing.plan.md').lines[0], /^REUSE: missing section "## Reuse Check"/)
  assert.match(check('500-empty.plan.md').lines[0], /^REUSE: empty section/)
  assert.match(check('500-rung4-no-why.plan.md').lines[0], /^REUSE: rung-4 without justification/)
  assert.match(check('500-template.plan.md').lines[0], /^REUSE: unreadable row/)
  assert.match(check('500-unknown-family.plan.md').lines[0], /^REUSE: unknown family "fancy-picker"/)
  for (const p of ['500-missing.plan.md', '500-empty.plan.md', '500-rung4-no-why.plan.md', '500-template.plan.md', '500-unknown-family.plan.md']) {
    assert.equal(check(p).ok, false, p)
  }
})

test('checkPlanReuse: a plan below the cutoff without the section is grandfathered', () => {
  assert.deepEqual(check('100-grandfathered.plan.md'), { ok: true, lines: ['REUSE: skipped (grandfathered)'] })
})

test('scope-check --reuse: exit 1 naming the missing section', () => {
  const r = reuse('500-missing.plan.md')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /REUSE: missing section "## Reuse Check"/)
})

test('scope-check --reuse: exit 0 with a filled section', () => {
  const r = reuse('500-filled.plan.md')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: ok /)
})

test('scope-check --reuse: grandfathered plan prints the skip line', () => {
  const r = reuse('100-grandfathered.plan.md')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout.trim(), 'REUSE: skipped (grandfathered)')
})

test('scope-check --reuse: rung 4 without a why exits 1', () => {
  const r = reuse('500-rung4-no-why.plan.md')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /rung-4 without justification/)
})

test('scope-check --reuse: needs --plan, and a given registry must exist', () => {
  const noPlan = spawnSync(process.execPath, ['scripts/scope-check.mjs', '--reuse'], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(noPlan.status, 1)
  assert.match(noPlan.stderr, /--reuse needs --plan/)
  const r = reuse('500-filled.plan.md', `${FIX}/no-such-registry.md`)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /reuse registry not found/)
})

test('scope-check --reuse: the real registry (docs/brain/component-families.md) sets the cutoff', () => {
  const real = spawnSync(process.execPath, ['scripts/scope-check.mjs', '--reuse', `--plan=${FIX}/100-grandfathered.plan.md`], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(real.status, 0, real.stderr)
  assert.equal(real.stdout.trim(), 'REUSE: skipped (grandfathered)')
  const filled = spawnSync(process.execPath, ['scripts/scope-check.mjs', '--reuse', `--plan=${FIX}/500-filled.plan.md`], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(filled.status, 0, filled.stderr)
})

test('bullet rows with ASCII " - " / " -- " separators parse like the em-dash form', () => {
  for (const sep of [' - ', ' -- ']) {
    const plan = `## Reuse Check\n- Supplier picker${sep}family: search-combobox${sep}rung: 2${sep}why: inputs cover it\n`
    const { rows } = parseReuseCheck(plan)
    assert.equal(rows[0].piece, 'Supplier picker')
    assert.equal(rows[0].family, 'search-combobox')
    assert.equal(rows[0].rung, 2)
    assert.equal(rows[0].why, 'inputs cover it')
    assert.equal(checkPlanReuse({ planPath: 'plans/600-x.plan.md', planText: plan, registry }).ok, true)
  }
  const none = parseReuseCheck('## Reuse Check\n- none -- docs only\n')
  assert.equal(none.rows[0].why, 'docs only')
})

test('table whose header reads "Rung (1-4)" is read as the header', () => {
  const plan = '## Reuse Check\n| New piece | Family | Rung (1-4) | Why |\n| --- | --- | --- | --- |\n| Supplier picker | search-combobox | 2 | inputs cover it |\n'
  const res = checkPlanReuse({ planPath: 'plans/600-x.plan.md', planText: plan, registry })
  assert.equal(res.ok, true, res.lines.join('\n'))
  assert.deepEqual(res.lines, ['REUSE: ok Supplier picker (rung 2)'])
})
