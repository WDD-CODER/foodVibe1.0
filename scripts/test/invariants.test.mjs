// node --test scripts/test/ — scripts/lib/invariants.mjs and scope-check.mjs --arch.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseInvariants, parseArchImpact, planNumber, affectedInvariants,
  checkPlanArch, diffArchWarnings, decisionWithoutAdr, parseAddedLines
} from '../lib/invariants.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const REGISTRY = `# x

Enforced from plan: 388

## INV-1 — Ownership
- Rule: own items only
- Source: ADR 0019
- Touches: \`server/routes/generic.js\`, \`server/utils/can-write.js\`
- Users lose if broken: edits
- Test: server/test/invariants.test.js "INV-1 …"

## INV-2 — Tenancy
- Rule: overrides
- Source: ADR 0008
- Touches: \`server/services/**\`
- Users lose if broken: customizing
- Test: none
`

const plan = (scope, impact) => `# p

## Read-Write Scope

\`\`\`scope
${scope.join('\n')}
\`\`\`
${impact === undefined ? '' : `\n## Architecture Impact\n${impact}\n`}
## Atomic Sub-tasks
- [ ] A1
`

function check(planPath, scope, impact, { tracked = [], adrs = [] } = {}) {
  return checkPlanArch({
    planPath,
    planText: plan(scope, impact),
    scopeGlobs: scope,
    registry: parseInvariants(REGISTRY),
    trackedFiles: tracked,
    adrExists: (p) => adrs.includes(p)
  })
}

test('parseInvariants reads the header and every field', () => {
  const r = parseInvariants(REGISTRY)
  assert.equal(r.enforcedFrom, 388)
  assert.deepEqual(r.invariants.map((i) => i.id), ['INV-1', 'INV-2'])
  assert.deepEqual(r.invariants[0].touches, ['server/routes/generic.js', 'server/utils/can-write.js'])
  assert.equal(r.invariants[0].title, 'Ownership')
  assert.equal(r.invariants[1].test, 'none')
})

test('the real registry parses: 6 invariants, each with touches and a users-lose line', () => {
  const r = parseInvariants(readFileSync(resolve(repoRoot, 'docs/brain/invariants.md'), 'utf8'))
  assert.equal(r.invariants.length, 6)
  for (const inv of r.invariants) {
    assert.ok(inv.touches.length, `${inv.id} has Touches`)
    assert.ok(inv.usersLose, `${inv.id} has a users-lose line`)
  }
})

test('parseArchImpact reads the three forms and INV-none', () => {
  const { present, entries } = parseArchImpact(plan(['x'], [
    '- INV-1: preserves — fine',
    '- INV-2: deviation until 400 — users lose: x — Arch-approved: Human 2026-10-06',
    '- INV-3: changes — ADR docs/brain/decisions/0020-x.md',
    '- INV-none: preserves — nothing'
  ].join('\n')))
  assert.equal(present, true)
  assert.deepEqual(entries.map((e) => [e.id, e.kind, e.approved, e.adr]), [
    ['INV-1', 'preserves', false, null],
    ['INV-2', 'deviation', true, null],
    ['INV-3', 'changes', false, 'docs/brain/decisions/0020-x.md'],
    ['INV-none', 'preserves', false, null]
  ])
})

test('planNumber', () => {
  assert.equal(planNumber('plans/387-x.plan.md'), 387)
  assert.equal(planNumber('scripts/test/fixtures/arch-missing.plan.md'), null)
})

test('affectedInvariants: via a tracked file, and via literal paths both ways', () => {
  const { invariants } = parseInvariants(REGISTRY)
  assert.deepEqual(affectedInvariants(['server/services/**'], invariants, ['server/services/a.js']).map((i) => i.id), ['INV-2'])
  // can-write.js doesn't exist yet: the scope glob is the literal touched path.
  assert.deepEqual(affectedInvariants(['server/utils/can-write.js'], invariants, []).map((i) => i.id), ['INV-1'])
  // a broad scope glob matches the touched literal path.
  assert.deepEqual(affectedInvariants(['server/routes/**'], invariants, []).map((i) => i.id), ['INV-1'])
  assert.deepEqual(affectedInvariants(['src/**'], invariants, ['src/a.ts']), [])
})

test('gate: missing entry blocks', () => {
  const r = check('plans/400-x.plan.md', ['server/routes/generic.js'], undefined)
  assert.equal(r.ok, false)
  assert.match(r.lines.join('\n'), /ARCH: missing INV-1/)
})

test('gate: change without Arch-approved blocks', () => {
  const r = check('plans/400-x.plan.md', ['server/services/**', 'docs/brain/decisions/0099-x.md'], '- INV-2: changes — ADR docs/brain/decisions/0099-x.md')
  assert.equal(r.ok, false)
  assert.match(r.lines.join('\n'), /ARCH: unapproved INV-2/)
})

test('gate: change with an ADR neither existing nor in scope blocks', () => {
  const r = check('plans/400-x.plan.md', ['server/services/**'], '- INV-2: changes — ADR docs/brain/decisions/0099-x.md — Arch-approved: Human 2026-10-06')
  assert.equal(r.ok, false)
  assert.match(r.lines.join('\n'), /ARCH: bad-adr INV-2/)
})

test('gate: approved change with an existing ADR passes', () => {
  const r = check('plans/400-x.plan.md', ['server/services/**'], '- INV-2: changes — ADR docs/brain/decisions/0099-x.md — Arch-approved: Human 2026-10-06', { adrs: ['docs/brain/decisions/0099-x.md'] })
  assert.deepEqual(r, { ok: true, lines: ['ARCH: ok INV-2'] })
})

test('gate: grandfathered only without the section; a plan with the section is checked', () => {
  assert.deepEqual(check('plans/385-x.plan.md', ['server/routes/generic.js'], undefined), { ok: true, lines: ['ARCH: skipped (grandfathered)'] })
  assert.equal(check('plans/385-x.plan.md', ['server/routes/generic.js'], '- INV-none: preserves — x').ok, false)
})

test('gate: an enforced plan with no section and no touched invariant still needs the section', () => {
  const r = check('plans/400-x.plan.md', ['src/**'], undefined)
  assert.equal(r.ok, false)
  assert.match(r.lines[0], /missing section/)
  assert.deepEqual(check('plans/400-x.plan.md', ['src/**'], '- INV-none: preserves — ui only'), { ok: true, lines: ['ARCH: ok INV-none'] })
})

test('diff warnings: touched invariant without a plan entry', () => {
  const registry = parseInvariants(REGISTRY)
  const changed = ['server/routes/generic.js', 'src/a.ts']
  assert.deepEqual(diffArchWarnings({ changedFiles: changed, registry, planText: null }), ['ARCH: warn INV-1 server/routes/generic.js'])
  assert.deepEqual(diffArchWarnings({ changedFiles: changed, registry, planText: plan(['x'], '- INV-1: preserves — y') }), [])
})

test('decision-without-adr: only in session-state / plan files, only without INV-n or an ADR', () => {
  const added = parseAddedLines([
    'diff --git a/docs/session-state-x.md b/docs/session-state-x.md',
    '+++ b/docs/session-state-x.md',
    '@@ -3,0 +4,3 @@',
    '+- Human decision: shared terms admin-only',
    '+- Human decision: keep INV-2 overrides',
    '+- Human decision: see decisions/0017-x.md',
    '+++ b/src/a.ts',
    '@@ -1,0 +2 @@',
    '+// Human decision in code is ignored'
  ].join('\n'))
  assert.deepEqual(decisionWithoutAdr(added), ['ARCH: warn decision-without-adr docs/session-state-x.md:4'])
})

function cli(planPath) {
  return spawnSync(process.execPath, ['scripts/scope-check.mjs', '--arch', `--plan=${planPath}`], { cwd: repoRoot, encoding: 'utf8' })
}

test('CLI: fixture with no Architecture Impact exits 1 with ARCH: missing INV-1', () => {
  const r = cli('scripts/test/fixtures/arch-missing.plan.md')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /ARCH: missing INV-1/)
})

test('CLI: fixture with an unapproved change exits 1 with ARCH: unapproved INV-2', () => {
  const r = cli('scripts/test/fixtures/arch-unapproved.plan.md')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /ARCH: unapproved INV-2/)
})

test('CLI: fixture with every entry and an approved in-scope ADR exits 0', () => {
  const r = cli('scripts/test/fixtures/arch-approved.plan.md')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^ARCH: ok INV-1, INV-2, INV-3/)
})

test('CLI: --arch --diff always exits 0', () => {
  const r = spawnSync(process.execPath, ['scripts/scope-check.mjs', '--arch', '--diff=HEAD'], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^ARCH: /)
})
