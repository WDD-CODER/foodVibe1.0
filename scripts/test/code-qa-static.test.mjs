import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { loadPageMap } from '../qa/code-qa/common.mjs'
import {
  checkPageMap, checkPhysicalCss, checkRoutes, checkTranslations, physicalDeclarations, planRoutes, runStatic, unpipedText
} from '../qa/code-qa/static-checks.mjs'

const APP = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'code-qa', 'app')
const pageMap = loadPageMap(APP)

test('G4: a planted missing translation key is found, known keys are not', () => {
  const { findings } = checkTranslations(APP, pageMap)
  const keys = findings.filter((f) => f.check === 'G4-key').map((f) => f.locator)
  assert.deepEqual(keys, ['key:planted_missing_key'])
  assert.equal(findings.find((f) => f.check === 'G4-key').page, 'HOME')
})

test('G4: literal template text is found; comments, bindings, control flow and symbols are not', () => {
  const { findings } = checkTranslations(APP, pageMap)
  const texts = findings.filter((f) => f.check === 'G4-text').map((f) => f.locator)
  assert.deepEqual(texts, ['src/app/pages/home/home.page.html#text:Planted text'])
  assert.deepEqual(unpipedText('@for (x of xs(); track x.id) {\n<li>{{ x.name }}</li>\n} @empty {\n<li>ריק</li>\n}'),
    [{ text: 'ריק', line: 4 }])
})

test('G3: a planted physical property is found; symmetric pairs, centring, off-screen and comments are not', () => {
  const { findings } = checkPhysicalCss(APP, pageMap)
  assert.deepEqual(findings.map((f) => f.locator), ['src/app/pages/home/home.page.scss#.home .planted margin-left'])
  assert.equal(findings[0].page, 'HOME')
  assert.deepEqual(physicalDeclarations('.a { text-align: right; float: left; border-right-width: 1px; }').map((d) => d.prop),
    ['text-align', 'float', 'border-right-width'])
  assert.deepEqual(physicalDeclarations('.a { #{$side}: 0; margin-right: auto; margin-left: auto; }'), [])
})

test('routes: a planted dead redirect and an unresolvable component are found', () => {
  const { findings } = checkRoutes(APP, pageMap)
  const dead = findings.filter((f) => f.check === 'redirect').map((f) => f.locator)
  assert.deepEqual(dead, ['redirect:/planted-dead'])
  const comp = findings.filter((f) => f.check === 'route-component').map((f) => f.locator)
  assert.deepEqual(comp, ['route:/home/broken'])
})

test('routes: qa-plan.md header routes missing from the router are found, with relative /edit/:id resolved', () => {
  assert.deepEqual(planRoutes('## 16. MI — menu builder `/menu-intelligence`, `/:id` [auth]\n## 13. SUPF — supplier form `/suppliers/add`, `/edit/:id` [auth]'),
    [{ page: 'MI', route: '/menu-intelligence' }, { page: 'MI', route: '/menu-intelligence/:id' },
      { page: 'SUPF', route: '/suppliers/add' }, { page: 'SUPF', route: '/suppliers/edit/:id' }])
  const { findings } = checkRoutes(APP, pageMap)
  const missing = findings.filter((f) => f.check === 'plan-route').map((f) => `${f.page} ${f.locator}`)
  assert.deepEqual(missing, ['FORM route:/home/edit/:id', 'GONE route:/planted-missing-page'])
})

test('page map: a glob that matches no file is stale (S4)', () => {
  const { findings } = checkPageMap(APP, pageMap)
  assert.deepEqual(findings.map((f) => [f.page, f.locator, f.severity]), [['FORM', 'glob:src/app/pages/planted-stale/**', 'S4']])
})

test('the whole static layer is ok and lists its coverage', () => {
  const r = runStatic({ root: APP })
  assert.equal(r.status, 'ok')
  assert.match(r.coverage, /1 templates · 4 translatePipe keys · 1 style files · 7 router paths · 4 plan routes · 2 page-map globs/)
  assert.equal(r.findings.length, 8)
})
