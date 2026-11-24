import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { modalFindings } from '../lib/modal-guard.mjs'
import { parseStylesheet } from '../styleqa/static-checks.mjs'

const MARKER = '/* ==== Plan 720 — centred popups that scroll ==== */'

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name).replace(/\\/g, '/')
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const ALLOW = [
  { rule: 'bottom-sheet', file: 'src/styles.scss', selector: '.m-sheet', why: 'retired by plan 720: no template sets the class; the hotspot is append-only' },
  { rule: 'bottom-sheet', file: 'src/styles.scss', selector: '.m-sheet-card', why: 'retired by plan 720: no template sets the class; the hotspot is append-only' },
  { rule: 'bottom-sheet', file: 'src/styles.scss', selector: '&.as-modal', why: 'dead since plan 711: nothing sets as-modal; the hotspot is append-only' },
  { rule: 'modal-no-scroll', file: 'src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.scss', selector: ':host ::ng-deep .closing-card', why: 'the card is a column whose list scrolls (scss line 69)' },
  { rule: 'modal-no-scroll', file: 'src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.scss', selector: ':host ::ng-deep .quick-edit-product-modal', why: 'its panel scrolls (quick-edit-product-panel.component.scss:17-20)' }
]

function scanFiles() {
  return [...walk('src').filter((f) => f.endsWith('.scss')), ...walk('src/app').filter((f) => f.endsWith('.html'))]
}

test('every guard finding in the repo is on the allow list, and every allow entry still matches', () => {
  const left = modalFindings(scanFiles(), { allow: ALLOW })
  assert.deepEqual(left.map((f) => `${f.rule} ${f.file}:${f.line} ${f.selector}`), [])
  const all = modalFindings(scanFiles())
  for (const a of ALLOW) {
    assert.ok(
      all.some((f) => f.rule === a.rule && f.file === a.file && f.selector === a.selector),
      `allow entry no longer matches a finding (remove it): ${a.rule} ${a.file} ${a.selector}`
    )
  }
})

test('the appended engine rules centre the popup, limit its height and scroll its body', () => {
  const css = readFileSync('src/styles.scss', 'utf8')
  assert.ok(css.includes(MARKER), 'plan 720 marker')
  const block = css.slice(css.indexOf(MARKER))
  const rules = new Map()
  let current = null
  for (const n of parseStylesheet(block)) {
    if (n.kind === 'block') {
      current = n.prelude
      if (!rules.has(current)) rules.set(current, new Map())
    } else if (current !== null && n.stack[n.stack.length - 1] === current) {
      rules.get(current).set(n.prop, n.value)
    }
  }
  const overlay = rules.get('.c-modal-overlay')
  assert.equal(overlay?.get('align-items'), 'center')
  const card = rules.get('.c-modal-card')
  assert.equal(card?.get('display'), 'flex')
  assert.equal(card?.get('flex-direction'), 'column')
  assert.equal(card?.get('overflow-y'), 'auto')
  const max = `${card?.get('max-block-size')} ${rules.get(':root')?.get('--modal-max-block')}`
  for (const part of ['dvh', 'safe-area-inset-top', 'safe-area-inset-bottom', '--kb-inset']) assert.ok(max.includes(part), part)
  const body = rules.get('.c-modal-card > .c-modal-body')
  assert.equal(body?.get('min-block-size'), '0')
  assert.equal(body?.get('overflow-y'), 'auto')
})

test('no file under src/app mentions m-sheet or as-modal, and the shell has no sheet input', () => {
  const hits = walk('src/app')
    .filter((f) => /\.(?:ts|html|scss|css)$/.test(f) && !f.endsWith('.spec.ts'))
    .filter((f) => /m-sheet|as-modal/.test(readFileSync(f, 'utf8')))
  assert.deepEqual(hits, [])
  const shell = readFileSync('src/app/shared/modal-shell/modal-shell.component.ts', 'utf8')
  assert.ok(!/\bsheet\s*=\s*input\b/.test(shell))
})

test('src/styles.scss above the plan 720 marker is the base file (append-only)', (t) => {
  let base
  let lastError = 'no base ref'
  for (const ref of ['origin/orch/rs-modals', 'origin/orch/rs-style', 'origin/main']) {
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
  assert.equal(head(now), head(base))
})
