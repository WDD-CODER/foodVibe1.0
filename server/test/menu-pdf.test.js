'use strict'
/** Plan 767 (C-PDF): the render service with the browser faked — nothing is launched and no network is used. */

const dns = require('node:dns')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { captureLogs } = require('./helpers/log-capture')
const menuPdf = require('../services/menu-pdf')
const { buildLaunchOptions } = require('../services/menu-pdf/browser')
const { isPublicAddress } = require('../services/menu-pdf/guard')
const { treeRssMb } = require('../services/menu-pdf/memory')

const PDF = Buffer.from('%PDF-1.4 fake')
const PNG = Buffer.from('fake png')
const tick = () => new Promise(resolve => setImmediate(resolve))

let logs

beforeAll(() => {
  logs = captureLogs()
})

afterEach(async () => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  await menuPdf.resetForTests()
  menuPdf.setBrowserLauncherForTests()
})

/** A browser that records what the service asks of it. `hooks` replace single page actions. */
function fakeBrowser(hooks = {}) {
  const seen = { pages: [], contexts: [], closed: 0 }
  const browser = {
    seen,
    on: vi.fn(),
    process: () => ({ pid: 4242, kill: vi.fn() }),
    close: vi.fn(async () => { seen.closed += 1 }),
    createBrowserContext: vi.fn(async options => {
      const context = {
        options,
        closed: false,
        close: async () => { context.closed = true },
        newPage: async () => {
          const listeners = {}
          const page = {
            listeners,
            on: (name, listener) => { listeners[name] = listener },
            setDefaultTimeout: vi.fn(),
            setJavaScriptEnabled: vi.fn(async () => {}),
            setRequestInterception: vi.fn(async () => {}),
            setBypassServiceWorker: vi.fn(async () => {}),
            evaluateOnNewDocument: vi.fn(async () => {}),
            setViewport: vi.fn(async () => {}),
            setContent: vi.fn(hooks.setContent ?? (async () => {})),
            pdf: vi.fn(async () => new Uint8Array(PDF)),
            goto: vi.fn(hooks.goto ?? (async () => {})),
            screenshot: vi.fn(hooks.screenshot ?? (async () => new Uint8Array(PNG))),
          }
          seen.pages.push(page)
          return page
        },
      }
      seen.contexts.push(context)
      return context
    }),
  }
  return browser
}

function useBrowser(hooks) {
  const browser = fakeBrowser(hooks)
  const launcher = vi.fn(async () => browser)
  menuPdf.setBrowserLauncherForTests(launcher)
  return { browser, launcher }
}

/** Sends one request through a page's interception and answers what the service did with it. */
async function ask(page, url) {
  let answer = null
  page.listeners.request({
    url: () => url,
    continue: async () => { answer = 'continue' },
    abort: async () => { answer = 'abort' },
  })
  for (let turn = 0; turn < 5 && answer === null; turn += 1) await tick()
  return answer
}

function resolveTo(...addresses) {
  return vi.spyOn(dns.promises, 'lookup').mockImplementation(async () => addresses.map(address => ({ address, family: address.includes(':') ? 6 : 4 })))
}

