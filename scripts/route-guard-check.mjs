#!/usr/bin/env node
// Plan 589: every top-level route in src/app/app.routes.ts needs `canActivate: [authGuard...]`,
// except `welcome` and redirects. Prints ROUTE_GUARDS: ok, or lists the breakers and exits 1.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.argv.find((a) => a.startsWith('--root='))?.slice(7) ?? process.cwd()
const src = readFileSync(resolve(root, 'src/app/app.routes.ts'), 'utf8')
const BS = String.fromCharCode(92)
const ALLOW = new Set(['welcome'])

const start = src.indexOf('export const routes')
const open = src.indexOf('[', src.indexOf('=', start))
const entries = []
let depth = 0, from = -1, str = null
for (let i = open + 1; i < src.length; i++) {
  const c = src[i]
  if (str) { if (c === BS) i++; else if (c === str) str = null; continue }
  if (c === "'" || c === '"' || c === '`') { str = c; continue }
  if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
  if (c === '{') { if (depth === 0) from = i; depth++ }
  else if (c === '}') { depth--; if (depth === 0) entries.push(src.slice(from, i + 1)) }
  else if (c === ']' && depth === 0) break
}

// Strip nested children arrays so only the entry's own keys are read.
const own = (e) => {
  let out = '', d = 0, s = null
  for (let i = 0; i < e.length; i++) {
    const c = e[i]
    if (s) { if (c === BS) i++; else if (c === s) s = null; if (d <= 1) out += c; continue }
    if (c === "'" || c === '"' || c === '`') { s = c; if (d <= 1) out += c; continue }
    if (c === '[' || c === '{' || c === '(') d++
    if (d <= 1) out += c
    if (c === ']' || c === '}' || c === ')') d--
  }
  return out
}

const bad = []
for (const e of entries) {
  const top = own(e)
  const path = /path:\s*'([^']*)'/.exec(top)?.[1]
  if (path === undefined || ALLOW.has(path) || /redirectTo\s*:/.test(top)) continue
  if (!/canActivate:\s*\[[^\]]*\bauthGuard\b/.test(e.replace(/children:\s*\[[\s\S]*\]\s*,?/, ''))) bad.push(path)
}
if (bad.length) {
  console.error('ROUTE_GUARDS: missing authGuard on: ' + bad.join(', '))
  process.exit(1)
}
console.log('ROUTE_GUARDS: ok')
