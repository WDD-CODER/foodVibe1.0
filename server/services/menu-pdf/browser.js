'use strict'
/**
 * Plan 767: the one headless browser of the server. It is the only place the adopted browser packages are imported,
 * and both are loaded on first use, so requiring this file starts nothing. One job at a time (the host has 512 MB):
 * at most three more wait, the next one is refused; an unused browser closes after a minute.
 */
const { logger } = require('../../logger')
const { menuPdfError } = require('./errors')

const IDLE_CLOSE_MS = 60 * 1000
const MAX_WAITING = 3
// The first launch after a sleep also unpacks the browser into /tmp, on a tenth of a shared CPU.
const LAUNCH_TIMEOUT_MS = 60 * 1000
const CLOSE_TIMEOUT_MS = 5000

const SMALL_HOST_FLAGS = ['--disable-dev-shm-usage', '--disable-gpu', '--block-new-web-contents']
// `--single-process` is unstable; the other two switch off the browser's own protection against a hostile page.
const REFUSED_FLAGS = ['--single-process', '--disable-web-security', '--allow-running-insecure-content']

/**
 * The launch options of one host. On Linux the browser is the small `@sparticuz/chromium` build, with its flags
 * (`--no-sandbox` comes from there only). Elsewhere, and whenever MENU_PDF_CHROME_PATH is set, it is a local Chrome.
 */
async function buildLaunchOptions({ platform, chromePath, loadSmallChromium }) {
  const options = {
    headless: true,
    timeout: LAUNCH_TIMEOUT_MS,
    // The server handles its own shutdown (server/index.js); the browser dies with the process.
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    ignoreDefaultArgs: ['--disable-popup-blocking'],
    args: [...SMALL_HOST_FLAGS],
  }
  if (chromePath) return { ...options, executablePath: chromePath }
  if (platform !== 'linux') return { ...options, channel: 'chrome' }
  const chromium = await loadSmallChromium()
  chromium.setGraphicsMode = false
  const own = chromium.args.filter(flag => !REFUSED_FLAGS.includes(flag.split('=')[0]))
  return {
    ...options,
    headless: 'shell',
    executablePath: await chromium.executablePath(),
    args: [...new Set([...own, ...SMALL_HOST_FLAGS, '--no-zygote'])],
  }
}

async function launchChromium() {
  const { default: puppeteer } = await import('puppeteer-core')
  const options = await buildLaunchOptions({
    platform: process.platform,
    chromePath: process.env.MENU_PDF_CHROME_PATH,
    loadSmallChromium: async () => (await import('@sparticuz/chromium')).default,
  })
  return puppeteer.launch(options)
}

let launcher = launchChromium
let browser = null
let closing = null
let idleTimer = null
let inLine = 0
let tail = Promise.resolve()
let launchFailureLogged = false

/** Settles with `promise`, or rejects with a `TimeoutError` after `ms`. */
function withDeadline(promise, ms) {
  let timer
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error('deadline passed')
      err.name = 'TimeoutError'
      reject(err)
    }, ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

/** Closes the browser when one is open; a browser that does not close in time is killed. */
function closeBrowser() {
  clearTimeout(idleTimer)
  const current = browser
  browser = null
  if (!current) return closing ?? Promise.resolve()
  closing = withDeadline(current.close(), CLOSE_TIMEOUT_MS)
    .catch(err => {
      current.process?.()?.kill('SIGKILL')
      logger.warn({ event: 'menu_pdf.close_failed', name: err?.name })
    })
    .finally(() => { closing = null })
  return closing
}

/** The open browser, launched now when there is none. `coldStartMs` is 0 for a browser that was already open. */
async function openBrowser() {
  if (closing) await closing
  if (browser) return { browser, coldStartMs: 0 }
  const started = Date.now()
  try {
    const launched = await launcher()
    launched.on('disconnected', () => { if (browser === launched) browser = null })
    browser = launched
    launchFailureLogged = false
    return { browser: launched, coldStartMs: Date.now() - started }
  } catch (err) {
    if (!launchFailureLogged) {
      launchFailureLogged = true
      const reason = String(err?.message ?? '').split('\n')[0].replace(/\bhttps?:\/\/\S+/g, '').slice(0, 200)
      logger.error({ event: 'menu_pdf.launch_failed', name: err?.name, reason }, 'headless browser did not start')
    }
    throw menuPdfError('PDF_UNAVAILABLE')
  }
}

/** Runs `job` when its turn comes. Rejects with PDF_BUSY when one job runs and three already wait. */
function inTurn(job) {
  if (inLine > MAX_WAITING) return Promise.reject(menuPdfError('PDF_BUSY'))
  inLine += 1
  clearTimeout(idleTimer)
  const run = tail.then(async () => {
    try {
      return await job()
    } finally {
      inLine -= 1
      if (inLine === 0 && browser) {
        idleTimer = setTimeout(closeBrowser, IDLE_CLOSE_MS)
        idleTimer.unref?.()
      }
    }
  })
  tail = run.catch(() => {})
  return run
}

/** Replaces the browser launcher in tests; called without a value it puts the real one back. */
function setBrowserLauncherForTests(fake) {
  launcher = fake ?? launchChromium
}

/** For tests: close the browser, empty the line and forget a logged launch failure. */
async function resetForTests() {
  await closeBrowser()
  inLine = 0
  tail = Promise.resolve()
  launchFailureLogged = false
}

module.exports = {
  buildLaunchOptions, closeBrowser, inTurn, openBrowser, resetForTests, setBrowserLauncherForTests, withDeadline,
}
