// Plan 656 (default `one-breakpoint-set`): one breakpoint set — phone ≤767, tablet ≤1023, desktop ≥1024.
// Holds the three copies of the names equal and keeps typed widths out of every @media and every .ts file.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname, resolve, relative, sep } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

function walk(dir, ext, out = []) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) walk(p, ext, out)
    else if (p.endsWith(ext)) out.push(p)
  }
  return out
}

// Plan 763: `break-phone-narrow-max` is a narrower step inside the phone range.
const NAMES = ['break-phone-narrow-max', 'break-phone-max', 'break-tablet-min', 'break-tablet-max', 'break-desktop-min']
const EXPECTED = {
  'break-phone-narrow-max': 419,
  'break-phone-max': 767,
  'break-tablet-min': 768,
  'break-tablet-max': 1023,
  'break-desktop-min': 1024
}

function sassNames(text) {
  const out = {}
  for (const n of NAMES) {
    const m = new RegExp(`^\\$${n}:\\s*(\\d+)px;`, 'm').exec(text)
    out[n] = m ? Number(m[1]) : null
  }
  return out
}

test('src/styles.scss and the component partial hold the same five names', () => {
  assert.deepEqual(sassNames(read('src/styles.scss')), EXPECTED)
  assert.deepEqual(sassNames(read('src/app/core/styles/_breakpoints.scss')), EXPECTED)
})

test('src/styles.scss keeps no old breakpoint name', () => {
  const styles = read('src/styles.scss')
  for (const old of ['$break-mobile', '$break-tablet:', '$break-desktop:', '$break-xs-max']) {
    assert.equal(styles.includes(old), false, `src/styles.scss still holds ${old}`)
  }
})

test('breakpoints.ts holds the same values as the styles', () => {
  const ts = read('src/app/core/utils/breakpoints.ts')
  assert.match(ts, /export const PHONE_NARROW_MAX = 419\b/)
  assert.match(ts, /export const PHONE_MAX = 767\b/)
  assert.match(ts, /export const TABLET_MAX = 1023\b/)
})

test('no @media under src types a width (src/styles.scss included)', () => {
  const bad = []
  for (const f of walk('src', '.scss')) {
    const lines = read(f).split('\n')
    lines.forEach((line, i) => {
      if (/@media[^{]*\(\s*m(?:in|ax)-width:\s*\d/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`)
      const m = /@media[^{]*\(\s*m(?:in|ax)-width:\s*([^)]+)\)/.exec(line)
      if (m && !/^\$break-(phone-narrow-max|phone-max|tablet-min|tablet-max|desktop-min)$/.test(m[1].trim())) {
        bad.push(`${f}:${i + 1}: ${line.trim()}`)
      }
    })
  }
  assert.deepEqual([...new Set(bad)], [])
})

test('no .ts file under src/app other than breakpoints.ts types a media width', () => {
  const bad = []
  for (const f of walk('src/app', '.ts')) {
    if (relative(root, join(root, f)).split(sep).join('/') === 'src/app/core/utils/breakpoints.ts') continue
    const lines = read(f).split('\n')
    lines.forEach((line, i) => {
      if (/\(\s*m(?:in|ax)-width:\s*[\d.]+px\s*\)/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`)
    })
  }
  assert.deepEqual(bad, [])
})
