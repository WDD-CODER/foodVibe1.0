import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { compareInventories, extractFeatures, main, parseApprovedRemovals, screenPath } from '../design-feature-inventory.mjs'

const FIXTURE_APP = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'design-port', 'app')
const OVERVIEW = 'src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html'

/** A writable copy of the fixture app, so a test can delete code from it. */
const copyApp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'fv-inv-'))
  cpSync(FIXTURE_APP, dir, { recursive: true })
  return dir
}

/** Runs main() and returns { code, out } with console.log captured. */
function run(argv) {
  const lines = []
  const log = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try {
    return { code: main(argv), out: lines.join('\n') }
  } finally {
    console.log = log
  }
}

test('extractFeatures finds each kind, with file and line', () => {
  const got = extractFeatures([
    { path: 'a.html', text: '<b (click)="save()">x</b>\n<a routerLink="/cook">{{ \'cook\' | translatePipe }}</a>\n@defer (on viewport) {}\n<c (tabChange)="setTab($event)" [(ngModel)]="v" />' },
    { path: 'a.ts', text: 'x = input<string>()\ny = output<void>()\nz = model(0)\nprivate s = inject(RecipeService)\nthis.dialog.open(Foo)\nel.scrollIntoView({})\nthis.box?.focus()' },
  ])
  const keys = got.map(f => `${f.kind} ${f.name}`)
  for (const k of ['event click=save', 'routerLink /cook', 'i18n cook', 'defer (on viewport)', 'event tabChange=setTab',
    'input x', 'output y', 'model z', 'inject RecipeService', 'open dialog.open(Foo)', 'scrollIntoView el', 'focus box']) {
    assert.ok(keys.includes(k), `missing ${k} in ${keys.join(' | ')}`)
  }
  assert.ok(!keys.some(k => k.startsWith('event ngModel')), 'two-way [(x)] is not an event binding')
  assert.equal(got.find(f => f.name === '/cook').line, 2)
})

test('compareInventories: moved code is not lost, a removed duplicate is', () => {
  const a = { kind: 'event', name: 'click=save', file: 'a.html', line: 1 }
  assert.deepEqual(compareInventories([a], [{ ...a, file: 'b.html', line: 40 }]), [])
  assert.equal(compareInventories([a, a], [a]).length, 1)
  assert.deepEqual(compareInventories([a], [], new Set(['event click=save'])), [])
})

test('parseApprovedRemovals reads only its own section', () => {
  const spec = '## Inventory 1\n- event click=keep\n\n## Approved removals\n- `event click=old` — Human, 2026-10-10\n- i18n gone_key\n\n## Next\n- event click=x\n'
  assert.deepEqual([...parseApprovedRemovals(spec)], ['event click=old', 'i18n gone_key'])
})

test('screenPath accepts the folder or the registry name', () => {
  const reg = readFileSync(join(FIXTURE_APP, '_claude-data/design-migration/screens/_registry.md'), 'utf8')
  assert.equal(screenPath('dashboard', reg), 'src/app/pages/dashboard')
  assert.equal(screenPath('Recipe Book', reg), 'src/app/pages/recipe-book')
  assert.equal(screenPath('nope', reg), null)
})

test('--out then --compare on the unchanged tree: FEATURES: ok, exit 0', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'fv-inv-')), 'a.json')
  assert.equal(run(['--root', FIXTURE_APP, '--screen', 'dashboard', '--out', out]).code, 0)
  const r = run(['--root', FIXTURE_APP, '--screen', 'dashboard', '--compare', out])
  assert.equal(r.code, 0)
  assert.match(r.out, /^FEATURES: ok \(\d+\)$/)
})

test('deleting one (click) binding: FEATURES: missing with file:line, exit 1; approved removal passes', () => {
  const app = copyApp()
  const out = join(app, 'before.json')
  run(['--root', app, '--screen', 'dashboard', '--out', out])
  const file = join(app, OVERVIEW)
  const html = readFileSync(file, 'utf8')
  const line = html.split('\n').findIndex(l => l.includes('(click)="goToAddProduct()"')) + 1
  assert.ok(line > 0, 'fixture has the goToAddProduct click')
  writeFileSync(file, html.replace('(click)="goToAddProduct()"', ''))
  const r = run(['--root', app, '--screen', 'dashboard', '--compare', out])
  assert.equal(r.code, 1)
  assert.match(r.out, /^FEATURES: missing$/m)
  assert.ok(r.out.includes(`event click=goToAddProduct  (was ${OVERVIEW}:${line})`), r.out)

  const spec = join(app, 'spec.md')
  writeFileSync(spec, '## Approved removals\n- event click=goToAddProduct\n')
  assert.equal(run(['--root', app, '--screen', 'dashboard', '--compare', out, '--spec', spec]).code, 0)
})

test('--base <ref> --compare-worktree builds "before" from git', () => {
  const app = copyApp()
  const git = (...a) => execFileSync('git', a, { cwd: app, encoding: 'utf8' })
  git('init', '-q')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base')
  assert.match(run(['--root', app, '--screen', 'dashboard', '--base', 'HEAD', '--compare-worktree']).out, /^FEATURES: ok/)
  const file = join(app, OVERVIEW)
  writeFileSync(file, readFileSync(file, 'utf8').replace('(click)="goToRecipeBook()"', ''))
  const r = run(['--root', app, '--screen', 'dashboard', '--base', 'HEAD', '--compare-worktree'])
  assert.equal(r.code, 1)
  assert.match(r.out, /event click=goToRecipeBook/)
})

test('unknown screen exits 2', () => {
  const err = console.error
  console.error = () => {}
  try {
    assert.equal(main(['--root', FIXTURE_APP, '--screen', 'nope', '--out', 'x']), 2)
  } finally {
    console.error = err
  }
})