describe('renderPdf', () => {
  it('prints A4 with the page margins of the template, JavaScript off, waiting for a quiet network', async () => {
    const { browser } = useBrowser()
    const bytes = await menuPdf.renderPdf('<html><head></head><body>menu</body></html>')
    expect(Buffer.isBuffer(bytes)).toBe(true)
    expect(bytes.equals(PDF)).toBe(true)
    const [page] = browser.seen.pages
    expect(page.setDefaultTimeout).toHaveBeenCalledWith(20000)
    expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false)
    expect(page.setRequestInterception).toHaveBeenCalledWith(true)
    expect(page.setContent).toHaveBeenCalledWith('<html><head></head><body>menu</body></html>', { waitUntil: 'networkidle0', timeout: 10000 })
    expect(page.pdf).toHaveBeenCalledWith(expect.objectContaining({ format: 'A4', preferCSSPageSize: true, printBackground: true }))
    expect(browser.seen.contexts[0].closed).toBe(true)
  })

  it('lets the menu load only data:, Google Fonts and Cloudinary', async () => {
    const { browser } = useBrowser()
    await menuPdf.renderPdf('<p></p>')
    const [page] = browser.seen.pages
    for (const url of [
      'data:font/woff2;base64,AAAA',
      'https://fonts.googleapis.com/css2?family=Heebo',
      'https://fonts.gstatic.com/s/heebo/v1/a.woff2',
      'https://res.cloudinary.com/demo/image/upload/logo.png',
    ]) expect(await ask(page, url), url).toBe('continue')
    for (const url of [
      'http://fonts.googleapis.com/css2',
      'https://fonts.googleapis.com:8443/css2',
      'https://res.cloudinary.com.evil.example/x.png',
      'https://evil.example/x.png',
      'https://api.cloudinary.com/v1_1/x',
      'file:///etc/passwd',
      'http://169.254.169.254/latest/meta-data',
      'http://localhost:3000/api/v1/health',
      'blob:https://evil.example/1',
      'not a url',
    ]) expect(await ask(page, url), url).toBe('abort')
  })

  it('answers the time and memory of a render, with a cold start only when the browser was closed', async () => {
    useBrowser()
    const first = await menuPdf.renderPdfMeasured('<p></p>')
    const second = await menuPdf.renderPdfMeasured('<p></p>')
    expect(first.pdf.equals(PDF)).toBe(true)
    expect(first.coldStartMs).toBeGreaterThanOrEqual(0)
    expect(second.coldStartMs).toBe(0)
    expect(second.renderMs).toBeGreaterThanOrEqual(0)
    expect(second.nodeRssMb).toBeGreaterThan(0)
    // The fake browser has no process in /proc.
    expect(second.browserRssMb).toBeNull()
    expect(second.peakTotalMb).toBeNull()
  })

  it('answers PDF_FAILED without the message of the browser, and works again afterwards', async () => {
    let fail = true
    useBrowser({ setContent: async () => { if (fail) throw new Error('net::ERR at https://secret.example/menu') } })
    const err = await menuPdf.renderPdf('<p></p>').catch(e => e)
    expect(err.code).toBe('PDF_FAILED')
    expect(err.message).toBe('PDF_FAILED')
    fail = false
    await expect(menuPdf.renderPdf('<p></p>')).resolves.toBeInstanceOf(Buffer)
  })

  it('gives up on a page that never answers after 20 seconds', async () => {
    vi.useFakeTimers()
    const { browser } = useBrowser({ setContent: () => new Promise(() => {}) })
    const outcome = menuPdf.renderPdf('<p></p>').catch(e => e)
    await vi.advanceTimersByTimeAsync(20000)
    const err = await outcome
    expect(err.code).toBe('PDF_FAILED')
    expect(err.reason).toBe('TimeoutError')
    expect(browser.seen.contexts[0].closed).toBe(true)
  })
})

describe('one browser, idle close and the queue', () => {
  it('keeps one browser and runs one job at a time', async () => {
    let active = 0
    let most = 0
    const { browser, launcher } = useBrowser({
      setContent: async () => {
        active += 1
        most = Math.max(most, active)
        await tick()
        active -= 1
      },
    })
    await Promise.all([menuPdf.renderPdf('a'), menuPdf.renderPdf('b'), menuPdf.renderPdf('c')])
    expect(launcher).toHaveBeenCalledTimes(1)
    expect(most).toBe(1)
    expect(browser.seen.pages).toHaveLength(3)
  })

  it('closes the browser after 60 seconds idle and launches again for the next job', async () => {
    vi.useFakeTimers()
    const { browser, launcher } = useBrowser()
    await menuPdf.renderPdf('a')
    await vi.advanceTimersByTimeAsync(59999)
    expect(browser.close).not.toHaveBeenCalled()
    // A job inside the minute starts the minute again.
    await menuPdf.renderPdf('b')
    await vi.advanceTimersByTimeAsync(59999)
    expect(browser.close).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(browser.close).toHaveBeenCalledTimes(1)
    await menuPdf.renderPdf('c')
    expect(launcher).toHaveBeenCalledTimes(2)
  })

  it('lets three jobs wait and refuses the next with PDF_BUSY', async () => {
    let release
    const gate = new Promise(resolve => { release = resolve })
    const { browser } = useBrowser({ setContent: () => gate })
    const accepted = [1, 2, 3, 4].map(n => menuPdf.renderPdf(`job ${n}`))
    const refused = await menuPdf.renderPdf('job 5').catch(e => e)
    expect(refused.code).toBe('PDF_BUSY')
    expect(refused.status).toBe(503)
    release()
    await expect(Promise.all(accepted)).resolves.toHaveLength(4)
    expect(browser.seen.pages).toHaveLength(4)
    await expect(menuPdf.renderPdf('job 6')).resolves.toBeInstanceOf(Buffer)
  })

  it('launches a new browser after the old one disconnected', async () => {
    const { browser, launcher } = useBrowser()
    await menuPdf.renderPdf('a')
    const [, onDisconnect] = browser.on.mock.calls.find(([name]) => name === 'disconnected')
    onDisconnect()
    await menuPdf.renderPdf('b')
    expect(launcher).toHaveBeenCalledTimes(2)
  })
})

