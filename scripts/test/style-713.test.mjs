import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const MENU = 'src/app/pages/menu-intelligence/components'
const DIRS = [
  `${MENU}/deposit-paid-dialog`,
  `${MENU}/not-closed-dialog`,
  `${MENU}/event-closing-dialog`,
  `${MENU}/supplier-orders`,
  `${MENU}/prep-sheets`,
  'src/app/pages/recipe-builder/components/paste-ingredients-dialog'
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = DIRS.flatMap(walk)
export const ALLOW = [
  {
    rule: 'font-size',
    file: `${MENU}/prep-sheets/prep-sheets.component.scss`,
    why: 'the paper sheet is sized in pt so the printed page keeps its size'
  }
]

const inDir = (dir, ext) => readdirSync(dir).filter((f) => f.endsWith(ext) && !f.endsWith(`.spec${ext}`))

test('the six popups use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('every popup template is drawn by app-modal-shell and no component listens for Escape itself', () => {
  for (const dir of DIRS) {
    for (const f of inDir(dir, '.html')) {
      const html = readFileSync(`${dir}/${f}`, 'utf8')
      assert.ok(html.includes('<app-modal-shell'), `${dir}/${f} has no <app-modal-shell`)
      assert.ok(!html.includes('c-modal-overlay'), `${dir}/${f} still draws its own overlay`)
    }
    for (const f of inDir(dir, '.ts')) {
      const ts = readFileSync(`${dir}/${f}`, 'utf8')
      assert.ok(!ts.includes('document:keydown.escape'), `${dir}/${f} still has its own Escape listener`)
    }
  }
})

test('the old local classes are gone', () => {
  const gone = ['prep-overlay', 'prep-nothing', 'prep-empty', 'onOverlayClick']
  for (const dir of DIRS) {
    for (const f of readdirSync(dir).filter((n) => !n.endsWith('.spec.ts'))) {
      const text = readFileSync(`${dir}/${f}`, 'utf8')
      for (const word of gone) assert.ok(!text.includes(word), `${dir}/${f} still has ${word}`)
    }
  }
})
