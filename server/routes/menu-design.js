'use strict'
/**
 * The menu design program's routes at /api/v1/menu-design.
 *
 * Plan 767: GET /pdf-smoke (platform admin only) renders the fixed sample menu on this server and answers the time and
 * memory it took: `?fonts=link|embedded` (default link); `?download=1` answers the PDF itself. It reads no data.
 */
const { Router } = require('express')
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth')
const menuPdf = require('../services/menu-pdf')
const { baseDesign, SAMPLE_MENU_DOC, renderMenuDocument } = require('../generated/schemas/menu-design')

const router = Router()

const FONT_MODES = ['link', 'embedded']

router.get('/pdf-smoke', verifyToken, requirePlatformAdmin, async (req, res, next) => {
  const fonts = req.query.fonts ?? 'link'
  if (!FONT_MODES.includes(fonts)) return res.status(400).json({ error: 'BAD_FONTS' })
  try {
    const html = renderMenuDocument(baseDesign('classic'), SAMPLE_MENU_DOC, { poweredBy: true, fonts })
    const { pdf, coldStartMs, renderMs, nodeRssMb, browserRssMb, peakTotalMb } =
      await menuPdf.renderPdfMeasured(fonts === 'embedded' ? menuPdf.embedFonts(html) : html)
    const measured = { coldStartMs, renderMs, pdfBytes: pdf.length, nodeRssMb, browserRssMb, peakTotalMb, fonts }
    req.log.info({ event: 'menu_pdf.smoke.done', ...measured })
    res.set('Cache-Control', 'no-store')
    if (req.query.download === '1') {
      res.attachment('menu-sample.pdf')
      return res.send(pdf)
    }
    return res.json(measured)
  } catch (err) {
    if (!menuPdf.isMenuPdfError(err)) return next(err)
    req.log.warn({ event: 'menu_pdf.smoke.failed', code: err.code, reason: err.reason, fonts })
    return res.status(err.status).json({ error: err.code })
  }
})

module.exports = router
