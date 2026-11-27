'use strict'
/**
 * Plan 767: a real PDF of the sample menu, when this machine has a browser (the small Chromium on Linux, a local Chrome
 * elsewhere, or MENU_PDF_CHROME_PATH). Without one it prints SKIP and passes. The fonts are the kept ones, so the test
 * needs no network. Needs `pnpm run build:schemas` first (the `pretest` script runs it).
 */

const menuPdf = require('../services/menu-pdf')
const { baseDesign, SAMPLE_MENU_DOC, renderMenuDocument } = require('../generated/schemas/menu-design')

afterAll(async () => {
  await menuPdf.closeBrowser()
})

describe('renderPdf with a real browser', () => {
  it('prints the sample menu as one A4 page under 2 MB', async () => {
    const html = renderMenuDocument(baseDesign('classic'), SAMPLE_MENU_DOC, { poweredBy: true, fonts: 'embedded' })
    let pdf
    try {
      pdf = await menuPdf.renderPdf(menuPdf.embedFonts(html))
    } catch (err) {
      if (err.code !== 'PDF_UNAVAILABLE') throw err
      console.log('SKIP menu-pdf-real: no chromium')
      return
    }
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)).toHaveLength(1)
    expect(pdf.length).toBeLessThan(2 * 1024 * 1024)
  }, 120000)
})
