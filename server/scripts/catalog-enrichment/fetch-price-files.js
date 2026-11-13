'use strict'
/**
 * Plan 583 A3: download the newest full price file of one large store per chain and write one normalized JSON per
 * chain to `<work>/chains/<key>.json`. A chain already downloaded is kept, whatever its date (resumable);
 * `--refresh` downloads every chain again. A chain that cannot be
 * reached is skipped and the next one is tried; fewer than 3 readable chains after trying them all → exit 1.
 * Every download is plain HTTPS with certificate checks on. No sign-in is needed for the chains listed here.
 *
 *   node server/scripts/catalog-enrichment/fetch-price-files.js [--refresh]
 */

const fs = require('node:fs')
const { fileText, parsePriceXml } = require('./lib/price-file')
const { workPath, writeJson, readJson, runMain } = require('./lib/work-dir')

const WANTED = 5
/** How many stores of one chain to download before keeping the one with the most items. */
const STORES_TO_TRY = 3

const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '')
const dmy = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
const lastDays = (n) => Array.from({ length: n }, (_, i) => new Date(Date.now() - i * 86400000))

async function get(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(120000) })
  if (!res.ok) throw new Error(`${res.status} ${url.split('?')[0]}`)
  return res
}
const text = async (url, init) => (await get(url, init)).text()
const bytes = async (url, init) => Buffer.from(await (await get(url, init)).arrayBuffer())

/** File name → { store, stamp } for `PriceFull<chain>-<sub>-<store>-<yyyymmdd>-<hhmmss>`. */
function nameParts(name) {
  const m = /PriceFull\d+-(\d+)-(\d+)-(\d{8})-?(\d{4,6})?/i.exec(name)
  return m ? { store: m[2], stamp: `${m[3]}${m[4] ?? ''}` } : null
}

/** Newest file per store, newest stores first. */
function newestPerStore(files) {
  const best = new Map()
  for (const f of files) {
    const p = nameParts(f.name)
    if (!p) continue
    const cur = best.get(p.store)
    if (!cur || p.stamp > cur.stamp) best.set(p.store, { ...f, ...p })
  }
  return [...best.values()]
}

const CHAINS = [
  {
    key: 'shufersal', chainNameHebrew: 'שופרסל',
    async list() {
      // Signed links expire within hours: list and download in the same run.
      const out = []
      for (const storeId of ['413', '45', '263']) {
        const html = await text(`https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=${storeId}`)
        const link = (html.match(/https:\/\/pricesprodpublic\.blob\.core\.windows\.net\/pricefull\/[^"']+/) ?? [])[0]
        if (link) out.push({ name: link.split('/').pop().split('?')[0], url: link.replace(/&amp;/g, '&') })
      }
      return out
    }
  },
  {
    key: 'carrefour', chainNameHebrew: 'קרפור',
    async list() {
      for (const d of lastDays(3)) {
        const html = await text(`https://prices.carrefour.co.il/?date=${ymd(d)}`)
        const json = (/const files = (\[[\s\S]*?\]);/.exec(html) ?? [])[1]
        const files = json ? JSON.parse(json).filter(f => /^PriceFull/i.test(f.name)) : []
        if (files.length) {
          return newestPerStore(files).sort((a, b) => b.size - a.size)
            .map(f => ({ name: f.name, url: `https://prices.carrefour.co.il/${ymd(d)}/${f.name}` }))
        }
      }
      return []
    }
  },
  {
    key: 'hazi-hinam', chainNameHebrew: 'חצי חינם',
    async list() {
      const html = await text('https://shop.hazi-hinam.co.il/Prices')
      const links = [...new Set(html.match(/https:\/\/hazihinamprod01\.blob\.core\.windows\.net\/regulatories\/PriceFull[^"']+\.gz/gi) ?? [])]
      return newestPerStore(links.map(url => ({ name: url.split('/').pop(), url })))
    }
  },
  binaChain('king-store', 'קינג סטור', 'kingstore'),
  binaChain('maayan-2000', 'מעיין 2000', 'maayan2000'),
  binaChain('zol-vebegadol', 'זול ובגדול', 'zolvebegadol'),
  binaChain('super-bareket', 'סופר ברקת', 'superbareket'),
  binaChain('shuk-hayir', 'שוק העיר', 'shuk-hayir')
]

/** Chains hosted on binaprojects.com: a JSON file list per date, then a JSON answer with the file's path. */
function binaChain(key, chainNameHebrew, host) {
  const base = `https://${host}.binaprojects.com`
  return {
    key, chainNameHebrew,
    async list() {
      for (const d of lastDays(3)) {
        const body = `WStore=0&WDate=${encodeURIComponent(dmy(d))}&WFileType=4`
        const raw = await text(`${base}/MainIO_Hok.aspx`, {
          method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        const files = JSON.parse(raw).map(f => ({ name: f.FileNm }))
        if (files.length) return newestPerStore(files).map(f => ({ name: f.name, resolve: () => binaPath(base, f.name) }))
      }
      return []
    }
  }
}

async function binaPath(base, name) {
  const raw = await text(`${base}/Download.aspx?FileNm=${encodeURIComponent(name)}`)
  return JSON.parse(raw)[0].SPath
}

async function fetchChain(chain) {
  const files = (await chain.list()).slice(0, STORES_TO_TRY)
  if (!files.length) throw new Error('no full price file listed')
  let best = null
  for (const f of files) {
    try {
      const url = f.url ?? await f.resolve()
      const parsed = parsePriceXml(fileText(await bytes(url)))
      const p = nameParts(f.name)
      if (!best || parsed.items.length > best.items.length) {
        best = { chain: chain.key, chainNameHebrew: chain.chainNameHebrew, storeId: p?.store ?? '', fileName: f.name,
          fileDate: p?.stamp?.slice(0, 8) ?? '', fieldsFound: parsed.fields, items: parsed.items }
      }
      console.log(`  ${chain.key} store ${p?.store}: ${parsed.items.length} items`)
    } catch (err) {
      console.log(`  ${chain.key} ${f.name}: ${err.message}`)
    }
  }
  if (!best || best.items.length < 500) throw new Error('no readable file with at least 500 items')
  return best
}

async function main() {
  const refresh = process.argv.includes('--refresh')
  const statusFile = workPath('chains', 'fetch-status.json')
  const status = readJson(statusFile, {})
  const ok = []
  for (const chain of CHAINS) {
    if (ok.length >= WANTED) break
    const file = workPath('chains', `${chain.key}.json`)
    if (!refresh && fs.existsSync(file)) {
      ok.push(chain.key)
      console.log(`${chain.key}: kept (${file})`)
      continue
    }
    try {
      const data = await fetchChain(chain)
      writeJson(file, data)
      status[chain.key] = { ok: true, storeId: data.storeId, fileName: data.fileName, items: data.items.length, at: new Date().toISOString() }
      ok.push(chain.key)
      console.log(`${chain.key}: ${data.items.length} items, store ${data.storeId}, file ${data.fileName}`)
    } catch (err) {
      status[chain.key] = { ok: false, error: err.message, at: new Date().toISOString() }
      console.log(`${chain.key}: skipped — ${err.message}`)
    }
  }
  writeJson(statusFile, status)
  console.log(`chains readable: ${ok.length} (${ok.join(', ')})`)
  if (ok.length < 3) throw new Error('fewer than 3 chains readable — nothing can be priced')
}

runMain(main)
