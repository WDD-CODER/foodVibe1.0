'use strict'
/**
 * Plan 767 (C-PDF): the one render service of the menu design program: menu HTML to a PDF, and a public web page to a
 * picture. It reads and writes no data and logs no HTML, address or PDF. Failures are coded errors
 * (menu-pdf/errors.js): PDF_BUSY, PDF_UNAVAILABLE, PDF_FAILED, URL_REFUSED, SCREENSHOT_FAILED, SCREENSHOT_TOO_LARGE.
 */
const browsers = require('./menu-pdf/browser')
const { isMenuPdfError, menuPdfError } = require('./menu-pdf/errors')
const { embedFonts } = require('./menu-pdf/fonts')
const { isAllowedRenderRequest, isAllowedScreenshotRequest, isPublicWebUrl } = require('./menu-pdf/guard')
const { startMemorySampler } = require('./menu-pdf/memory')

const FONTS_CAP_MS = 10 * 1000
const PDF_TIMEOUT_MS = 20 * 1000
const SCREENSHOT_TIMEOUT_MS = 15 * 1000
const CONTEXT_CLOSE_MS = 5000
const DEFAULT_WIDTH = 1280
const MIN_WIDTH = 320
const MAX_WIDTH = 1920
const VIEWPORT_HEIGHT = 1600
const MAX_PNG_BYTES = 5 * 1024 * 1024

/**
 * Runs `work` on a fresh browser context (nothing is shared between two jobs) under one time cap, and closes the
 * context whatever happens. A context that will not close takes the whole browser with it.
 */
async function inContext(browser, { options, timeoutMs, failure }, work) {
  let context = null
  try {
    return await browsers.withDeadline((async () => {
      context = await browser.createBrowserContext(options)
      return work(context)
    })(), timeoutMs)
  } catch (err) {
    if (isMenuPdfError(err)) throw err
    throw menuPdfError(failure, err?.name)
  } finally {
    if (context) {
      await browsers.withDeadline(context.close(), CONTEXT_CLOSE_MS).catch(() => browsers.closeBrowser())
    }
  }
}

function settle(request, allowed) {
  const done = allowed ? request.continue() : request.abort('blockedbyclient')
  // The page may be gone by the time the answer is sent.
  Promise.resolve(done).catch(() => {})
}

async function printPage(context, html) {
  const page = await context.newPage()
  page.setDefaultTimeout(PDF_TIMEOUT_MS)
  await page.setJavaScriptEnabled(false)
  await page.setRequestInterception(true)
  page.on('request', request => settle(request, isAllowedRenderRequest(request.url())))
  // With JavaScript off the page cannot be asked whether its fonts are ready: a quiet network is the sign.
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: FONTS_CAP_MS })
  const bytes = await page.pdf({
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
    waitForFonts: false,
    timeout: PDF_TIMEOUT_MS,
  })
  return Buffer.from(bytes)
}

function printJob(html, measure) {
  return browsers.inTurn(async () => {
    let browser = null
    const sampler = measure ? startMemorySampler(() => browser?.process()?.pid) : null
    let memory = null
    try {
      const opened = await browsers.openBrowser()
      browser = opened.browser
      const started = Date.now()
      let renderMs = 0
      const pdf = await inContext(browser, { timeoutMs: PDF_TIMEOUT_MS, failure: 'PDF_FAILED' }, async context => {
        const bytes = await printPage(context, html)
        renderMs = Date.now() - started
        // Taken while the page is still open.
        memory = sampler?.stop() ?? null
        return bytes
      })
      return { pdf, coldStartMs: opened.coldStartMs, renderMs, ...memory }
    } finally {
      if (sampler && !memory) sampler.stop()
    }
  })
}

/**
 * A menu document as an A4 PDF, with the template's own page margins, JavaScript off.
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function renderPdf(html) {
  return (await printJob(html, false)).pdf
}

/**
 * `renderPdf` with its measurements: `{ pdf, coldStartMs, renderMs, nodeRssMb, browserRssMb, peakTotalMb }`.
 * `coldStartMs` is the time the browser took to start for this call (0 when it was open).
 */
function renderPdfMeasured(html) {
  return printJob(html, true)
}

/** Runs inside every document of a photographed page: no door the request check cannot see, and no new window. */
function sealPage() {
  const closed = ['WebSocket', 'WebSocketStream', 'WebTransport', 'RTCPeerConnection', 'webkitRTCPeerConnection', 'Worker', 'SharedWorker']
  for (const name of closed) Object.defineProperty(globalThis, name, { value: undefined })
  Object.defineProperty(globalThis, 'open', { value: () => null })
  if (globalThis.Navigator) Object.defineProperty(globalThis.Navigator.prototype, 'serviceWorker', { get: () => undefined })
}

async function capturePage(context, url, width) {
  const page = await context.newPage()
  page.setDefaultTimeout(SCREENSHOT_TIMEOUT_MS)
  page.on('popup', popup => { popup?.close().catch(() => {}) })
  page.on('dialog', dialog => { dialog.dismiss().catch(() => {}) })
  await page.evaluateOnNewDocument(sealPage)
  await page.setBypassServiceWorker(true)
  await page.setViewport({ width, height: VIEWPORT_HEIGHT })
  await page.setRequestInterception(true)
  page.on('request', request => {
    isAllowedScreenshotRequest(request.url()).then(allowed => settle(request, allowed))
  })
  await page.goto(url, { waitUntil: 'networkidle2', timeout: SCREENSHOT_TIMEOUT_MS })
  const png = Buffer.from(await page.screenshot({ type: 'png' }))
  if (png.length >= MAX_PNG_BYTES) throw menuPdfError('SCREENSHOT_TOO_LARGE')
  return png
}

/**
 * A PNG of a public https page, `width` (320 to 1920, default 1280) by 1600.
 * @param {string} url
 * @param {{ width?: number }} [options]
 * @returns {Promise<Buffer>}
 */
async function screenshotUrl(url, { width = DEFAULT_WIDTH } = {}) {
  if (!(await isPublicWebUrl(url))) throw menuPdfError('URL_REFUSED')
  const wanted = Math.round(Number(width)) || DEFAULT_WIDTH
  const clamped = Math.min(Math.max(wanted, MIN_WIDTH), MAX_WIDTH)
  return browsers.inTurn(async () => {
    const { browser } = await browsers.openBrowser()
    const job = { options: { downloadBehavior: { policy: 'deny' } }, timeoutMs: SCREENSHOT_TIMEOUT_MS, failure: 'SCREENSHOT_FAILED' }
    return inContext(browser, job, context => capturePage(context, url, clamped))
  })
}

module.exports = {
  renderPdf,
  renderPdfMeasured,
  screenshotUrl,
  embedFonts,
  isMenuPdfError,
  closeBrowser: browsers.closeBrowser,
  setBrowserLauncherForTests: browsers.setBrowserLauncherForTests,
  resetForTests: browsers.resetForTests,
}
