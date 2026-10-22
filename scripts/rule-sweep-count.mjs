/**
 * Rule sweep count (plan 458) — counts the AGENTS.md / tech-stack code-shape rules across src/ in one table.
 * reuse-lint.mjs only looks at added lines of a diff; this script measures the whole tree so a later plan
 * can re-run it and compare with the numbers in docs/mvp/runs/458.md.
 *
 * Usage:
 *   node scripts/rule-sweep-count.mjs            table of counts (rule · count · exceptions)
 *   node scripts/rule-sweep-count.mjs --list     every hit, one "rule  path:line  text" per line
 *   node scripts/rule-sweep-count.mjs --rule=R4  only that rule (with --list: its hits)
 *
 * Exit code is always 0 — this is a measuring tool, not a gate.
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, dirname, join, relative, sep } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(repoRoot, 'src')
const STYLES = 'src/styles.scss'

/** Documented exceptions (plan 458). Each entry: path (+ optional text match) and why it stays. */
export const EXCEPTIONS = {
  // R2: component SCSS left unlayered. All global styles in src/styles.scss are unlayered, so a layered
  // component rule loses to every global rule on the same element (the button/input reset, every .c-* engine)
  // whatever its specificity. Wrapping these files would change how they look; see run 458 "S3".
  R2: 'all unlayered files that style a button/input/select/textarea/img/svg/lucide-icon or a .c-* element',
  // R3: OnPush left off the two growth-frozen pages (S11).
  R3: ['src/app/pages/cook-view/cook-view.page.ts', 'src/app/pages/recipe-builder/recipe-builder.page.ts'],
  // R7: private writable source of a public is*/has* readonly signal (`isLoaded_ = this.loaded_.asReadonly()`).
  R7: ['src/app/core/services/taxonomy-store.service.ts loaded_'],
  // R9: canonical data — Hebrew values that are data, not UI text (unit symbols, parser tokens, Gemini/export data).
  R9: [
    'src/app/core/utils/recipe-cost.constants.ts',
    'src/app/core/utils/quantity-step.util.ts',
    'src/app/core/utils/ingredient-line-parser.util.ts',
    'src/app/core/services/gemini-shots.service.ts',
    'src/app/core/engine/testing/event-plan.fixture.ts',
    'src/app/core/utils/export.util.ts',
    'src/app/core/services/recipe-export.service.ts',
    'src/app/pages/recipe-builder/services/recipe-form.service.ts',
    'src/app/shared/nutrition-badge/nutrition-badge.component.ts',
    'src/app/shared/nutrition-badge/nutrition-badge.component.html',
  ],
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const rel = (p) => relative(repoRoot, p).split(sep).join('/')
const files = walk(srcRoot).map(rel)
const read = (p) => readFileSync(join(repoRoot, p), 'utf8')
const lines = (p) => read(p).split(/\r?\n/)

const scss = files.filter((f) => f.endsWith('.scss') && f !== STYLES)
const ts = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
const html = files.filter((f) => f.endsWith('.html'))

/** Every hit: { rule, file, line, text, exception? } */
const hits = []
const hit = (rule, file, line, text, exception = false) => hits.push({ rule, file, line, text: text.trim(), exception })

// R1 — a .c-* class used in a component stylesheet that src/styles.scss does not define (a new engine defined
// outside styles.scss). Restyles of a global engine inside a component are listed as exceptions, not counted.
const globalCss = read(STYLES)
const globalEngines = new Set([...globalCss.matchAll(/\.(c-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]))
for (const f of scss) {
  lines(f).forEach((l, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(l)) return
    if (!/\{\s*$|,\s*$/.test(l)) return
    for (const m of l.matchAll(/\.(c-[a-zA-Z0-9_-]+)/g)) {
      hit('R1', f, i + 1, `${m[1]}: ${l}`, globalEngines.has(m[1]))
    }
  })
}

// R2 — component stylesheet without @layer.
const LAYER_RISKY_EL = /<(button|input|select|textarea|optgroup|img|svg|video|canvas|lucide-icon|lucide-angular)\b|role="button"/
for (const f of scss) {
  const s = read(f)
  if (s.includes('@layer')) continue
  const h = f.replace(/\.scss$/, '.html')
  const tpl = existsSync(join(repoRoot, h)) ? read(h) : ''
  const risky = /\.c-[a-z]/.test(s) || LAYER_RISKY_EL.test(tpl) || !tpl || /::ng-deep|:host-context/.test(s)
  hit('R2', f, 1, 'no @layer', risky)
}

// R3 — the two big pages without ChangeDetectionStrategy.OnPush.
for (const f of ['src/app/pages/cook-view/cook-view.page.ts', 'src/app/pages/recipe-builder/recipe-builder.page.ts']) {
  if (!read(f).includes('ChangeDetectionStrategy.OnPush')) hit('R3', f, 1, 'no OnPush', EXCEPTIONS.R3.includes(f))
}

// R4 — decorator queries / listeners instead of signal APIs and host bindings.
for (const f of ts) {
  lines(f).forEach((l, i) => {
    if (/@(ViewChild|ViewChildren|ContentChild|ContentChildren|HostListener|HostBinding)\(/.test(l)) hit('R4', f, i + 1, l)
  })
}

// R5 — structural directives instead of control flow.
for (const f of html) {
  lines(f).forEach((l, i) => {
    if (/\*ng(If|For|Switch|SwitchCase|SwitchDefault)\b/.test(l)) hit('R5', f, i + 1, l)
  })
}

// R6 — selectors without the app prefix (elements: app-*, attributes: [app...]).
for (const f of ts) {
  lines(f).forEach((l, i) => {
    const m = l.match(/^\s*selector:\s*'([^']+)'/)
    if (!m) return
    const ok = m[1].split(',').every((part) => {
      const s = part.trim()
      return /^app-/.test(s) || /(^|[a-z])\[app[A-Z]/.test(s)
    })
    if (!ok) hit('R6', f, i + 1, l)
  })
}

// R7 — boolean signals not named is*/has*/can*/should*.
for (const f of ts) {
  lines(f).forEach((l, i) => {
    const m = l.match(/^\s*(?:(?:protected|private|public|readonly)\s+)*([a-zA-Z0-9_]+)\s*=\s*signal(?:<boolean>)?\((?:true|false)\)/)
    if (m && !/^_?(is|has|can|should)[A-Z]/.test(m[1])) hit('R7', f, i + 1, l, EXCEPTIONS.R7.includes(`${f} ${m[1]}`))
  })
}

// R8 — public input()/model() names with a trailing underscore (convention: private state only).
for (const f of ts) {
  lines(f).forEach((l, i) => {
    if (/^\s*(?:readonly\s+)?[a-zA-Z0-9]+_\s*=\s*(input|model)(\.required)?(<[^>]*>)?\(/.test(l)) hit('R8', f, i + 1, l)
  })
}

// R9 — raw Hebrew in .ts/.html outside comments.
const HEBREW = /[֐-׿]/
for (const f of [...ts, ...html]) {
  let inBlock = false
  lines(f).forEach((l, i) => {
    const t = l.trim()
    if (inBlock) {
      if (t.includes('*/') || t.includes('-->')) inBlock = false
      return
    }
    if (t.startsWith('//') || t.startsWith('*')) return
    if (t.startsWith('/*') || t.startsWith('<!--')) {
      if (!t.includes('*/') && !t.includes('-->')) inBlock = true
      return
    }
    const code = l.replace(/\/\/.*$/, '').replace(/<!--.*?-->/g, '')
    if (HEBREW.test(code)) hit('R9', f, i + 1, l, EXCEPTIONS.R9.includes(f))
  })
}

const RULES = {
  R1: '.c-* engine defined outside src/styles.scss',
  R2: '@layer missing in component SCSS',
  R3: 'OnPush missing on cook-view / recipe-builder',
  R4: '@ViewChild/@ViewChildren/@HostListener/@HostBinding',
  R5: '*ngIf/*ngFor/*ngSwitch in templates',
  R6: 'selector without app prefix',
  R7: 'boolean signal not is/has/can/should',
  R8: 'input()/model() with trailing _',
  R9: 'raw Hebrew in .ts/.html (non-comment lines)',
}

const args = process.argv.slice(2)
const only = args.find((a) => a.startsWith('--rule='))?.slice('--rule='.length)
const list = args.includes('--list')
const selected = Object.keys(RULES).filter((r) => !only || r === only)

if (list) {
  for (const h of hits.filter((x) => selected.includes(x.rule))) {
    console.log(`${h.rule}${h.exception ? ' (exception)' : ''}  ${h.file}:${h.line}  ${h.text}`)
  }
} else {
  console.log('rule | what | count | documented exceptions | files')
  for (const r of selected) {
    const rh = hits.filter((x) => x.rule === r)
    const counted = rh.filter((x) => !x.exception)
    const exc = rh.filter((x) => x.exception)
    const nFiles = new Set(counted.map((x) => x.file)).size
    console.log(`${r} | ${RULES[r]} | ${counted.length} | ${exc.length} | ${nFiles}`)
  }
}
