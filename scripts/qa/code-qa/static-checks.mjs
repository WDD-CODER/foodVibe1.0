/**
 * Code QA layer 2 — static (plan 413): checks that need no server.
 *   G4  every literal 'key' | translatePipe in src/app/**\/*.html is in dictionary.json; template text that is
 *       not piped (S3)
 *   G3  physical CSS properties in src/**\/*.scss and inline styles (S3)
 *   routes  every loadComponent import resolves to a file exporting the class; every redirectTo target exists;
 *       every route in docs/qa/qa-plan.md section headers exists in the router (S2)
 *   page map  a docs/qa/code-qa-pages.json glob that matches no file (S4)
 * Every check takes `root`, so the tests run it on fixtures.
 */
import { existsSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join, resolve } from 'path'
import { globFiles, loadPageMap, pageForFile, rel, walk } from './common.mjs'

const require = createRequire(import.meta.url)

// --- helpers -------------------------------------------------------------------

/** Replaces every match with spaces of the same length (newlines kept), so offsets and lines stay true. */
const mask = (s, re) => s.replace(re, (m) => m.replace(/[^\n]/g, ' '))
const lineOf = (s, idx) => s.slice(0, idx).split('\n').length
const LETTER = /[A-Za-z֐-׿]/

/** Flat lower-case key set of dictionary.json (the app's translate() flattens the sections the same way). */
export function dictionaryKeys(root) {
  const file = join(root, 'public', 'assets', 'data', 'dictionary.json')
  if (!existsSync(file)) return new Set()
  const dict = JSON.parse(readFileSync(file, 'utf8'))
  const keys = new Set()
  for (const [k, v] of Object.entries(dict)) {
    if (v && typeof v === 'object') for (const sub of Object.keys(v)) keys.add(sub.toLowerCase())
    else keys.add(k.toLowerCase())
  }
  return keys
}

// --- G4: translation keys and unpiped text --------------------------------------------

/** Text that is allowed to sit in a template unpiped (brand names, symbols). */
const ALLOWED_TEXT = [/^foodCo$/i]

