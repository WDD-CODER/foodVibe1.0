import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deriveSlug, diffBundles, findBundleRoot, ingest, parseTargets, readZip } from '../design-handoff-ingest.mjs'
import { zipFolder } from './fixtures/design-port/make-zip.mjs'

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'design-port')
const BUNDLE = join(FIX, 'handoff', 'design_handoff_cook_view')
const REGISTRY = readFileSync(join(FIX, 'app/_claude-data/design-migration/screens/_registry.md'), 'utf8')
const clean = { isDirty: () => false, today: '2026-10-10' }

/** An empty repo root holding only the registry, like a slot checkout. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'fv-ingest-'))
  mkdirSync(join(root, '_claude-data/design-migration/screens'), { recursive: true })
  writeFileSync(join(root, '_claude-data/design-migration/screens/_registry.md'), REGISTRY)
  return root
}

const tmpZip = (dir, opts) => {
  const p = join(mkdtempSync(join(tmpdir(), 'fv-zip-')), 'handoff.zip')
  writeFileSync(p, zipFolder(dir, opts))
  return p
}

test('readZip reads stored and deflated entries', () => {
  const files = readZip(readFileSync(join(FIX, 'handoff.zip')))
  assert.equal(files.get('design_handoff_cook_view/designs/cook-a.js').toString(), readFileSync(join(BUNDLE, 'designs/cook-a.js'), 'utf8'))
  assert.ok(files.has('design_handoff_cook_view/designs/Cook View A.html'))
})

test('findBundleRoot: wrapper folder optional, needs README + designs/', () => {
  assert.equal(findBundleRoot(['w/README.md', 'w/designs/a.html']), 'w/')
  assert.equal(findBundleRoot(['README.md', 'designs/a.html', 'w/README.md']), '')
  assert.equal(findBundleRoot(['README.md', 'notes.html']), null)
})

test('deriveSlug: --slug, wrapper folder, else README H1', () => {
  assert.equal(deriveSlug({ root: 'x/', readme: '', slug: 'My Screen' }), 'my-screen')
  assert.equal(deriveSlug({ root: 'design_handoff_cook_view/', readme: '' }), 'cook-view')
  assert.equal(deriveSlug({ root: '', readme: '# Handoff: Recipe Book redesign (foodVibe1.0)\n' }), 'recipe-book')
})

test('parseTargets: pages → screens, the rest → shell, none → unknown', () => {
  const t = parseTargets(readFileSync(join(BUNDLE, 'README.md'), 'utf8'), REGISTRY)
  assert.deepEqual(t.screens.map(s => s.path), ['src/app/pages/cook-view'])
  assert.deepEqual(t.shell, ['core/components/header/header.component.scss', 'core/components/tab-chips', 'src/styles.scss'])
  assert.equal(t.unknown, false)
  assert.equal(parseTargets('# x\n\n## Overview\nno table\n', REGISTRY).unknown, true)
})

test('diffBundles: changed / added / removed by content', () => {
  const a = new Map([['README.md', Buffer.from('a')], ['old.css', Buffer.from('x')], ['same.js', Buffer.from('s')]])
  const b = new Map([['README.md', Buffer.from('b')], ['new.html', Buffer.from('n')], ['same.js', Buffer.from('s')]])
  assert.deepEqual(diffBundles(b, a), { added: ['new.html'], changed: ['README.md'], removed: ['old.css'] })
})

test('--dry-run on the fixture zip prints the plan and writes nothing', () => {
  const root = repo()
  const r = ingest({ from: join(FIX, 'handoff.zip'), dryRun: true, root, ...clean })
  assert.equal(r.slug, 'cook-view')
  assert.equal(r.isNew, true)
  assert.equal(r.diff.added.length, 6)
  assert.equal(r.written, false)
  assert.equal(existsSync(join(root, '.interface-design')), false)
})

test('real ingest writes the bundle + a handoffs.md entry; a second one diffs against it', () => {
  const root = repo()
  const first = ingest({ from: join(FIX, 'handoff.zip'), url: 'https://claude.ai/design/x', root, ...clean })
  assert.equal(first.written, true)
  const dest = join(root, '.interface-design/handoffs/cook-view')
  assert.ok(existsSync(join(dest, 'designs/Cook View A.html')))
  assert.ok(!existsSync(join(dest, 'design_handoff_cook_view')), 'wrapper folder is stripped')
  const log = readFileSync(join(root, '.interface-design/handoffs.md'), 'utf8')
  assert.match(log, /## 2026-10-10 · cook-view/)
  assert.match(log, /Bundle: https:\/\/claude\.ai\/design\/x/)
  assert.match(log, /Screens: Cook View \(`src\/app\/pages\/cook-view`\)/)

  // Next handoff of the same screen: README edited, a design added, PROMPT.md dropped. No wrapper folder this time.
  const next = mkdtempSync(join(tmpdir(), 'fv-next-'))
  cpSync(BUNDLE, next, { recursive: true })
  writeFileSync(join(next, 'README.md'), readFileSync(join(BUNDLE, 'README.md'), 'utf8') + '\n## Gap resolutions\n- keep the photo banner\n')
  writeFileSync(join(next, 'designs/Cook View B.html'), '<html></html>\n')
  writeFileSync(join(next, 'PROMPT.md'), '')
  const nextNoPrompt = mkdtempSync(join(tmpdir(), 'fv-next2-'))
  cpSync(next, nextNoPrompt, { recursive: true, filter: src => !src.endsWith('PROMPT.md') })
  const second = ingest({ from: tmpZip(nextNoPrompt), slug: 'cook-view', root, ...clean })
  assert.deepEqual(second.diff, { added: ['designs/Cook View B.html'], changed: ['README.md'], removed: ['PROMPT.md'] })
  assert.ok(!readdirSync(dest).includes('PROMPT.md'), 'the folder is replaced, not merged')
  assert.equal(readFileSync(join(root, '.interface-design/handoffs.md'), 'utf8').match(/^## /gm).length, 2)
})

test('refuses a bundle entry that escapes the handoff folder (zip slip), even on a dry run', () => {
  const evil = mkdtempSync(join(tmpdir(), 'fv-evil-'))
  cpSync(BUNDLE, evil, { recursive: true })
  const zip = zipFolder(evil)
  // Rename one entry to climb out of the folder; same length keeps the zip offsets valid.
  const from = Buffer.from('designs/cook-a.js')
  const to = Buffer.from('../../evil/xx.js_')
  let at = zip.indexOf(from)
  while (at >= 0) {
    to.copy(zip, at)
    at = zip.indexOf(from, at + 1)
  }
  const p = join(mkdtempSync(join(tmpdir(), 'fv-zip-')), 'evil.zip')
  writeFileSync(p, zip)
  const root = repo()
  assert.throws(() => ingest({ from: p, dryRun: true, root, ...clean }), /unsafe path in bundle: \.\.\/\.\.\/evil/)
  assert.throws(() => ingest({ from: p, root, ...clean }), /unsafe path/)
  assert.equal(existsSync(join(root, '.interface-design')), false)
})

test('refuses to write while .interface-design/ is dirty, and refuses a URL', () => {
  const root = repo()
  assert.throws(() => ingest({ from: join(FIX, 'handoff.zip'), root, isDirty: () => true }), /uncommitted changes/)
  assert.equal(existsSync(join(root, '.interface-design')), false)
  assert.throws(() => ingest({ from: 'https://claude.ai/x.zip', root, ...clean }), /download it first/)
})
