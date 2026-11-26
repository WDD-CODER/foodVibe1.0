import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { styleFindings } from '../lib/style-guard.mjs'
import { withoutRetiredSheetRules } from '../lib/modal-guard.mjs'

const MARKER = '/* ==== Plan 703 — style unification pieces ==== */'

test('the catalog and the empty state use the shared pieces and tokens', () => {
  const files = [
    'src/app/pages/dev-catalog/dev-catalog.page.scss',
    'src/app/pages/dev-catalog/dev-catalog.page.html',
    'src/app/shared/empty-state/empty-state.component.html'
  ]
  assert.deepEqual(styleFindings(files), [])
})

test('src/styles.scss defines each new piece exactly once', () => {
  const css = readFileSync('src/styles.scss', 'utf8')
  const count = (re) => (css.match(re) ?? []).length
  for (const name of ['c-page', 'c-page--narrow', 'c-list', 'c-list-row--link', 'c-row-link', 'c-stat-tile', 'c-stat-tile--hero', 'c-card-head', 'c-form-page', 'c-empty-state--compact']) {
    assert.equal(count(new RegExp(`^\\.${name}(?![\\w-])`, 'gm')), 1, `.${name}`)
  }
  for (const token of ['--page-max-content', '--page-max-narrow']) {
    assert.equal(count(new RegExp(`^\\s*${token}\\s*:`, 'gm')), 1, token)
  }
})

test('src/styles.scss above the marker is the base file minus the sheet rules plan 757 removed (append-only)', (t) => {
  // The run branch comes first: this style run is cut from a staging branch that already differs from origin/main,
  // so a merge-base with origin/main would count staging's own changes as edits. origin/main is the fallback.
  // Plan 757 (answer 757-1): the staging branch comes before origin/main, for when the run branches above are gone.
  let base
  let lastError = 'no base ref'
  for (const ref of ['origin/orch/rs-modals', 'origin/orch/rs-style', 'origin/chore/restaurant-staging', 'origin/main']) {
    try {
      const mb = execFileSync('git', ['merge-base', 'HEAD', ref], { encoding: 'utf8' }).trim()
      base = execFileSync('git', ['show', `${mb}:src/styles.scss`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      break
    } catch (e) {
      lastError = `${ref}: ${String(e.message).split('\n')[0]}`
    }
  }
  if (base === undefined) {
    t.skip(`no base ref available (${lastError})`)
    return
  }
  const now = readFileSync('src/styles.scss', 'utf8')
  const head = (s) => (s.includes(MARKER) ? s.slice(0, s.indexOf(MARKER)) : s).trimEnd()
  assert.equal(head(now), withoutRetiredSheetRules(head(base)))
})