const PIPE_KEY = /(['"])([A-Za-z0-9_.-]+)\1\s*\|\s*translatePipe\b/g
const CONTROL_FLOW = /(?:\}\s*)?@(?:if|else\s+if|for|switch|case|defer|placeholder|loading|error)\s*(?:\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))?\s*\{|(?:\}\s*)?@(?:else|empty|default)\s*\{|@let\s[^;]*;|[{}]/g

/** Template text left after removing markup, bindings and control flow, as [{ text, line }]. */
export function unpipedText(html) {
  let s = mask(html, /<!--[\s\S]*?-->/g)
  s = mask(s, /<(style|script)\b[\s\S]*?<\/\1>/gi)
  s = mask(s, /\{\{[\s\S]*?\}\}/g)
  s = mask(s, /<\/?[a-zA-Z][\w:-]*(?:\s+(?:[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?))*\s*\/?>/g)
  s = mask(s, CONTROL_FLOW)
  s = mask(s, /&[a-zA-Z#0-9]+;/g)
  const out = []
  const re = /\S(?:[^\n]*\S)?/g
  let m
  while ((m = re.exec(s))) {
    const text = m[0].replace(/\s{2,}/g, ' ')
    if (!LETTER.test(text) || ALLOWED_TEXT.some((a) => a.test(text))) continue
    out.push({ text, line: lineOf(s, m.index) })
  }
  return out
}

export function checkTranslations(root, pageMap) {
  const keys = dictionaryKeys(root)
  const templates = walk(join(root, 'src', 'app')).filter((p) => p.endsWith('.html'))
  const findings = []
  let used = 0
  for (const abs of templates) {
    const file = rel(root, abs)
    const html = readFileSync(abs, 'utf8')
    const page = pageForFile(pageMap, file)
    for (const m of html.matchAll(PIPE_KEY)) {
      used++
      if (keys.has(m[2].toLowerCase())) continue
      findings.push({
        check: 'G4-key', page, locator: `key:${m[2]}`, severity: 'S3', type: 'TEXT',
        title: `translation key "${m[2]}" is not in dictionary.json`, where: `${file}:${lineOf(html, m.index)}`,
        expected: `"${m[2]}" in public/assets/data/dictionary.json`, actual: `the screen shows the raw key «${m[2]}»`
      })
    }
    for (const t of unpipedText(html)) {
      findings.push({
        check: 'G4-text', page, locator: `${file}#text:${t.text.slice(0, 60)}`, severity: 'S3', type: 'TEXT',
        title: `template text not translated: «${t.text.slice(0, 60)}»`, where: `${file}:${t.line}`,
        expected: 'text through translatePipe + dictionary.json', actual: `literal «${t.text.slice(0, 120)}» in the template`
      })
    }
  }
  return { findings, coverage: `${templates.length} templates · ${used} translatePipe keys` }
}

// --- G3: physical CSS ---------------------------------------------------------------

const PHYSICAL = /^(margin|padding)-(left|right)$|^border-(left|right)(-[a-z]+)?$|^(left|right)$/
const PHYSICAL_VALUE = { 'text-align': /^(left|right)\b/, float: /^(left|right)\b/ }

const isPhysical = (prop, value) =>
  PHYSICAL.test(prop) || (PHYSICAL_VALUE[prop] && PHYSICAL_VALUE[prop].test(value))

/** Pairs that mean nothing in RTL when both sides get the same value (left:0;right:0, margin auto …). */
const MIRROR = { left: 'right', 'margin-left': 'margin-right', 'padding-left': 'padding-right', 'border-left': 'border-right' }

/** Physical declarations of one stylesheet as [{ selector, prop, value, line }], symmetric pairs dropped. */
export function physicalDeclarations(scss) {
  // Comments and #{…} interpolation out first: neither may open or close a block.
  const s = mask(mask(mask(scss, /\/\*[\s\S]*?\*\//g), /(^|[^:])\/\/[^\n]*/g), /#\{[^}]*\}/g)
  const out = []
  const stack = [{ selector: '', decls: [] }]
  let buf = ''
  let bufStart = 0
  const flushDecl = (end) => {
    const text = buf.trim()
    buf = ''
    const m = /^([a-z-]+)\s*:\s*([^;]+?)\s*(!important)?$/i.exec(text)
    if (!m) return
    stack[stack.length - 1].decls.push({ prop: m[1].toLowerCase(), value: m[2].trim(), line: lineOf(s, bufStart || end) })
  }
  const closeBlock = () => {
    const block = stack.pop()
    if (!block) return
    const byProp = new Map(block.decls.map((d) => [d.prop, d]))
    const centred = block.decls.some((d) => /translate/.test(d.value))
    for (const d of block.decls) {
      if (!isPhysical(d.prop, d.value)) continue
      const base = d.prop.replace(/-(left|right)$/, '-left').replace(/^right$/, 'left')
      const pair = MIRROR[base] && (d.prop === base ? byProp.get(MIRROR[base]) : byProp.get(base))
      if (pair && pair.value === d.value) continue
      if (d.prop === 'left' && /^50%$/.test(d.value) && centred) continue
      // Off-screen hiding (left: -9999px) has no visible side.
      if (/^(left|right)$/.test(d.prop) && /^-\d{4,}px$/.test(d.value)) continue
      out.push({ selector: stack.map((b) => b.selector).concat(block.selector).filter(Boolean).join(' ').replace(/\s+/g, ' '), ...d })
    }
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '{' && s[i - 1] !== '#') {
      stack.push({ selector: buf.trim(), decls: [] })
      buf = ''
    } else if (c === '}') {
      if (buf.trim()) flushDecl(i)
      buf = ''
      if (stack.length > 1) closeBlock()
    } else if (c === ';') flushDecl(i)
    else {
      if (!buf.trim() && c.trim()) bufStart = i
      buf += c
    }
  }
  while (stack.length > 1) closeBlock()
  // Top-level declarations (rare in SCSS) sit in stack[0].
  return out
}

export function checkPhysicalCss(root, pageMap) {
  const files = walk(join(root, 'src'))
  const findings = []
  let sheets = 0
  for (const abs of files) {
    const file = rel(root, abs)
    const page = pageForFile(pageMap, file)
    if (abs.endsWith('.scss') || abs.endsWith('.css')) {
      sheets++
      for (const d of physicalDeclarations(readFileSync(abs, 'utf8'))) {
        findings.push({
          check: 'G3-css', page, locator: `${file}#${d.selector} ${d.prop}`, severity: 'S3', type: 'RTL',
          title: `physical CSS \`${d.prop}: ${d.value}\` in ${d.selector || '(top level)'}`, where: `${file}:${d.line}`,
          expected: 'a logical property (inline-start / inline-end)', actual: `\`${d.prop}: ${d.value}\``
        })
      }
    } else if (abs.endsWith('.html')) {
      const html = readFileSync(abs, 'utf8')
      const re = /\bstyle="([^"]*)"|\[style\.((?:margin|padding|border)-(?:left|right)|left|right|text-align|float)\]/g
      let m
      while ((m = re.exec(html))) {
        const decls = m[1] !== undefined
          ? m[1].split(';').map((d) => d.split(':').map((x) => x.trim())).filter(([p, v]) => p && v !== undefined && isPhysical(p.toLowerCase(), v))
          : [[m[2], '(bound)']]
        for (const [prop, value] of decls) {
          findings.push({
            check: 'G3-css', page, locator: `${file}#style ${prop.toLowerCase()}`, severity: 'S3', type: 'RTL',
            title: `physical inline style \`${prop}\``, where: `${file}:${lineOf(html, m.index)}`,
            expected: 'a logical property (inline-start / inline-end)', actual: `\`${prop}: ${value}\``
          })
        }
      }
    }
  }
  return { findings, coverage: `${sheets} style files` }
}

// --- routes ---------------------------------------------------------------------

const norm = (p) => p.replace(/\?.*$/, '').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean).map((s) => (s.startsWith(':') ? ':' : s)).join('/')

/** tsconfig "paths" as [{ prefix, targets }] ('@pages/*' → 'src/app/pages/*'). */
function tsPaths(ts, root) {
  const file = join(root, 'tsconfig.json')
  if (!existsSync(file)) return []
  const cfg = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8')).config || {}
  const paths = cfg.compilerOptions?.paths || {}
  const base = resolve(root, cfg.compilerOptions?.baseUrl || '.')
  return Object.entries(paths).map(([k, v]) => ({ prefix: k.replace(/\*$/, ''), targets: v.map((t) => join(base, t.replace(/\*$/, ''))) }))
}

function resolveImport(spec, fromFile, aliases) {
  const candidates = []
  if (spec.startsWith('.')) candidates.push(resolve(dirname(fromFile), spec))
  for (const a of aliases) if (spec.startsWith(a.prefix)) for (const t of a.targets) candidates.push(join(t, spec.slice(a.prefix.length)))
  for (const c of candidates) for (const f of [`${c}.ts`, join(c, 'index.ts'), c]) if (existsSync(f) && f.endsWith('.ts')) return f
  return null
}

/** Router table of one routes file: [{ full, parent, path, redirectTo, load: { spec, name } | null, line }]. */
export function parseRoutes(ts, file) {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const out = []
  const prop = (obj, name) => obj.properties.find((p) => p.name && p.name.getText(src) === name)
  const str = (p) => (p && ts.isStringLiteralLike(p.initializer) ? p.initializer.text : undefined)
  const walkArray = (arr, parent) => {
    for (const el of arr.elements) {
      if (!ts.isObjectLiteralExpression(el)) continue
      const path = str(prop(el, 'path'))
      if (path === undefined) continue
      const full = [parent, path].filter(Boolean).join('/')
      let load = null
      const lc = prop(el, 'loadComponent')
      if (lc) {
        const text = lc.initializer.getText(src)
        const m = /import\(\s*['"]([^'"]+)['"]\s*\)[\s\S]*?\.then\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\2\.(\w+)/.exec(text)
        load = m ? { spec: m[1], name: m[3] } : { spec: null, name: null, text }
      }
      out.push({ full, parent, path, redirectTo: str(prop(el, 'redirectTo')), load, line: src.getLineAndCharacterOfPosition(el.getStart()).line + 1 })
      const ch = prop(el, 'children')
      if (ch && ts.isArrayLiteralExpression(ch.initializer)) walkArray(ch.initializer, full)
    }
  }
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) walkArray(node.initializer, '')
    ts.forEachChild(node, visit)
  }
  visit(src)
  return out
}

/** Routes named in docs/qa/qa-plan.md section headers: [{ page, route }]. */
export function planRoutes(planText) {
  const out = []
  for (const line of planText.split(/\r?\n/)) {
    const h = /^##\s+\d+\.\s+([A-Z]+)\s+—\s+(.*)$/.exec(line)
    if (!h) continue
    let prev = null
    for (const m of h[2].matchAll(/`(\/[^`]*)`/g)) {
      let route = m[1].replace(/\?.*$/, '')
      if (prev && /^\/:/.test(route)) route = `${prev}${route}`
      else if (prev && /^\/(add|edit|view)\b/.test(route) && !/^\/(add|edit|view)\b/.test(prev)) route = `${prev.replace(/\/[^/]+$/, '')}${route}`
      out.push({ page: h[1], route })
      prev = route
    }
  }
  return out
}

export function checkRoutes(root, pageMap) {
  const ts = require(require.resolve('typescript', { paths: [root, process.cwd()] }))
  const aliases = tsPaths(ts, root)
  const routeFiles = walk(join(root, 'src', 'app')).filter((p) => /(^|[\\/])app\.routes\.ts$|\.routes\.ts$/.test(p))
  const findings = []
  const table = []
  for (const file of routeFiles) for (const r of parseRoutes(ts, file)) table.push({ ...r, file })
  const defined = new Set(table.map((r) => norm(r.full)))
  for (const r of table) {
    const fileRel = rel(root, r.file)
    if (r.load) {
      const target = r.load.spec && resolveImport(r.load.spec, r.file, aliases)
      const ok = target && r.load.name && new RegExp(`export\\s+(?:default\\s+)?class\\s+${r.load.name}\\b`).test(readFileSync(target, 'utf8'))
      if (!ok) {
        findings.push({
          check: 'route-component', page: 'GLOBAL', locator: `route:/${r.full}`, severity: 'S2', type: 'FUNC',
          title: `route /${r.full} loads a component that does not resolve`, where: `${fileRel}:${r.line}`,
          expected: `${r.load.spec || '?'} exports class ${r.load.name || '?'}`,
          actual: target ? `${rel(root, target)} has no class ${r.load.name}` : `import ${r.load.spec || '(unparsed)'} resolves to no file`
        })
      }
    }
    if (r.redirectTo !== undefined) {
      // Angular resolves a relative redirectTo against the parent route.
      const target = r.redirectTo.startsWith('/') ? r.redirectTo : [r.parent, r.redirectTo].filter(Boolean).join('/')
      if (!defined.has(norm(target))) {
        findings.push({
          check: 'redirect', page: 'REDIR', locator: `redirect:/${r.full}`, severity: 'S2', type: 'FUNC',
          title: `redirect /${r.full} → /${norm(target)} goes to an undefined route`, where: `${fileRel}:${r.line}`,
          expected: `a route /${norm(target)}`, actual: 'no such route in the router'
        })
      }
    }
  }
  let planned = []
  const planFile = join(root, 'docs', 'qa', 'qa-plan.md')
  if (existsSync(planFile)) planned = planRoutes(readFileSync(planFile, 'utf8'))
  for (const p of planned) {
    if (defined.has(norm(p.route))) continue
    findings.push({
      check: 'plan-route', page: p.page, locator: `route:${p.route}`, severity: 'S2', type: 'FUNC',
      title: `qa-plan.md route ${p.route} is not in the router`, where: `docs/qa/qa-plan.md § ${p.page}`,
      expected: `the router defines ${p.route}`, actual: 'no matching route (UI agent P1: UNREACHABLE)'
    })
  }
  return { findings, coverage: `${table.length} router paths · ${planned.length} plan routes` }
}

// --- page map ----------------------------------------------------------------------

export function checkPageMap(root, pageMap) {
  const findings = []
  let globs = 0
  for (const p of pageMap.pages) {
    for (const g of p.files || []) {
      globs++
      if (globFiles(root, g).length) continue
      findings.push({
        check: 'page-map', page: p.id, locator: `glob:${g}`, severity: 'S4', type: 'DOCS',
        title: `page map stale: ${g} matches no file`, where: 'docs/qa/code-qa-pages.json',
        expected: 'every files glob matches at least one file', actual: `${g} matches nothing`
      })
    }
  }
  return { findings, coverage: `${globs} page-map globs` }
}

/** The whole layer. */
export function runStatic({ root }) {
  const started = Date.now()
  const pageMap = loadPageMap(root)
  const parts = [checkTranslations, checkPhysicalCss, checkRoutes, checkPageMap].map((fn) => fn(root, pageMap))
  return {
    status: 'ok', durationMs: Date.now() - started, coveredPages: '*',
    coverage: parts.map((p) => p.coverage).join(' · '),
    findings: parts.flatMap((p) => p.findings)
  }
}
