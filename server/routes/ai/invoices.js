'use strict';
// Plan 626 (C-INVREAD): POST /api/v1/ai/invoices/read — one invoice image or PDF -> header, supplier suggestion, checked rows.
// ai.js requires this file before it sets its own module.exports, so respondFromGeminiFailure, usageOf, requestedModel
// and appendKnownMetadata are read with require('../ai') INSIDE the handler, never at the top of this file.
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../../middleware/auth');
const { createRateLimiter, userOrIpKey } = require('../../middleware/rate-limit');
const { badRequest } = require('../../middleware/validate');
const { assertCan } = require('../../utils/permissions');
const { scopeFilter } = require('../../utils/business-scope');
const { LIVE } = require('../../jobs/purge-deleted');
const { callGemini, responseText } = require('../../services/gemini-client');
const { extractJsonPayload } = require('../../services/ai-recipe-helpers');
const { putPrivateFile } = require('../../services/file-store');
const { saveAiDraft } = require('../../services/ai-drafts');
const { normalizeReceiptRows } =require('../../utils/price-list-import');
const { supplierKey } = require('../../utils/supplier-key');
const {
  INVOICE_READ_SYSTEM_PROMPT, cleanInvoiceHeader, cleanPrintedLines, suggestSupplier,
} = require('../../utils/invoice-read');
const {
  invoiceReadRequestSchema, invoiceReadModelSchema, INVOICE_FILE_MAX_BASE64, INVOICE_FILE_MIME_TYPES,
} = require('../../generated/schemas/ai-invoice-read.schema');

const router = Router();

// Its own budget (a consultant's batch must not eat the other AI tools'); INVOICE_READ_LIMIT_MAX lets tests lower it.
const invoiceReadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.INVOICE_READ_LIMIT_MAX ?? 60),
  keyGenerator: userOrIpKey,
  message: 'Too many invoice reads, please try again later',
});

router.post('/read', verifyToken, (req, res, next) => {
  if (assertCan(req, res, 'editMoney', { type: 'products' })) next();
}, invoiceReadLimiter, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }
  if (typeof req.body?.mimeType === 'string' && !INVOICE_FILE_MIME_TYPES.includes(req.body.mimeType)) {
    return badRequest(res, 'UNSUPPORTED_FILE_TYPE');
  }
  if (typeof req.body?.fileBase64 === 'string' && req.body.fileBase64.length > INVOICE_FILE_MAX_BASE64) {
    return badRequest(res, 'FILE_TOO_LARGE', { max: INVOICE_FILE_MAX_BASE64 });
  }
  const body = invoiceReadRequestSchema.safeParse(req.body);
  if (!body.success) return badRequest(res, 'INVALID_REQUEST');
  const { fileBase64, mimeType, knownCategories } = body.data;

  try {
    const ai = require('../ai');
    const call = await callGemini({
      body: {
        system_instruction: { parts: [{ text: INVOICE_READ_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [
          { text: ai.appendKnownMetadata('Read this document.', { knownCategories }) },
          { inlineData: { mimeType, data: fileBase64 } },
        ] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      },
      timeoutMs: 45000,
      log: req.log,
      eventPrefix: 'ai.invoice_read',
      needsMedia: mimeType === 'application/pdf' ? 'pdf' : 'image',
      model: ai.requestedModel(req),
      usage: { ...ai.usageOf(req), feature: 'invoice_read' },
    });
    if (call.kind !== 'ok') return ai.respondFromGeminiFailure(res, call);

    const raw = responseText(call.data);
    const extracted = extractJsonPayload(raw);
    if (extracted.error === 'empty') {
      return res.status(200).json({
        header: {}, supplier: { supplierKey: '' }, rows: [], printed: [], truncated: false, draftId: null, fileId: null,
      });
    }
    const parsed = extracted.error ? null : invoiceReadModelSchema.safeParse(extracted.value);
    if (!parsed || !parsed.success) {
      // Length only: the text holds the business's purchases.
      req.log.error({ event: 'ai.invoice_read.rejected', rawLength: raw.length });
      return res.status(502).json({ error: 'INVOICE_READ_INVALID', code: 'invalid_draft' });
    }

    const header = cleanInvoiceHeader(parsed.data.header);
    const printed = cleanPrintedLines(parsed.data.rows);
    // rows and printed are not index-aligned (nameless lines dropped, repeated names merged): a row belongs to the
    // last printed line with the same normalised name; the client (628) links them, the one line check stays here.
    const { rows, truncated } = normalizeReceiptRows({ rows: parsed.data.rows });

    const suppliers = await mongoose.connection.db.collection('suppliers')
      .find({ ...scopeFilter(req), ...LIVE }, { projection: { nameHebrew: 1, phone: 1, phone2: 1, taxId: 1 } })
      .toArray();
    const supplier = {
      ...suggestSupplier(header, suppliers),
      supplierKey: supplierKey({ taxId: header.supplierTaxId, phone: header.supplierPhone, name: header.supplierName }),
    };

    const fileId = await putPrivateFile(req, {
      kind: 'invoice', mimeType, buffer: Buffer.from(fileBase64, 'base64'), deleteAfterDays: 30,
    });
    const draftId = await saveAiDraft(req, {
      feature: 'invoice_read',
      subject: { type: 'invoice' },
      input: fileId ? { fileId } : {},
      aiDraft: { header, rows, printed },
      model: call.model,
    });

    req.log.info({
      event: 'ai.invoice_read.done', mimeType, base64Length: fileBase64.length, rows: rows.length, printed: printed.length,
      truncated, hasFile: fileId !== null, hasDraft: draftId !== null, matchedBy: supplier.matchedBy ?? null,
    });
    return res.json({ header, supplier, rows, printed, truncated, draftId: draftId ?? null, fileId: fileId ?? null });
  } catch (err) {
    req.log.error({ err, event: 'ai.invoice_read.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
