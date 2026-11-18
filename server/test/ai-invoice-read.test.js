'use strict';
/**
 * Plan 626 — POST /api/v1/ai/invoices/read. The model is faked by stubbing global fetch (as in ai-receipt-photo.test.js)
 * and the file store by the in-memory fake of plan 619. This proves the plumbing and the cleaning, not the real model.
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
process.env.INVOICE_READ_LIMIT_MAX = '3';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { resetForTests, getUsageCount } = require('../services/gemini-client');
const { setFileStoreForTests, createMemoryFileStore } = require('../services/file-store');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { supplierBody, stored } = require('./helpers/v2-docs');
const { captureLogs } = require('./helpers/log-capture');

let app;
let fetchMock;
let logs;

beforeAll(async () => {
  app = await buildTestApp();
  logs = captureLogs();
}, 60000);

afterAll(async () => {
  setFileStoreForTests(null);
  await teardownTestApp();
});

beforeEach(async () => {
  resetForTests();
  setFileStoreForTests(null);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const db = testDb();
  for (const name of ['suppliers', 'products', 'invoices', 'priceHistory', 'aiDrafts', 'storedFiles', 'aiUsage']) {
    await db.collection(name).deleteMany({});
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = (text) => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] });
const reply = (header, rows = []) => modelAnswer(JSON.stringify({ header, rows }));

let userSeq = 0;
const ownerToken = () => signTestToken({ userId: `invOwner${++userSeq}`, name: 'owner', businessId: 'b626', businessRole: 'owner' });
const staffToken = () => signTestToken({ userId: `invStaff${++userSeq}`, name: 'staff', businessId: 'b626', businessRole: 'staff' });
const post = (body, token = ownerToken()) =>
  request(app).post('/api/v1/ai/invoices/read').set('Authorization', `Bearer ${token}`).send(body);
const file = (extra = {}) => ({ fileBase64: 'aGVsbG8=', mimeType: 'image/jpeg', ...extra });
const col = name => testDb().collection(name);
const addSupplier = (id, overrides) => col('suppliers').insertOne(stored(supplierBody(overrides), { _id: id, userId: 'seed', businessId: 'b626' }));

describe('supplier suggestion', () => {
  const header = { supplierName: 'Supplier A', supplierTaxId: '514236987', supplierPhone: '052-1234567' };

  it('matches by tax id, then phone, then name; the key comes from what is printed', async () => {
    await addSupplier('supA', { nameHebrew: 'Supplier A', phone: '0529999999' });
    await addSupplier('supB', { nameHebrew: 'Supplier B', taxId: '514236987', phone: '0501111111' });
    fetchMock.mockResolvedValueOnce(reply(header));
    const byTax = await post(file());
    expect(byTax.status).toBe(200);
    expect(byTax.body.supplier).toEqual({ supplierId: 'supB', matchedBy: 'taxId', supplierKey: 'tax:514236987' });

    await col('suppliers').deleteMany({});
    await addSupplier('supA', { nameHebrew: 'Supplier A', phone: '0529999999' });
    await addSupplier('supB', { nameHebrew: 'Supplier B', phone: '052-1234567' });
    fetchMock.mockResolvedValueOnce(reply({ ...header, supplierTaxId: null }));
    const byPhone = await post(file());
    expect(byPhone.body.supplier).toEqual({ supplierId: 'supB', matchedBy: 'phone', supplierKey: 'phone:521234567' });

    fetchMock.mockResolvedValueOnce(reply({ supplierName: 'Supplier A' }));
    const byName = await post(file());
    expect(byName.body.supplier).toEqual({ supplierId: 'supA', matchedBy: 'name', supplierKey: 'name:supplier a' });
  });
});

describe('file types and size', () => {
  it('accepts a PDF and sends one inlineData part with that mime type', async () => {
    fetchMock.mockResolvedValueOnce(reply({}));
    const res = await post(file({ mimeType: 'application/pdf' }));
    expect(res.status).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const parts = sent.contents[0].parts.filter(p => p.inlineData);
    expect(parts).toHaveLength(1);
    expect(parts[0].inlineData.mimeType).toBe('application/pdf');
  });

  it('image/gif answers 400 UNSUPPORTED_FILE_TYPE and no model call is made', async () => {
    const res = await post(file({ mimeType: 'image/gif' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('UNSUPPORTED_FILE_TYPE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a file over the limit answers 400 FILE_TOO_LARGE', async () => {
    const res = await post(file({ fileBase64: 'A'.repeat(1_800_001) }));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'FILE_TOO_LARGE', max: 1_800_000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('another schema failure answers 400 INVALID_REQUEST', async () => {
    const res = await post({ mimeType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_REQUEST');
  });
});

describe('the file and the draft', () => {
  it('store not configured: fileId null and a draftId', async () => {
    fetchMock.mockResolvedValueOnce(reply({ supplierName: 'X' }));
    const res = await post(file());
    expect(res.status).toBe(200);
    expect(res.body.fileId).toBeNull();
    expect(typeof res.body.draftId).toBe('string');
  });

  it('fake store: a fileId, kept 30 days, saved on the draft with the model name', async () => {
    const store = createMemoryFileStore();
    setFileStoreForTests(store);
    fetchMock.mockResolvedValueOnce(reply({ supplierName: 'X' }));
    const res = await post(file());
    expect(res.status).toBe(200);
    expect(typeof res.body.fileId).toBe('string');
    expect(store.files.size).toBe(1);
    const stored1 = await col('storedFiles').findOne({ _id: res.body.fileId });
    expect(stored1.kind).toBe('invoice');
    expect(stored1.deleteAfter - stored1.createdAt).toBe(30 * 86_400_000);
    const draft = await col('aiDrafts').findOne({ _id: res.body.draftId });
    expect(draft.input.fileId).toBe(res.body.fileId);
    expect(draft.feature).toBe('invoice_read');
    const url = fetchMock.mock.calls[0][0];
    expect(typeof draft.model).toBe('string');
    expect(String(url)).toContain(draft.model);
  });
});

describe('a bad model answer', () => {
  it.each([['not json', 'this is not json'], ['rows not a list', JSON.stringify({ header: {}, rows: 'x' })]])(
    '%s -> 502 invalid_draft, rejected usage, nothing stored', async (_name, text) => {
      const store = createMemoryFileStore();
      setFileStoreForTests(store);
      fetchMock.mockResolvedValueOnce(modelAnswer(text));
      const res = await post(file());
      expect(res.status).toBe(502);
      expect(res.body).toMatchObject({ error: 'INVOICE_READ_INVALID', code: 'invalid_draft' });
      await _waitForUsageWritesForTests();
      const usage = await col('aiUsage').find({ feature: 'invoice_read' }).toArray();
      expect(usage.length).toBeGreaterThan(0);
      expect(usage.every(u => u.outcome === 'rejected' && u.rejectCode === 'invalid_draft')).toBe(true);
      expect(store.files.size).toBe(0);
      expect(await col('aiDrafts').countDocuments()).toBe(0);
    });

  it('an empty answer returns an empty result and stores nothing', async () => {
    setFileStoreForTests(createMemoryFileStore());
    fetchMock.mockResolvedValueOnce(modelAnswer(''));
    const res = await post(file());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ header: {}, supplier: { supplierKey: '' }, rows: [], printed: [], truncated: false, draftId: null, fileId: null });
    expect(await col('aiDrafts').countDocuments()).toBe(0);
  });
});

describe('cleaning', () => {
  it('drops an 8-digit tax id and bad dates; keeps good dates', async () => {
    fetchMock.mockResolvedValueOnce(reply({ supplierTaxId: '51423698', invoiceDate: '31/02/2026' }));
    const bad = await post(file());
    expect(bad.body.header).toEqual({});
    fetchMock.mockResolvedValueOnce(reply({ invoiceDate: '03/11/2026' }));
    expect((await post(file())).body.header.invoiceDate).toBe('2026-11-03');
    fetchMock.mockResolvedValueOnce(reply({ invoiceDate: '3.11.26' }));
    expect((await post(file())).body.header.invoiceDate).toBe('2026-11-03');
  });

  it('quantity 3, unit price 5, total 20 -> price 6.6667 flagged for review; printed keeps the numbers as read', async () => {
    fetchMock.mockResolvedValueOnce(reply({}, [{ name: 'tomato', quantity: 3, unit: 'kg', unitPrice: 5, lineTotal: 20 }]));
    const res = await post(file());
    expect(res.body.rows[0]).toEqual(expect.objectContaining({ price: 6.6667, needsReview: true }));
    expect(res.body.printed).toEqual([{ name: 'tomato', quantity: 3, unit: 'kg', unitPrice: 5, lineTotal: 20 }]);
  });
});

describe('permission, limiter and prompt', () => {
  it('a staff token answers 403 before the model and the usage count does not move', async () => {
    const before = await getUsageCount();
    const res = await post(file(), staffToken());
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getUsageCount()).toBe(before);
  });

  it('no token answers 401', async () => {
    const res = await request(app).post('/api/v1/ai/invoices/read').send(file());
    expect(res.status).toBe(401);
  });

  it('with INVOICE_READ_LIMIT_MAX=3 the fourth read of one user answers 429', async () => {
    const token = ownerToken();
    for (let i = 0; i < 3; i += 1) {
      fetchMock.mockResolvedValueOnce(reply({}));
      expect((await post(file(), token)).status).toBe(200);
    }
    const fourth = await post(file(), token);
    expect(fourth.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('the system instruction is the fixed prompt; category names are in the user part', async () => {
    fetchMock.mockResolvedValueOnce(reply({}));
    await post(file({ knownCategories: ['SecretCategoryName'] }));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const system = sent.system_instruction.parts[0].text;
    expect(system).toContain('You read one supplier invoice');
    expect(system).not.toContain('SecretCategoryName');
    expect(sent.contents[0].role).toBe('user');
    expect(sent.contents[0].parts[0].text).toContain('SecretCategoryName');
  });
});

describe('logs and writes', () => {
  it('no log record holds the supplier name, a product name, a price, the tax id or the file content', async () => {
    setFileStoreForTests(createMemoryFileStore());
    const content = 'U0VDUkVUQ09OVEVOVA==';
    fetchMock.mockResolvedValueOnce(reply(
      { supplierName: 'SecretSupplierName', supplierTaxId: '514236987', invoiceNumber: 'INV-SECRET-9' },
      [{ name: 'SecretProductName', quantity: 2, unit: 'kg', unitPrice: 7.77, lineTotal: 15.54 }],
    ));
    const start = logs.records.length;
    expect((await post(file({ fileBase64: content }))).status).toBe(200);
    const text = JSON.stringify(logs.records.slice(start));
    for (const secret of ['SecretSupplierName', 'SecretProductName', '7.77', '15.54', '514236987', 'INV-SECRET-9', content]) {
      expect(text).not.toContain(secret);
    }
    expect(logs.byEvent('ai.invoice_read.done').length).toBeGreaterThan(0);
  });

  it('products, suppliers, invoices and priceHistory are unchanged by a read', async () => {
    await addSupplier('supA', { nameHebrew: 'Supplier A' });
    const snapshot = async () => JSON.stringify(await Promise.all(['products', 'suppliers', 'invoices', 'priceHistory']
      .map(name => col(name).find({}).sort({ _id: 1 }).toArray())));
    const before = await snapshot();
    fetchMock.mockResolvedValueOnce(reply({ supplierName: 'Supplier A', supplierTaxId: '514236987' },
      [{ name: 'tomato', quantity: 1, unitPrice: 5, lineTotal: 5 }]));
    expect((await post(file())).status).toBe(200);
    expect(await snapshot()).toBe(before);
  });
});
