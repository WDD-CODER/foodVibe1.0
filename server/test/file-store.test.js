'use strict';
/** Plan 619 (C-FILES): the private file store — pure request builders against the provider's published examples, the service on the in-memory store. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { signParams, uploadRequest, downloadUrl, destroyRequest, resourceTypeOf } = require('../services/cloudinary-requests');
const { putPrivateFile, keepStoredFile, signedFileUrl, deleteStoredFile, readUploadedFile, isFileStoreConfigured, setFileStoreForTests, createMemoryFileStore, createCloudinaryStore } = require('../services/file-store');

beforeAll(async () => { await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const DAY = 86_400_000;
const CONFIG = { cloudName: 'demo', apiKey: 'k', apiSecret: 'abcd' };
const fakeReq = (businessId = 'b1') => ({ user: { userId: 'u1', name: 'n', businessId }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
const BUF = Buffer.from('hello');
const clearKeys = () => { for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete process.env[k]; };

describe('cloudinary-requests', () => {
  it('signParams reproduces the two documented examples', () => {
    expect(signParams({ timestamp: 1315060510 }, 'abcd')).toBe('a21ad0f63beb4de2e5575204b79ab90bffb02c10');
    expect(signParams({ timestamp: 1315060510, eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image' }, 'abcd'))
      .toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
  it('signParams leaves out file, api_key and empty values', () => {
    expect(signParams({ timestamp: 1315060510, file: 'x', api_key: 'k', resource_type: 'r', cloud_name: 'c', a: '', b: null, c: undefined }, 'abcd'))
      .toBe('a21ad0f63beb4de2e5575204b79ab90bffb02c10');
  });
  it('upload goes to video for a voice file and image for an invoice file, type authenticated, no secret', () => {
    const v = uploadRequest(CONFIG, { publicId: 'p', mimeType: 'audio/webm', buffer: BUF, timestamp: 5 });
    const i = uploadRequest(CONFIG, { publicId: 'p', mimeType: 'application/pdf', buffer: BUF, timestamp: 5 });
    expect(v.url).toBe('https://api.cloudinary.com/v1_1/demo/video/upload');
    expect(i.url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    expect(v.fields.type).toBe('authenticated');
    expect(JSON.stringify(v)).not.toContain('abcd');
    expect(v.fields.file).toBe('data:audio/webm;base64,' + BUF.toString('base64'));
    expect(v.fields.signature).toBe(signParams({ public_id: 'p', timestamp: 5, type: 'authenticated' }, 'abcd'));
    expect(resourceTypeOf('image/png')).toBe('image');
  });
  it('the download link carries expires_at and type authenticated, and no secret', () => {
    const url = downloadUrl(CONFIG, { publicId: 'fv/b1/voice/x', resourceType: 'video', format: 'webm', expiresAt: 1700000300, timestamp: 1700000000 });
    expect(url.startsWith('https://api.cloudinary.com/v1_1/demo/video/download?')).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get('expires_at')).toBe('1700000300');
    expect(q.get('type')).toBe('authenticated');
    expect(q.get('public_id')).toBe('fv/b1/voice/x');
    expect(q.get('signature')).toBe(signParams({ expires_at: 1700000300, format: 'webm', public_id: 'fv/b1/voice/x', timestamp: 1700000000, type: 'authenticated' }, 'abcd'));
    expect(url).not.toContain('abcd');
  });
  it('destroy request', () => {
    const d = destroyRequest(CONFIG, { publicId: 'p', resourceType: 'image', timestamp: 7 });
    expect(d.url).toBe('https://api.cloudinary.com/v1_1/demo/image/destroy');
    expect(d.fields.type).toBe('authenticated');
    expect(JSON.stringify(d)).not.toContain('abcd');
  });
});

describe('the real store over a stubbed fetch', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uploads multipart, reads the answer, destroys; an error carries the status only', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ public_id: 'fv/x', resource_type: 'video', format: 'webm' }) });
    vi.stubGlobal('fetch', fetchMock);
    const store = createCloudinaryStore(CONFIG);
    const up = await store.upload({ publicId: 'fv/x', mimeType: 'audio/webm', buffer: BUF });
    expect(up).toEqual({ providerId: 'fv/x', resourceType: 'video', format: 'webm' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/video/upload');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('type')).toBe('authenticated');
    expect(String(url) + [...init.body.values()].join('')).not.toContain('abcd');
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: 'not found' }) });
    expect(await store.destroy({ providerId: 'fv/x', resourceType: 'video' })).toBe(true);
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await expect(store.upload({ publicId: 'a', mimeType: 'image/png', buffer: BUF })).rejects.toThrow('HTTP 401');
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await expect(store.upload({ publicId: 'a', mimeType: 'image/png', buffer: BUF })).rejects.toThrow();
  });
});

describe('not configured', () => {
  it('answers calmly and makes no network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setFileStoreForTests(null);
    clearKeys();
    expect(isFileStoreConfigured()).toBe(false);
    expect(await putPrivateFile(fakeReq(), { kind: 'voice', mimeType: 'audio/webm', buffer: BUF })).toBeNull();
    expect(signedFileUrl({ providerId: 'x' }, 300)).toBeNull();
    expect(await deleteStoredFile({ _id: 'x', providerId: 'x', kind: 'voice' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('putPrivateFile on the in-memory store', () => {
  let store;
  beforeEach(async () => {
    store = createMemoryFileStore();
    setFileStoreForTests(store);
    await testDb().collection('storedFiles').deleteMany({});
  });
  afterEach(() => setFileStoreForTests(null));

  it('writes one document with the C-FILES keys and no content', async () => {
    const id = await putPrivateFile(fakeReq(), { kind: 'voice', mimeType: 'audio/webm', buffer: BUF });
    const docs = await testDb().collection('storedFiles').find({}).toArray();
    expect(docs).toHaveLength(1);
    expect(docs[0]._id).toBe(id);
    expect(Object.keys(docs[0]).sort()).toEqual(['_id', 'businessId', 'bytes', 'createdAt', 'createdBy', 'deleteAfter', 'format', 'kind', 'mimeType', 'provider', 'providerId', 'resourceType'].sort());
    expect(JSON.stringify(docs[0])).not.toContain(BUF.toString('base64'));
    expect(docs[0].businessId).toBe('b1');
    expect(docs[0].providerId.startsWith('fv/b1/voice/')).toBe(true);
  });

  it('a failing upload returns null, writes nothing and warns with kind and bytes only', async () => {
    store.failNextUpload = true;
    const req = fakeReq();
    expect(await putPrivateFile(req, { kind: 'invoice', mimeType: 'image/png', buffer: BUF })).toBeNull();
    expect(await testDb().collection('storedFiles').countDocuments()).toBe(0);
    expect(req.log.warn).toHaveBeenCalledTimes(1);
    expect(req.log.warn).toHaveBeenCalledWith({ event: 'file_store.upload_failed', kind: 'invoice', bytes: 5 });
  });

  it('a rejected kind, mime type or size returns null', async () => {
    const req = fakeReq();
    expect(await putPrivateFile(req, { kind: 'invoice', mimeType: 'audio/webm', buffer: BUF })).toBeNull();
    expect(await putPrivateFile(req, { kind: 'voice', mimeType: 'audio/webm', buffer: Buffer.alloc(0) })).toBeNull();
    expect(await putPrivateFile(req, { kind: 'voice', mimeType: 'audio/webm', buffer: Buffer.alloc(1_350_001) })).toBeNull();
  });

  it('a failed insert destroys the uploaded asset', async () => {
    const col = testDb().collection('storedFiles');
    const spy = vi.spyOn(Object.getPrototypeOf(col), 'insertOne').mockRejectedValueOnce(new Error('db'));
    const req = fakeReq();
    expect(await putPrivateFile(req, { kind: 'voice', mimeType: 'audio/webm', buffer: BUF })).toBeNull();
    spy.mockRestore();
    expect(store.files.size).toBe(0);
    expect(req.log.warn).toHaveBeenCalledWith({ event: 'file_store.upload_failed', kind: 'voice', bytes: 5, reason: 'db' });
  });

  it('voice gets 730 days even with deleteAfterDays 5; invoice none by default and 30 days on request', async () => {
    const v = await putPrivateFile(fakeReq(), { kind: 'voice', mimeType: 'audio/webm', buffer: BUF, deleteAfterDays: 5 });
    const i1 = await putPrivateFile(fakeReq(), { kind: 'invoice', mimeType: 'image/png', buffer: BUF });
    const i2 = await putPrivateFile(fakeReq(), { kind: 'invoice', mimeType: 'application/pdf', buffer: BUF, deleteAfterDays: 30 });
    const get = id => testDb().collection('storedFiles').findOne({ _id: id });
    const dv = await get(v);
    expect(dv.deleteAfter - dv.createdAt).toBe(730 * DAY);
    expect('deleteAfter' in (await get(i1))).toBe(false);
    const d2 = await get(i2);
    expect(d2.deleteAfter - d2.createdAt).toBe(30 * DAY);
  });

  it('keepStoredFile clears deleteAfter of an invoice file only, in its own business', async () => {
    const i = await putPrivateFile(fakeReq(), { kind: 'invoice', mimeType: 'image/png', buffer: BUF, deleteAfterDays: 30 });
    const v = await putPrivateFile(fakeReq(), { kind: 'voice', mimeType: 'audio/webm', buffer: BUF });
    const db = testDb();
    expect(await keepStoredFile(db, 'b2', i)).toBe(false);
    expect(await keepStoredFile(db, 'b1', v)).toBe(false);
    expect('deleteAfter' in await db.collection('storedFiles').findOne({ _id: v })).toBe(true);
    expect(await keepStoredFile(db, 'b1', i)).toBe(true);
    expect('deleteAfter' in await db.collection('storedFiles').findOne({ _id: i })).toBe(false);
  });

  it('signedFileUrl expires in the ttl; deleteStoredFile removes asset and document, keeps the document on failure', async () => {
    const id = await putPrivateFile(fakeReq(), { kind: 'voice', mimeType: 'audio/webm', buffer: BUF });
    const file = await testDb().collection('storedFiles').findOne({ _id: id });
    const exp = Number(/exp=(\d+)/.exec(signedFileUrl(file, 300))[1]);
    expect(Math.abs(exp - (Math.floor(Date.now() / 1000) + 300))).toBeLessThanOrEqual(2);
    store.failNextDestroy = true;
    expect(await deleteStoredFile(file)).toBe(false);
    expect(await testDb().collection('storedFiles').countDocuments()).toBe(1);
    expect(await deleteStoredFile(file)).toBe(true);
    expect(await testDb().collection('storedFiles').countDocuments()).toBe(0);
  });
});

describe('readUploadedFile', () => {
  it('refuses too large, bad mime and non-base64', () => {
    expect(readUploadedFile({ kind: 'voice', base64: 'A'.repeat(1_800_001), mimeType: 'audio/webm' }).error).toBe('FILE_TOO_LARGE');
    expect(readUploadedFile({ kind: 'invoice', base64: 'AAAA', mimeType: 'application/zip' }).error).toBe('BAD_MIME');
    expect(readUploadedFile({ kind: 'invoice', base64: 'AAAA', mimeType: 'audio/webm' }).error).toBe('BAD_MIME');
    expect(readUploadedFile({ kind: 'voice', base64: 'not base64!', mimeType: 'audio/webm' }).error).toBe('BAD_FILE');
    expect(readUploadedFile({ kind: 'voice', base64: '', mimeType: 'audio/webm' }).error).toBe('BAD_FILE');
  });
  it('accepts a codecs suffix and a pdf invoice', () => {
    const a = readUploadedFile({ kind: 'voice', base64: 'AAAA', mimeType: 'Audio/WebM;codecs=opus' });
    expect(a.mimeType).toBe('audio/webm');
    expect(a.buffer.length).toBe(3);
    expect(readUploadedFile({ kind: 'invoice', base64: 'AAAA', mimeType: 'application/pdf' }).mimeType).toBe('application/pdf');
  });
});
