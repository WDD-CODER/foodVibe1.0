'use strict'
// Plan 766 (C-AI): the menu designer's AI. POST /api/v1/ai/menu-design/variants (a picture, a link or a description
// -> three designs) and /refine (a design and a request in words -> the changed design). Nothing is stored but the
// usage row callGemini writes. Logs carry kinds, lengths and counts only: never the text, the address or the picture.
// ai.js requires this file before it sets its own module.exports, so respondFromGeminiFailure, usageOf, requestedModel
// and isSafeUrl are read with require('../ai') INSIDE a handler, never at the top of this file.
const { Router } = require('express')
const { verifyToken } = require('../../middleware/auth')
const { requireModule } = require('../../middleware/require-module')
const { createRateLimiter, userOrIpKey } = require('../../middleware/rate-limit')
const { badRequest } = require('../../middleware/validate')
const { callGemini, responseText } = require('../../services/gemini-client')
const { extractJsonPayload } = require('../../services/ai-recipe-helpers')
const menuPdf = require('../../services/menu-pdf')
const { menuDesignPrompt, cleanDesignVariant, cleanRefinedDesign } = require('../../utils/menu-design-ai')
const {
  menuDesignVariantsRequestSchema, menuDesignRefineRequestSchema,
  MENU_DESIGN_IMAGE_MAX_BASE64, MENU_DESIGN_IMAGE_MIME_TYPES,
} = require('../../generated/schemas/ai-menu-design.schema')

const VARIANTS = 3
const SCREENSHOT_WIDTH = 1280
const TIMEOUT_MS = 45000

const router = Router()

// Its own budget, shared by both routes; MENU_DESIGN_AI_LIMIT_MAX lets tests lower it.
const menuDesignLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.MENU_DESIGN_AI_LIMIT_MAX ?? 30),
  keyGenerator: userOrIpKey,
  message: 'Too many design requests, please try again later',
})

function configured(req, res, next) {
  if (process.env.GEMINI_API_KEY) return next()
  return res.status(503).json({ error: 'AI generation is not configured on this server' })
}

const gate = [verifyToken, requireModule('menu_design'), menuDesignLimiter, configured]

/** An https address that does not lead into a private network. */
async function isAllowedReferenceUrl(url) {
  return /^https:\/\//i.test(url) && require('../ai').isSafeUrl(url)
}

/** One model call, with the reference picture as an inline part when there is one. Answers the callGemini result. */
function askModel(req, { kind, text, image, temperature, feature }) {
  const ai = require('../ai')
  return callGemini({
    body: {
      system_instruction: { parts: [{ text: menuDesignPrompt(kind) }] },
      contents: [{ role: 'user', parts: [{ text }, ...(image ? [{ inlineData: image }] : [])] }],
      generationConfig: { temperature, maxOutputTokens: 8192 },
    },
    timeoutMs: TIMEOUT_MS,
    log: req.log,
    eventPrefix: `ai.${feature}`,
    needsMedia: image ? 'image' : undefined,
    model: ai.requestedModel(req),
    usage: { ...ai.usageOf(req), feature },
  })
}

router.post('/variants', ...gate, async (req, res) => {
  const reference = req.body?.reference
  if (reference?.kind === 'image') {
    if (typeof reference.mimeType === 'string' && !MENU_DESIGN_IMAGE_MIME_TYPES.includes(reference.mimeType)) {
      return badRequest(res, 'UNSUPPORTED_FILE_TYPE')
    }
    if (typeof reference.imageBase64 === 'string' && reference.imageBase64.length > MENU_DESIGN_IMAGE_MAX_BASE64) {
      return badRequest(res, 'IMAGE_TOO_LARGE', { max: MENU_DESIGN_IMAGE_MAX_BASE64 })
    }
  }
  const body = menuDesignVariantsRequestSchema.safeParse(req.body)
  if (!body.success) return badRequest(res, 'INVALID_REQUEST')
  const wanted = body.data.reference

  try {
    let text = 'Design three menu looks in the spirit of the attached picture.'
    let image = null
    if (wanted.kind === 'text') {
      text = `Design three menu looks from this description:\n${wanted.text}`
    } else if (wanted.kind === 'image') {
      image = { mimeType: wanted.mimeType, data: wanted.imageBase64 }
      if (wanted.note?.trim()) text += `\nThe chef's note about it:\n${wanted.note.trim()}`
    } else {
      if (!(await isAllowedReferenceUrl(wanted.url))) return badRequest(res, 'URL_NOT_ALLOWED')
      try {
        const png = await menuPdf.screenshotUrl(wanted.url, { width: SCREENSHOT_WIDTH })
        image = { mimeType: 'image/png', data: png.toString('base64') }
      } catch (err) {
        req.log.warn({
          event: 'ai.menu_design_variants.capture_failed',
          code: menuPdf.isMenuPdfError(err) ? err.code : 'unknown',
        })
        return res.status(502).json({ error: 'URL_CAPTURE_FAILED' })
      }
    }

    const call = await askModel(req, {
      kind: wanted.kind, text, image, temperature: 0.8, feature: 'menu_design_variants',
    })
    if (call.kind !== 'ok') return require('../ai').respondFromGeminiFailure(res, call)

    const raw = responseText(call.data)
    const answered = extractJsonPayload(raw).value?.variants
    const list = Array.isArray(answered) ? answered : []
    const variants = Array.from({ length: VARIANTS }, (_, i) => cleanDesignVariant(list[i], i))
    const fallbacks = variants.filter(variant => variant.fallback).length
    req.log[fallbacks ? 'warn' : 'info']({
      event: 'ai.menu_design_variants.done', kind: wanted.kind, rawLength: raw.length, fallbacks,
    })
    return res.json({ variants })
  } catch (err) {
    req.log.error({ err, event: 'ai.menu_design_variants.failed' })
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/refine', ...gate, async (req, res) => {
  const body = menuDesignRefineRequestSchema.safeParse(req.body)
  if (!body.success) return badRequest(res, 'INVALID_REQUEST')
  const { design, request } = body.data

  try {
    const call = await askModel(req, {
      kind: 'refine',
      text: `CURRENT DESIGN:\n${JSON.stringify(design)}\n\nREQUEST:\n${request}`,
      image: null,
      temperature: 0.3,
      feature: 'menu_design_refine',
    })
    if (call.kind !== 'ok') return require('../ai').respondFromGeminiFailure(res, call)

    const raw = responseText(call.data)
    const refined = cleanRefinedDesign(extractJsonPayload(raw).value, design)
    req.log[refined.fallback ? 'warn' : 'info']({
      event: 'ai.menu_design_refine.done',
      requestLength: request.length,
      rawLength: raw.length,
      fallback: refined.fallback,
    })
    return res.json(refined)
  } catch (err) {
    req.log.error({ err, event: 'ai.menu_design_refine.failed' })
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
