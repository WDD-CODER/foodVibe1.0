'use strict'
/**
 * Plan 767: downloads, once, the two menu fonts the server can embed in a PDF (Heebo and Frank Ruhl Libre, both OFL)
 * into server/assets/menu-fonts/: the Hebrew, Latin and Latin-extended woff2 files, their licence texts and a
 * `fonts.json` list that `server/services/menu-pdf/fonts.js` reads. The files are committed, so a deploy never runs this.
 *
 *   node server/scripts/menu-fonts-fetch.js
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'assets', 'menu-fonts')
const SUBSETS = ['hebrew', 'latin', 'latin-ext']
const FAMILIES = [
  { family: 'Heebo', slug: 'heebo', license: 'heebo' },
  { family: 'Frank Ruhl Libre', slug: 'frank-ruhl-libre', license: 'frankruhllibre' },
]
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&family=Frank+Ruhl+Libre:wght@300;400;700&display=swap'
// Google Fonts answers woff2 only to a browser that says it can read it.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36'

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** The wanted @font-face blocks of Google's CSS, one entry per file with the weights that use it. */
function parseFaces(css) {
  const faces = new Map()
  const block = /\/\* ([a-z-]+) \*\/\s*@font-face \{([^}]*)\}/g
  for (const [, subset, body] of css.matchAll(block)) {
    if (!SUBSETS.includes(subset)) continue
    const read = pattern => {
      const match = body.match(pattern)
      if (!match) throw new Error(`unreadable @font-face block (${subset})`)
      return match[1]
    }
    const family = read(/font-family: '([^']+)'/)
    const weight = Number(read(/font-weight: (\d+)/))
    const url = read(/src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)
    const face = faces.get(url) ?? { family, subset, url, unicodeRange: read(/unicode-range: ([^;]+);/), weights: [] }
    face.weights.push(weight)
    faces.set(url, face)
  }
  return [...faces.values()]
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const faces = parseFaces((await download(CSS_URL)).toString('utf8'))
  const list = []
  for (const { family, slug, license } of FAMILIES) {
    for (const subset of SUBSETS) {
      const found = faces.filter(face => face.family === family && face.subset === subset)
      if (!found.length) throw new Error(`no ${subset} file for ${family}`)
      for (const face of found) {
        const [min, max] = [Math.min(...face.weights), Math.max(...face.weights)]
        // One variable file serves every weight; separate static files carry their weight in the name.
        const file = found.length === 1 ? `${slug}-${subset}.woff2` : `${slug}-${subset}-${min}.woff2`
        fs.writeFileSync(path.join(OUT_DIR, file), await download(face.url))
        list.push({ family, subset, file, weight: min === max ? `${min}` : `${min} ${max}`, unicodeRange: face.unicodeRange })
        console.log(file)
      }
    }
    const text = await download(`https://raw.githubusercontent.com/google/fonts/main/ofl/${license}/OFL.txt`)
    fs.writeFileSync(path.join(OUT_DIR, `${slug}-OFL.txt`), text.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
    console.log(`${slug}-OFL.txt`)
  }
  fs.writeFileSync(path.join(OUT_DIR, 'fonts.json'), `${JSON.stringify(list, null, 2)}\n`, 'utf8')
  console.log('fonts.json')
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message)
    process.exitCode = 1
  })
}

module.exports = { parseFaces }
