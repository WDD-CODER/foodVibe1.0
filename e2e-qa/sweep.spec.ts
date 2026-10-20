/**
 * Code QA sweep (plan 413): every route of docs/qa/code-qa-pages.json × D/T/M, signed in as QA_USER.
 * Run by scripts/qa/code-qa/run.mjs (never by hand without it — it supplies the inputs):
 *   QA_CODE_APP       app origin (http://localhost:4205)
 *   QA_CODE_SESSION   { token, user } JSON of the QA login (env only, never written to a report)
 *   QA_CODE_ROUTES    JSON file: [{ page, route, url }] — :id already filled, NO-DATA routes left out
 *   QA_CODE_OUT       JSONL file: one line per route × breakpoint with its raw findings
 *   QA_CODE_SHOTS     folder for <PAGE>-<bp>.png full-page shots
 *   QA_CODE_SHOTS_REL the same folder, repo-relative, for the report
 * Checks: G1 horizontal scroll · G4 raw dictionary keys on screen · G5 hit area at M · G8 console and
 * network errors · broken images · <html dir> · axe-core wcag2a/wcag2aa serious/critical.
 */
import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { appendFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

interface RouteEntry { page: string, route: string, url: string }
interface RawFinding {
  check: string, locator: string, severity: string, type: string, title: string
  where?: string, expected?: string, actual?: string, detail?: string
}
interface QaLogin {
  seedQaContext: (context: unknown, session: unknown, app: string) => Promise<void>
}

const APP = (process.env['QA_CODE_APP'] || 'http://localhost:4205').replace(/\/$/, '')
const ROUTES: RouteEntry[] = process.env['QA_CODE_ROUTES'] ? JSON.parse(readFileSync(process.env['QA_CODE_ROUTES'], 'utf8')) : []
const OUT = process.env['QA_CODE_OUT'] || ''
const SHOTS = process.env['QA_CODE_SHOTS'] || ''
const SHOTS_REL = process.env['QA_CODE_SHOTS_REL'] || SHOTS
const LOADER_TEXT = 'רגע, מכינים הכל...'

const BREAKPOINTS = [
  { bp: 'D', width: 1366, height: 768 },
  { bp: 'T', width: 768, height: 1024 },
  { bp: 'M', width: 375, height: 812 }
] as const

/** Flat lower-case dictionary keys with the key shape — G4 reports these when they show raw on screen. */
const DICT_KEYS: string[] = (() => {
  const dict = JSON.parse(readFileSync(join(process.cwd(), 'public', 'assets', 'data', 'dictionary.json'), 'utf8')) as Record<string, unknown>
  const keys = new Set<string>()
  for (const [k, v] of Object.entries(dict)) {
    for (const key of v && typeof v === 'object' ? Object.keys(v as object) : [k]) {
      if (/^[a-z][a-z0-9_]+$/.test(key.toLowerCase())) keys.add(key.toLowerCase())
    }
  }
  return [...keys]
})()

/** Expected noise, never a finding (qa-agent.md G8). */
const IGNORED_URL = /\/qa-evidence\/|\/api\/v1\/log\b|\/api\/v1\/auth\/refresh\b|\/api\/v1\/data\/DICTIONARY_OVERRIDES\/global\b/
/** Record ids: UUIDs (new records) and 24-hex ids (older ones). */
const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b/gi
const shapeUrl = (u: string) => {
  try {
    const url = new URL(u)
    return url.pathname.replace(ID, ':id').replace(/\/\d+\b/g, '/:n')
  } catch { return u }
}
const shapeMsg = (m: string) =>
  m.replace(/https?:\/\/[^\s)]+/g, (u) => shapeUrl(u)).replace(ID, ':id').replace(/\d+/g, 'n').slice(0, 140)

let loginModule: QaLogin | null = null
async function qaLogin(): Promise<QaLogin> {
  if (!loginModule) {
    const file = pathToFileURL(join(process.cwd(), 'scripts', 'qa', 'lib', 'qa-login.mjs')).href
    loginModule = (await import(file)) as QaLogin
  }
  return loginModule
}

test.describe.configure({ mode: 'parallel' })

