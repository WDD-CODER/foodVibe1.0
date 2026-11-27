'use strict'
/**
 * Plan 767: the coded errors of the menu render service. A code is all an error carries to the caller and the log:
 * the browser's own messages can hold the page's address, so they never leave the service.
 */

const STATUS_OF = {
  PDF_BUSY: 503,
  PDF_UNAVAILABLE: 503,
  PDF_FAILED: 500,
  URL_REFUSED: 400,
  SCREENSHOT_FAILED: 502,
  SCREENSHOT_TOO_LARGE: 413,
}

/**
 * @param {keyof typeof STATUS_OF} code
 * @param {string} [reason] the error class that caused it (for example `TimeoutError`), never a message
 */
function menuPdfError(code, reason) {
  const err = new Error(code)
  err.code = code
  err.status = STATUS_OF[code]
  if (reason) err.reason = reason
  return err
}

/** True when `err` is one of the service's own coded errors. */
function isMenuPdfError(err) {
  return Object.prototype.hasOwnProperty.call(STATUS_OF, err?.code)
}

module.exports = { menuPdfError, isMenuPdfError }
