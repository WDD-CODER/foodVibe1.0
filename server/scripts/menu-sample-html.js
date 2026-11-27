'use strict'
/**
 * Plan 764: writes the sample menu in each of the four base designs to the OS temp folder and prints the four paths, so
 * a person can open them in a browser and judge the looks. Reads no database. Needs `pnpm run build:schemas` first.
 *
 *   node server/scripts/menu-sample-html.js
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { MENU_BASE_TEMPLATES, baseDesign, SAMPLE_MENU_DOC, renderMenuDocument } = require('../generated/schemas/menu-design')

function writeSamples(folder = fs.mkdtempSync(path.join(os.tmpdir(), 'foodvibe-menu-sample-'))) {
  return MENU_BASE_TEMPLATES.map(id => {
    const design = baseDesign(id)
    design.fixedTexts = { businessName: 'המטבח לדוגמה', contactLine: 'להזמנות: 050-0000000 · hello@example.com' }
    const file = path.join(folder, `menu-sample-${id}.html`)
    fs.writeFileSync(file, renderMenuDocument(design, SAMPLE_MENU_DOC, { poweredBy: true, fonts: 'link' }), 'utf8')
    return file
  })
}

if (require.main === module) {
  for (const file of writeSamples()) console.log(file)
}

module.exports = { writeSamples }
