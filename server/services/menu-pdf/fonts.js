'use strict'
/**
 * Plan 767: the fonts the server keeps (server/assets/menu-fonts, fetched by server/scripts/menu-fonts-fetch.js),
 * written into a menu document as `data:` @font-face rules. Only Heebo and Frank Ruhl Libre are kept.
 */
const fs = require('node:fs')
const path = require('node:path')

const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'menu-fonts')

let cached = null

function fontFaceCss() {
  if (cached) return cached
  const faces = JSON.parse(fs.readFileSync(path.join(FONTS_DIR, 'fonts.json'), 'utf8'))
  cached = faces.map(face => {
    const data = fs.readFileSync(path.join(FONTS_DIR, face.file)).toString('base64')
    return `@font-face { font-family: "${face.family}"; font-style: normal; font-weight: ${face.weight}; `
      + `src: url(data:font/woff2;base64,${data}) format("woff2"); unicode-range: ${face.unicodeRange}; }`
  }).join('\n')
  return cached
}

/** The document of `renderMenuDocument(..., { fonts: 'embedded' })` with the kept fonts inside it. */
function embedFonts(html) {
  return html.replace('</head>', () => `<style>\n${fontFaceCss()}\n</style>\n</head>`)
}

module.exports = { embedFonts }