for (const r of ROUTES) {
  for (const b of BREAKPOINTS) {
    test(`${r.page} ${r.route} ${b.bp}`, async ({ browser }) => {
      const started = Date.now()
      const session = JSON.parse(process.env['QA_CODE_SESSION'] || 'null')
      const mobile = b.bp === 'M'
      const context = await browser.newContext({
        viewport: { width: b.width, height: b.height }, isMobile: mobile, hasTouch: mobile, locale: 'he-IL'
      })
      const findings: RawFinding[] = []
      const where = `${r.url} at ${b.bp} ${b.width}×${b.height}`
      let shot = ''
      let error = ''
      try {
        if (session) await (await qaLogin()).seedQaContext(context, session, APP)
        const page = await context.newPage()
        const consoleErrors: string[] = []
        const badResponses: { status: number, method: string, url: string }[] = []
        page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
        page.on('pageerror', (e) => consoleErrors.push(`Uncaught ${e.message}`))
        page.on('response', (res) => {
          if (res.status() >= 400 && !IGNORED_URL.test(res.url())) {
            badResponses.push({ status: res.status(), method: res.request().method(), url: res.url() })
          }
        })
        await page.goto(`${APP}${r.url}`, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {})
        await page.getByText(LOADER_TEXT).first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
        await page.waitForTimeout(500)

        const probe = await page.evaluate(({ keys, mobile }) => {
          const visible = (el: Element) => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) return false
            const st = getComputedStyle(el)
            if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false
            return !el.closest('[aria-hidden="true"], [hidden]')
          }
          const selectorOf = (el: Element) => {
            const parts: string[] = []
            let cur: Element | null = el
            for (let depth = 0; cur && depth < 4; depth++) {
              const tag = cur.tagName.toLowerCase()
              if (cur.id && !/\d{3,}/.test(cur.id)) { parts.unshift(`${tag}#${cur.id}`); break }
              const classes = [...cur.classList].filter((c) => !/^(ng-|_ng|cdk-)|\d{3,}|--active$|^active$|^is-/.test(c)).slice(0, 2)
              parts.unshift(tag + classes.map((c) => `.${c}`).join(''))
              if (tag.includes('-')) break
              cur = cur.parentElement
            }
            return parts.join(' > ')
          }
          const overflow = document.documentElement.scrollWidth - window.innerWidth
          const dir = document.documentElement.getAttribute('dir') || ''
          // G4: visible text that is a dictionary key
          const keySet = new Set(keys)
          const rawKeys = new Set<string>()
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const text = (n.textContent || '').trim()
            if (!/^[a-z][a-z0-9_]+$/.test(text) || !keySet.has(text)) continue
            const parent = n.parentElement
            if (parent && visible(parent)) rawKeys.add(text)
          }
          // G5 at M: hit area of every visible control
          const small: { selector: string, w: number, h: number, primary: boolean }[] = []
          if (mobile) {
            const seen = new Set<string>()
            const controls = document.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, [tabindex]:not([tabindex="-1"])')
            for (const el of controls) {
              if (!visible(el)) continue
              const r = el.getBoundingClientRect()
              let w = r.width
              let h = r.height
              const parent = el.parentElement?.closest('button, a, [role=button], label')
              if (parent) {
                const pr = parent.getBoundingClientRect()
                w = Math.max(w, pr.width)
                h = Math.max(h, pr.height)
              }
              for (const pseudo of ['::before', '::after']) {
                const ps = getComputedStyle(el, pseudo)
                if (ps.content === 'none' || ps.position !== 'absolute') continue
                w = Math.max(w, parseFloat(ps.width) || 0)
                h = Math.max(h, parseFloat(ps.height) || 0)
              }
              const primary = el.matches('.c-btn-primary, [class*="--primary"], .fab-main, button[type=submit]')
              if (w >= 24 && h >= 24 && !(primary && h < 44)) continue
              const selector = selectorOf(el)
              if (seen.has(selector)) continue
              seen.add(selector)
              small.push({ selector, w: Math.round(w), h: Math.round(h), primary })
            }
          }
          // Broken images
          const broken = [...document.images]
            .filter((img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src) && visible(img))
            .map((img) => (img.currentSrc || img.src).replace(/[?#].*$/, ''))
          return { overflow, dir, rawKeys: [...rawKeys], small, broken: [...new Set(broken)] }
        }, { keys: DICT_KEYS, mobile })

        if (probe.overflow > 1) {
          findings.push({
            check: 'G1', locator: 'document', severity: mobile ? 'S2' : 'S3', type: 'VISUAL',
            title: 'horizontal page scroll', where, expected: 'scrollWidth <= innerWidth',
            actual: `the page is ${probe.overflow}px wider than the viewport`
          })
        }
        if (probe.dir !== 'rtl') {
          findings.push({
            check: 'dir', locator: 'html[dir]', severity: 'S2', type: 'RTL', title: '<html dir> is not rtl',
            where, expected: 'dir="rtl"', actual: `dir="${probe.dir}"`
          })
        }
        for (const key of probe.rawKeys) {
          findings.push({
            check: 'G4', locator: `key:${key}`, severity: 'S3', type: 'TEXT', title: `raw dictionary key «${key}» on screen`,
            where, expected: 'the Hebrew translation', actual: `«${key}»`
          })
        }
        for (const s of probe.small) {
          const tooSmall = s.w < 24 || s.h < 24
          findings.push({
            check: 'G5', locator: s.selector, severity: tooSmall ? 'S3' : 'S4', type: 'A11Y',
            title: tooSmall ? `tap target ${s.w}×${s.h} (under 24×24)` : `primary action ${s.h}px tall (under 44)`,
            where: `${where} · ${s.selector}`, expected: tooSmall ? 'hit area at least 24×24' : 'primary action at least 44px tall',
            actual: `${s.w}×${s.h}`
          })
        }
        for (const src of probe.broken) {
          findings.push({
            check: 'img', locator: `img:${shapeUrl(src)}`, severity: 'S3', type: 'VISUAL', title: 'broken image',
            where, expected: 'the image loads', actual: `naturalWidth 0 for ${shapeUrl(src)}`
          })
        }
        for (const msg of new Set(consoleErrors.filter((m) => !/^Failed to load resource/.test(m) && !IGNORED_URL.test(m)))) {
          findings.push({
            check: 'G8', locator: `console:${shapeMsg(msg)}`, severity: 'S2', type: 'CONSOLE', title: `console error: ${shapeMsg(msg).slice(0, 80)}`,
            where, expected: 'no console errors', actual: msg.slice(0, 300)
          })
        }
        for (const res of badResponses) {
          findings.push({
            check: 'G8', locator: `net:${res.method} ${res.status} ${shapeUrl(res.url)}`, severity: 'S2', type: 'CONSOLE',
            title: `${res.method} ${shapeUrl(res.url)} → ${res.status}`, where, expected: 'no 4xx/5xx responses',
            actual: `${res.status} on ${res.method} ${shapeUrl(res.url)}`
          })
        }
        try {
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          for (const v of axe.violations) {
            if (v.impact !== 'serious' && v.impact !== 'critical') continue
            findings.push({
              check: 'axe', locator: `axe:${v.id}`, severity: 'S3', type: 'A11Y', title: `axe ${v.id}: ${v.help}`,
              where, expected: v.helpUrl, actual: `${v.nodes.length} element(s), impact ${v.impact}`,
              detail: v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n')
            })
          }
        } catch (e) {
          findings.push({
            check: 'axe', locator: 'axe:run', severity: 'S4', type: 'TOOL', title: 'axe-core did not run',
            where, actual: String((e as Error).message).slice(0, 200)
          })
        }
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true })
          const idx = ROUTES.filter((x) => x.page === r.page).findIndex((x) => x.route === r.route)
          const name = `${r.page}${idx > 0 ? `-r${idx + 1}` : ''}-${b.bp}.png`
          await page.screenshot({ path: join(SHOTS, name), fullPage: true, timeout: 20_000 }).catch(() => {})
          shot = `${SHOTS_REL}/${name}`
        }
      } catch (e) {
        error = String((e as Error).message).slice(0, 300)
      } finally {
        await context.close().catch(() => {})
      }
      if (OUT) {
        appendFileSync(OUT, JSON.stringify({
          page: r.page, route: r.route, url: r.url, bp: b.bp, ok: !error, error, shot,
          durationMs: Date.now() - started, findings
        }) + '\n', 'utf8')
      }
    })
  }
}