describe('a browser that cannot start', () => {
  it('rejects with PDF_UNAVAILABLE and logs menu_pdf.launch_failed once, without HTML or address', async () => {
    const launcher = vi.fn(async () => { throw new Error('Failed to launch, see https://pptr.dev/troubleshooting\nstderr') })
    menuPdf.setBrowserLauncherForTests(launcher)
    for (const html of ['<p>secret menu</p>', '<p>secret menu</p>']) {
      const err = await menuPdf.renderPdf(html).catch(e => e)
      expect(err.code).toBe('PDF_UNAVAILABLE')
      expect(err.status).toBe(503)
    }
    expect(launcher).toHaveBeenCalledTimes(2)
    const records = logs.byEvent('menu_pdf.launch_failed')
    expect(records).toHaveLength(1)
    expect(JSON.stringify(records[0])).not.toMatch(/secret menu|https?:\/\//)
  })
})

describe('screenshotUrl', () => {
  it.each([
    'http://example.com/',
    'https://localhost/',
    'https://app.localhost/',
    'https://127.0.0.1/',
    'https://10.0.0.1/',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/',
    'https://[::ffff:127.0.0.1]/',
    'https://2130706433/',
    'https://100.64.0.1/',
    'https://224.0.0.1/',
    'https://example.com:8443/',
    'ftp://example.com/',
    'nonsense',
  ])('refuses %s without starting a browser', async url => {
    const { launcher } = useBrowser()
    resolveTo('93.184.216.34')
    const err = await menuPdf.screenshotUrl(url).catch(e => e)
    expect(err.code).toBe('URL_REFUSED')
    expect(err.status).toBe(400)
    expect(launcher).not.toHaveBeenCalled()
  })

  it('refuses a host when any of its addresses is private, and one that does not resolve', async () => {
    const { launcher } = useBrowser()
    resolveTo('93.184.216.34', '192.168.1.5')
    await expect(menuPdf.screenshotUrl('https://rebind.example/')).rejects.toMatchObject({ code: 'URL_REFUSED' })
    resolveTo('fd00::1')
    await expect(menuPdf.screenshotUrl('https://internal.example/')).rejects.toMatchObject({ code: 'URL_REFUSED' })
    vi.spyOn(dns.promises, 'lookup').mockRejectedValue(new Error('ENOTFOUND'))
    await expect(menuPdf.screenshotUrl('https://nowhere.example/')).rejects.toMatchObject({ code: 'URL_REFUSED' })
    expect(launcher).not.toHaveBeenCalled()
  })

  it('tells public addresses from the others', () => {
    for (const address of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111']) {
      expect(isPublicAddress(address), address).toBe(true)
    }
    for (const address of ['0.0.0.0', '172.16.0.1', '192.168.0.1', '255.255.255.255', '::', 'fe80::1', 'fc00::1', 'ff02::1', '64:ff9b::7f00:1', '2002:7f00:1::', 'text']) {
      expect(isPublicAddress(address), address).toBe(false)
    }
  })

  it('photographs a public page at the asked width, with downloads and pop-ups refused', async () => {
    const { browser } = useBrowser()
    resolveTo('93.184.216.34')
    const png = await menuPdf.screenshotUrl('https://example.com/', { width: 800 })
    expect(png.equals(PNG)).toBe(true)
    const [page] = browser.seen.pages
    expect(browser.seen.contexts[0].options).toEqual({ downloadBehavior: { policy: 'deny' } })
    expect(page.setViewport).toHaveBeenCalledWith({ width: 800, height: 1600 })
    expect(page.setBypassServiceWorker).toHaveBeenCalledWith(true)
    expect(page.evaluateOnNewDocument).toHaveBeenCalledTimes(1)
    expect(page.goto).toHaveBeenCalledWith('https://example.com/', { waitUntil: 'networkidle2', timeout: 15000 })
    const popup = { close: vi.fn(async () => {}) }
    page.listeners.popup(popup)
    expect(popup.close).toHaveBeenCalled()
  })

  it('uses 1280 as the width and keeps an asked width inside 320 to 1920', async () => {
    const { browser } = useBrowser()
    resolveTo('93.184.216.34')
    await menuPdf.screenshotUrl('https://example.com/')
    await menuPdf.screenshotUrl('https://example.com/', { width: 99999 })
    await menuPdf.screenshotUrl('https://example.com/', { width: 1 })
    expect(browser.seen.pages.map(page => page.setViewport.mock.calls[0][0].width)).toEqual([1280, 1920, 320])
  })

  it('checks every sub-request the same way', async () => {
    const { browser } = useBrowser()
    vi.spyOn(dns.promises, 'lookup').mockImplementation(async host => [{ address: host === 'inside.example' ? '10.1.2.3' : '93.184.216.34', family: 4 }])
    await menuPdf.screenshotUrl('https://example.com/')
    const [page] = browser.seen.pages
    for (const url of ['https://cdn.example/a.css', 'data:image/png;base64,AAAA', 'blob:https://example.com/1']) {
      expect(await ask(page, url), url).toBe('continue')
    }
    for (const url of ['http://example.com/a', 'https://inside.example/a', 'https://127.0.0.1/', 'https://[::1]/', 'file:///etc/passwd', 'wss://example.com/']) {
      expect(await ask(page, url), url).toBe('abort')
    }
  })

  it('refuses a picture of 5 MB or more', async () => {
    useBrowser({ screenshot: async () => new Uint8Array(5 * 1024 * 1024) })
    resolveTo('93.184.216.34')
    await expect(menuPdf.screenshotUrl('https://example.com/')).rejects.toMatchObject({ code: 'SCREENSHOT_TOO_LARGE' })
  })

  it('answers SCREENSHOT_FAILED without the address, and gives up after 15 seconds', async () => {
    useBrowser({ goto: async () => { throw new Error('net::ERR_ABORTED at https://example.com/secret') } })
    resolveTo('93.184.216.34')
    const failed = await menuPdf.screenshotUrl('https://example.com/secret').catch(e => e)
    expect(failed).toMatchObject({ code: 'SCREENSHOT_FAILED', message: 'SCREENSHOT_FAILED' })
    await menuPdf.resetForTests()
    vi.useFakeTimers()
    useBrowser({ goto: () => new Promise(() => {}) })
    const outcome = menuPdf.screenshotUrl('https://example.com/').catch(e => e)
    await vi.advanceTimersByTimeAsync(15000)
    expect(await outcome).toMatchObject({ code: 'SCREENSHOT_FAILED', reason: 'TimeoutError' })
  })
})

describe('the small host', () => {
  const smallChromium = () => ({
    args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-web-security', '--allow-running-insecure-content', '--headless=\'shell\''],
    executablePath: async () => '/tmp/chromium',
  })

  it('takes the small Chromium on Linux, without single-process or the flags that switch protection off', async () => {
    const chromium = smallChromium()
    const options = await buildLaunchOptions({ platform: 'linux', loadSmallChromium: async () => chromium })
    expect(options.executablePath).toBe('/tmp/chromium')
    expect(options.headless).toBe('shell')
    expect(chromium.setGraphicsMode).toBe(false)
    expect(options.args).toEqual(expect.arrayContaining(['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--disable-gpu']))
    for (const flag of ['--single-process', '--disable-web-security', '--allow-running-insecure-content']) {
      expect(options.args).not.toContain(flag)
    }
    expect(options).toMatchObject({ handleSIGINT: false, handleSIGTERM: false })
  })

  it('takes a local Chrome elsewhere, sandboxed, and the path of MENU_PDF_CHROME_PATH when set', async () => {
    const load = vi.fn()
    const local = await buildLaunchOptions({ platform: 'win32', loadSmallChromium: load })
    expect(local.channel).toBe('chrome')
    expect(local.args).not.toContain('--no-sandbox')
    const named = await buildLaunchOptions({ platform: 'linux', chromePath: '/opt/chrome', loadSmallChromium: load })
    expect(named.executablePath).toBe('/opt/chrome')
    expect(named.args).not.toContain('--no-sandbox')
    expect(load).not.toHaveBeenCalled()
  })

  it('adds up the memory of the browser and its children', () => {
    const proc = fs.mkdtempSync(path.join(os.tmpdir(), 'foodvibe-proc-'))
    for (const [pid, parent, kb] of [[10, 1, 102400], [11, 10, 51200], [12, 11, 1024], [20, 1, 999999]]) {
      fs.mkdirSync(path.join(proc, String(pid)))
      fs.writeFileSync(path.join(proc, String(pid), 'status'), `Name:\tx\nPPid:\t${parent}\nVmRSS:\t  ${kb} kB\n`)
    }
    expect(treeRssMb(10, proc)).toBe(151)
    expect(treeRssMb(99, proc)).toBeNull()
    expect(treeRssMb(10, path.join(proc, 'missing'))).toBeNull()
    fs.rmSync(proc, { recursive: true, force: true })
  })

  it('puts the two kept fonts into the document as data: rules', () => {
    const html = menuPdf.embedFonts('<html><head></head><body></body></html>')
    expect(html).toContain('font-family: "Heebo"')
    expect(html).toContain('font-family: "Frank Ruhl Libre"')
    expect(html.match(/url\(data:font\/woff2;base64,d09GMg/g)).toHaveLength(6)
    expect(html.indexOf('@font-face')).toBeLessThan(html.indexOf('</head>'))
  })
})
