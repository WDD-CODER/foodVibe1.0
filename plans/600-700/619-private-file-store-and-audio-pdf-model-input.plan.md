# Plan 619 — Keep invoice files and voice recordings privately, and let the AI read audio and PDF

Status: done
Depends-on: 618
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
The program keeps two kinds of files: the invoice a business scanned (photo or PDF) and the voice note a chef
recorded on site (decision D6: recordings are kept, 24 months). Both identify people and show prices. Today the only
file code is in the browser: `src/app/core/services/cloudinary.service.ts` uploads images with an unsigned preset and
anyone who holds the link can open it. The server has no file code and no file-store key. Decision D16 adds a
condition: file storage must never block a feature — Dandan sets the keys at the end (gate G3), and until then every
feature works and the file is simply not kept.

The model side has the same gap: `callGemini` knows only "needs vision"; nothing says which models take audio or a PDF,
and the usage ledger counts image parts only.

This plan adds the private file store (server-signed upload, a link that expires in 300 seconds, retention for voice
files), the two small routes that hand out a link and report whether the store is on, the `needsMedia` switch in
`callGemini`, and the two ledger fields. It adds no screen and no model call; plans 621, 626 and 628 use it.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/services/` has no `file-store.js`; `server/routes/` has no `files.js` and no `admin-learning.js` (plan 615
  adds both as empty routers, mounted at `/api/v1/files` and `/api/v1/admin/learning`). No file under `server/`
  reads a `CLOUDINARY_*` variable. `render.yaml` lists no such key (its `envVars` end with `ALLOWED_ORIGIN`).
- `server/services/gemini-client.js` (548 lines): `callGemini({ body, timeoutMs, log, eventPrefix, needsVision = false,
  model: requested, usage })` at line 403; the chain is filtered once, at line 416
  (`modelChain().filter(m => !needsVision || isVisionModel(m))`); `isVisionModel` (line 135) tests
  `VISION_MODEL_PATTERN = /^gemini-[\d.]+-flash/` (line 64). `DEFAULT_MODELS` (lines 53–61) holds seven models:
  `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`, `gemini-3.6-flash`,
  `gemini-3.8-flash`, `gemini-3-flash-preview`. With no usable candidate the call returns `allExhausted(candidates)`
  (line 418). `getChainSettings()` (line 314) reports `vision` per model. Plan 617 adds the monthly cap check inside
  `callGemini` before this plan runs.
- `server/services/ai-usage.js` (195 lines): `countImages(body)` (line 32) counts `inlineData` parts whose `mimeType`
  starts with `image/`; `buildRow` (line 44) writes `imageCount` only when above 0; no `audioSeconds`, no `fileCount`.
- Image parts are sent as `{ inlineData: { mimeType, data } }` (`server/routes/ai.js` lines 616, 1438, 1484).
- `server/jobs/retention.js` (43 lines): `purgeRetained(db, businessId, now)` deletes old requests, bookings and
  messages, at most once per business per 24 hours, and returns `{ requests, bookings, messages }`;
  `RETENTION = { requestsDays: 730, bookingsDays: 730, messagesDays: 365 }`. Its only caller is the generic GET of
  `requests` and `bookings` (`server/routes/generic.js` line 70), so a business that never opens the front desk never
  runs it. `server/test/retention.test.js` asserts both objects with `toEqual`.
- `server/app.js`: `express.json({ limit: '2mb' })`; the helmet policy (lines 39–62) has `defaultSrc 'self'`,
  `imgSrc` and `connectSrc` and **no `mediaSrc`**, so an `<audio>` element may play only a file of the app's own
  origin — not a `blob:` recording and not a file-store link.
- `shared/schemas/ai-receipt-photo.schema.ts`: `RECEIPT_IMAGE_MAX_BASE64 = 1_800_000` (line 4).
- `server/utils/permissions.js`: `assertCan(req, res, 'editMoney', { type })` answers 403 for staff
  (`OWNER_ONLY_ACTIONS`); `server/utils/actor.js` `actorOf(req)`; `server/utils/id.js` `newId()`.
- Server tests fake the network with `vi.stubGlobal('fetch', fetchMock)` (`server/test/ai-shots-shared.test.js` lines
  35–36, `server/test/gemini-client.test.js`), run on an in-memory database (`server/test/helpers/app.js`) and sign
  tokens with `signTestToken`. `package.json` and `server/package.json` require Node 22 or newer, so `fetch`,
  `FormData` and `node:crypto` need no package.
- `server/routes/admin.js` `DELETE /users/:userId` (line 51): a whole business is removed only when the deleted user
  has a `businessId` and is not staff (`wholeBusiness`, line 62 — in practice its owner); it then deletes the
  business's documents in `ALL_USER_ENTITY_TYPES` (line 66), its users and the `businesses` document. A deleted staff
  user removes only the user. No server-only collection is touched, so the program's new server-only rows
  (`priceHistory`, `invoiceAliases`, `aiDrafts`, `storedFiles`, `businessAccess`) and the stored files would stay.
  The Human's rule (2026-11-17): a delete removes the business's private records but not what the platform learned
  from a business that is not private; a private business's delete removes everything.
- `docs/security-go-live.md` (95 lines) has a "Data retention" table (line 55) and no section on stored files.
  `server/.env.example` is tracked.
- New files of this plan: `server/services/file-store.js`, `server/services/cloudinary-requests.js`,
  `server/test/file-store.test.js`, `server/test/files-route.test.js`.
- From plan 615 (must be merged; not added here): collection `storedFiles` in `server/constants/collections.js`, its
  schema file `shared/schemas/entities/stored-file.schema.ts`, the index `{ businessId, kind, createdAt }`, the two
  empty routers and their mounts.

Provider documentation read on 2026-11-17 (Contract C-FILES: "do not write the request shape from memory"):
- Signature rule — https://cloudinary.com/documentation/authentication_signatures : every field of the request except
  `file`, `cloud_name`, `resource_type` and `api_key`, sorted by name, written `name=value`, joined with `&`; the API
  secret appended with no separator; SHA-1 (the default) or SHA-256, as a hex digest. A signature is valid for one
  hour from its `timestamp` (Unix seconds). Worked examples on that page, recomputed here with `node:crypto`:
  secret `abcd`, `timestamp=1315060510` → `a21ad0f63beb4de2e5575204b79ab90bffb02c10`; with
  `eager=w_400,h_300,c_pad|w_260,h_200,c_crop` and `public_id=sample_image` →
  `bfd09f95f331f558cbd1320e67aa8d488770583e`.
- Upload — https://cloudinary.com/documentation/image_upload_api_reference_upload : `POST
  https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/upload`; `resource_type` is `image`, `raw`, `video` or
  `auto`; audio files use `video`; `type` is `upload` (default), `private` or `authenticated`; `file` may be a Base64
  data URI (up to about 60 MB); a signed call adds `api_key`, `timestamp`, `signature`; the JSON answer carries
  `public_id`, `version`, `resource_type`, `type`, `format`, `bytes`. A raw HTTP upload is `multipart/form-data`.
  A PDF is stored as an `image` resource by default
  (https://cloudinary.com/documentation/ts_how_to_upload_manage_and_deliver_pdf_files).
- Access — https://cloudinary.com/documentation/control_access_to_media : with `type: authenticated` the original and
  every derived version are reachable only through a signed URL. A signed delivery URL (`/s--…--/`) does not expire;
  token-based and cookie-based access are paid features. The time-limited link for any plan is the download endpoint:
  `https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/download?timestamp=…&public_id=…&format=…&expires_at=…&signature=…&api_key=…`
  — `public_id` and `format` required; `type` (`upload`, `private`, `authenticated`; default `private`), `expires_at`
  (Unix seconds; default one hour) and `attachment` optional; `resource_type` `image`, `video` or `raw`. The link is
  served by the API, not the CDN. The page shows the two example links but not the signing formula; the SDKs sign
  these parameters with the rule above.
- Delete — https://cloudinary.com/documentation/image_upload_api_reference_destroy_by_public_id : `POST
  …/<resource_type>/destroy` with `public_id`, `type`, `api_key`, `timestamp`, `signature`; answer `{ "result": "ok" }`.
- Free accounts block the delivery of PDF and ZIP files until a setting under **Security** allows it (the PDF page
  above).

Model documentation read on 2026-11-17 (model pages under https://aistudio.google.com/docs/models/, where
https://ai.google.dev/gemini-api/docs now redirects): `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`,
`gemini-2.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash` and `gemini-3-flash-preview` list the inputs "Text,
Image, Video, Audio, and PDF"; `gemini-2.5-flash` lists "Text, images, video, audio" (no PDF), is deprecated, and
from 2026-12-01 its requests are answered by `gemini-3.5-flash-lite`. Audio costs 32 tokens per second
(https://aistudio.google.com/docs/audio); accepted audio types include `audio/webm`, `audio/ogg`, `audio/mpeg`,
`audio/wav`, `audio/m4a`; a PDF page costs 258 tokens (https://aistudio.google.com/docs/document-processing).

## Goals & Success Criteria
**Primary:** a server route can store a file privately and get back an id, hand a member of that business a link that
stops working after 300 seconds, and delete it; with no keys set every one of those calls answers calmly and nothing
breaks; and `callGemini` sends an audio or PDF request only to a model that takes it.

- [auto] `pnpm run test:server` passes, including `server/test/file-store.test.js`: the signature function reproduces both
  documentation examples (`a21ad0f63beb4de2e5575204b79ab90bffb02c10`, `bfd09f95f331f558cbd1320e67aa8d488770583e`);
  the upload request goes to `https://api.cloudinary.com/v1_1/demo/video/upload` for a voice file and
  `…/demo/image/upload` for an invoice file, with `type=authenticated` and no secret in the URL or the body; the
  download link carries `expires_at` = now + 300 and `type=authenticated`.
- [auto] Same file: with the store not configured `putPrivateFile` returns `null`, `signedFileUrl` returns `null`,
  `deleteStoredFile` returns `false`, and no `fetch` call is made; with the in-memory store a put writes exactly one
  `storedFiles` document whose keys are the C-FILES list (plus `format`), with no Buffer and no base64 text in it; a
  failing upload returns `null`, writes no document and logs one warn that holds `kind` and `bytes` only; a voice file
  gets `deleteAfter = createdAt + 730 days` even when `deleteAfterDays: 5` is passed, an invoice file gets none by
  default and `createdAt + 30 days` with `deleteAfterDays: 30`; `keepStoredFile` removes `deleteAfter` from that
  invoice file, returns `false` for another business's file id and for a voice file.
- [auto] Same file: `readUploadedFile` refuses base64 longer than 1,800,000 characters (`FILE_TOO_LARGE`), a mime type
  outside the kind's list (`BAD_MIME`, e.g. `application/zip`, and `audio/webm` for an invoice) and text that is not
  base64 (`BAD_FILE`); it accepts `audio/webm;codecs=opus` as `audio/webm` and `application/pdf` for an invoice.
- [auto] `pnpm run test:server` passes, including `server/test/files-route.test.js`: `GET /api/v1/files/:id` answers 200 `{ url }`
  to the owner of the file's business, 404 to a member of another business and for an unknown id, 403 to staff for an
  invoice file and 200 to staff for a voice file, 401 without a token, 503 `FILE_STORE_OFF` when the store is not
  configured; `GET /api/v1/admin/learning/status` answers `{ fileStore: false }` without keys and `{ fileStore: true }`
  with the in-memory store, and 403 to an owner; the response header `content-security-policy` contains
  `media-src 'self' blob:`.
- [auto] `pnpm run test:server` passes, including `server/test/retention.test.js`: a voice file past its `deleteAfter` is deleted
  from the store and from `storedFiles`, one day before it is kept, another business's file is kept, an invoice file
  with a passed `deleteAfter` (an abandoned read) is deleted too, an invoice file with no `deleteAfter` is never
  deleted, and a file whose provider delete fails keeps its document.
- [auto] `pnpm run test:server` passes, including `server/test/gemini-client.test.js`: with the chain `gemini-2.5-flash`,
  `gemini-3.1-flash-lite`, a call with `needsMedia: 'pdf'` goes to `gemini-3.1-flash-lite` and a call with
  `needsMedia: 'audio'` goes to `gemini-2.5-flash`; `needsVision: true` behaves as `needsMedia: 'image'`; every model
  of `DEFAULT_MODELS` has a media entry; an unknown `needsMedia` value throws under vitest.
- [auto] `pnpm run test:server` passes, including `server/test/ai-usage.test.js`: a call whose body has one `audio/webm` part and
  `usage.audioSeconds: 42` writes `audioSeconds: 42` and `fileCount: 1`; a body with one `application/pdf` part and
  one `image/png` part writes `fileCount: 1` and `imageCount: 1`; a text-only call writes neither field.
- [auto] `pnpm run test:server` passes, including `server/test/admin-business-delete.test.js`, on the in-memory store with a
  platform admin token. Deleting the owner of business A, which is not private: no document of A is left in
  `priceHistory`, `invoiceAliases`, `storedFiles` and `businessAccess`, and A's two files are gone from the store;
  the `'__master__'` rows of `invoiceAliases` and `supplierProfiles` that list A as a contributor are unchanged; A's
  promoted copy in `GEMINI_SHOTS` (`businessId: '__master__'`) is still there; each of A's `aiDrafts` rows is still
  there and its keys are a subset of exactly `_id, businessId, feature, model, keptRatio, status, at, confirmedAt`
  (no `input`, `aiDraft`, `saved`, `userId`, `subject`). Deleting the owner of business P, which has
  `aiPrivate: true`: nothing of P is left in those collections, in `aiDrafts`, or as a promoted copy. Business B's
  rows and file are untouched in both cases. With `failNextDestroy` set the answer is still 200, the `storedFiles`
  rows are gone and one warn log holds the business id and a count only. Deleting a staff user changes none of
  these rows.
- [auto] `pnpm run test:server` passes (the whole server suite).
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] After gate G3 (Dandan set the three keys on Render and allowed PDF delivery in the provider's Security
  settings): he scans one invoice photo and one PDF and records one voice note, opens each from the app, and each
  link opens the file; the same link pasted into the browser ten minutes later is refused.

## Execution Mode
- Parallel: no — a plan of run `mod-0`: it edits `server/services/gemini-client.js` after 617, `server/routes/admin.js`
  and `server/services/business.js` after 618, the shared registry
  file `server/app.js` (one policy line) and plan 615's routers; it runs after 618 and before 620, never beside any
  other plan of the program.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/file-store.js
server/services/cloudinary-requests.js
server/services/gemini-client.js
server/services/ai-usage.js
server/routes/files.js
server/routes/admin-learning.js
server/routes/admin.js
server/services/business.js
server/jobs/retention.js
server/app.js
shared/schemas/entities/stored-file.schema.ts
server/test/**
render.yaml
server/.env.example
docs/security-go-live.md
docs/agent/standards-backend.md
server/breadcrumbs.md
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `GET /api/v1/files/:id` finds a file only inside the business of the signed token (another business's id answers 404) and an invoice file needs `assertCan(…, 'editMoney')`; the status route is platform admin only.
- INV-2: preserves — a business delete removes only rows of that business; what stays for a non-private business is either already shared `'__master__'` material or draft rows with no content, read only by the platform admin. Every `storedFiles` row carries the caller's `businessId` from the token and is never cloned or shared; the retention sweep in `server/jobs/retention.js` deletes only the files of the business it was called for.
- INV-4: preserves — the stored document's shape stays in `shared/schemas/entities/stored-file.schema.ts` and every insert is checked against it before it is written.
- INV-6: preserves — `callGemini` stays the one caller of the model and is still reached only from `server/routes/ai.js` and its sub-routers; this plan adds a filter on the model chain, not a call.

## Reuse Check

- `server/services/file-store.js` (`isFileStoreConfigured`, `putPrivateFile`, `keepStoredFile`, `signedFileUrl`, `deleteStoredFile`, `readUploadedFile`, `setFileStoreForTests`, `createMemoryFileStore`) — family: none — rung: 4 — why: the server has no file code; the browser's `CloudinaryService` uploads public images with an unsigned preset and cannot hold a secret.
- `server/services/cloudinary-requests.js` (`signParams`, `uploadRequest`, `downloadUrl`, `destroyRequest`) — family: none — rung: 4 — why: pure request builders kept apart from the service so they are tested against the provider's published examples without a network or a key.
- `GET /api/v1/files/:id` and `GET /api/v1/admin/learning/status` — family: server-auth — rung: 1 — why: `verifyToken`, the business filter, `assertCan` and `requirePlatformAdmin` as they are.
- `deleteBusinessServerData` in `server/services/business.js` — family: none — rung: 4 — why: the delete route walks only the user-data collections; one function beside `setAiPrivate` holds the rule for the server-only ones and uses `mayLearnFrom` and `deleteStoredFile` as they are.
- `needsMedia` in `callGemini` — family: none — rung: 4 — why: extends the existing `needsVision` filter in the same function; not a second model caller.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the invoice I scanned to be kept where only my business can open it, so that my suppliers' prices are not behind a link anyone can pass on.
- As a chef, I want the voice note I recorded on site to be kept with its transcript, so that I can listen again when the checklist is unclear.
- As a chef, I want scanning and recording to work on a day the file storage is not set up or is down, so that I never lose the result because a file could not be kept.
- As the platform admin, I want to see whether file storage is switched on, so that I know when the keys are missing.
- As the platform admin, I want deleting a business to remove its files and prices but keep what the AI learned from it, and to remove that too when the business is private, so that an erasure request is two steps and an ordinary delete does not make the AI worse for everyone.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-FILES (619; used by 621, 626, 628)**
  - `server/services/file-store.js`: `isFileStoreConfigured()` (all of `CLOUDINARY_CLOUD_NAME`,
    `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set); `putPrivateFile(req, { kind: 'invoice' | 'voice', mimeType,
    buffer, deleteAfterDays? }) → fileId | null` — `null` when not configured or when the upload fails (one warn log with kind and
    size, never the content; never throws); `signedFileUrl(file, ttlSeconds)`; `deleteStoredFile(file)`;
    `setFileStoreForTests(fake)`.
  - Upload is signed by the server and delivered as an authenticated (non-public) asset; no new npm dependency
    (`node:crypto` + `fetch`). The request shapes are in 619, taken from the provider's documentation as read on
    2026-11-17 and built by pure functions in `server/services/cloudinary-requests.js`: a signed delivery URL does not
    expire there, so the 300-second link is the provider's API download endpoint with `expires_at`.
  - `server/app.js` gains `media-src` in the content security policy (619), so a recording can be replayed from a
    `blob:` and from a stored file.
  - Collection `storedFiles` (server-only): `{ _id, businessId, kind, mimeType, bytes, provider: 'cloudinary',
    providerId, resourceType, format?: string (≤ 12, from the provider's upload answer), createdBy, createdAt,
    deleteAfter?: number }`. Index `{ businessId, kind, createdAt }`.
  - `GET /api/v1/files/:id` → `{ url }` (expires in 300 s) for a member of the file's business; 404 otherwise.
    An invoice file: owner (and consultant) only — it shows prices.
  - Limits: base64 ≤ 1,800,000 characters (the JSON body limit is 2 MB). Mime allowlists — invoice:
    `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; voice: `audio/webm`, `audio/mp4`, `audio/ogg`,
    `audio/mpeg`, `audio/wav`.
  - Retention: a voice file gets `deleteAfter = createdAt + 730 days`; `server/jobs/retention.js` deletes the
    provider asset and the document of every stored file whose `deleteAfter` has passed (lazy, same throttle). An
    invoice file is stored at read time with `deleteAfterDays: 30`; when `apply` writes the invoice it calls
    `keepStoredFile(db, businessId, fileId)` (`file-store.js`), which clears `deleteAfter` — so a read nobody saved is
    cleaned up, and a kept invoice's file lives as long as its invoice.
  - Model input: `callGemini` gains `needsMedia?: 'image' | 'audio' | 'pdf'` (`needsVision: true` keeps meaning
    `'image'`); a model that cannot take the medium is skipped in the chain; ledger rows gain `audioSeconds?` and
    `fileCount?`.
  - `GET /api/v1/admin/learning/status` → `{ fileStore: boolean }`.
- [ ] `shared/schemas/entities/stored-file.schema.ts` (plan 615's file; this plan owns it from here): exports
  `FILE_BASE64_MAX = 1_800_000`, `FILE_KINDS = ['invoice', 'voice'] as const`, `FILE_MIME_TYPES = { invoice:
  ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], voice: ['audio/webm', 'audio/mp4', 'audio/ogg',
  'audio/mpeg', 'audio/wav'] } as const`, `VOICE_FILE_KEEP_DAYS = 730`, and the stored document gains one optional
  field `format: z.string().min(1).max(12).optional()` (the file format the provider reported, needed to build the
  download link — a Contract extension, written into the map's "Contract extensions (run)" section). Constants that
  615 already exported under these names are kept, not duplicated. `pnpm run build:schemas` regenerates
  `server/generated/schemas`.
- [ ] `server/services/cloudinary-requests.js` (new, pure, no `process.env`, no `fetch`): every function takes
  `config = { cloudName, apiKey, apiSecret }`.
  - `signParams(params, apiSecret)` → SHA-1 hex of the sorted `name=value` pairs joined with `&`, with the secret
    appended; keys `file`, `cloud_name`, `resource_type`, `api_key` and keys whose value is `undefined`, `null` or `''`
    are left out.
  - `resourceTypeOf(mimeType)` → `'video'` for `audio/*`, `'image'` for `image/*` and `application/pdf`.
  - `uploadRequest(config, { publicId, mimeType, buffer, timestamp })` → `{ url, fields }` with
    `url = https://api.cloudinary.com/v1_1/<cloudName>/<resourceTypeOf(mimeType)>/upload` and `fields = { file:
    'data:<mimeType>;base64,<…>', api_key, timestamp, public_id: publicId, type: 'authenticated', signature }` where
    `signature = signParams({ public_id, timestamp, type }, apiSecret)`.
  - `downloadUrl(config, { publicId, resourceType, format, expiresAt, timestamp })` →
    `https://api.cloudinary.com/v1_1/<cloudName>/<resourceType>/download?` + the query `api_key`, `expires_at`,
    `format`, `public_id`, `timestamp`, `type=authenticated`, `signature` (`signParams` over `expires_at`, `format`,
    `public_id`, `timestamp`, `type`); every value is an integer or a plain string (never exponent notation) and is
    URL-encoded.
  - `destroyRequest(config, { publicId, resourceType, timestamp })` → `{ url: …/<resourceType>/destroy, fields:
    { public_id, type: 'authenticated', api_key, timestamp, signature } }`.
  - The header comment of the file names the four documentation pages and the date 2026-11-17.
- [ ] `server/services/file-store.js` (new):
  - `isFileStoreConfigured()` → true when `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`
    are all non-empty, or when a test store is set. The three values are read at call time, never logged, never
    returned, never put into an error.
  - The store behind the service is one object `{ upload({ publicId, mimeType, buffer }) → { providerId,
    resourceType, format }, url(file, expiresAtSec) → string, destroy(file) → boolean }`. The real one is built by
    `createCloudinaryStore(config)` (exported; the service passes the three environment values, a test passes the
    documentation's sample values `{ cloudName: 'demo', apiKey: 'k', apiSecret: 'abcd' }` with `fetch` stubbed). It sends
    `uploadRequest` / `destroyRequest` as `multipart/form-data` (`FormData`) with `fetch` and
    `AbortSignal.timeout(20000)`; a non-2xx answer or a body without `public_id` throws an `Error` whose message is
    the HTTP status only. `destroy` is true for `result: 'ok'` and `result: 'not found'`.
  - `setFileStoreForTests(fake | null)` swaps that object (`null` restores the real one).
    `createMemoryFileStore()` returns a fake that keeps the buffers in a `Map`, answers `url` with
    `memory://<providerId>?exp=<expiresAtSec>`, and has `failNextUpload` and `failNextDestroy` switches — the fake
    every test of this program uses (621, 626, 628).
  - `readUploadedFile({ kind, base64, mimeType })` → `{ buffer, mimeType }` or `{ error: 'FILE_TOO_LARGE' | 'BAD_MIME'
    | 'BAD_FILE' }`: the mime type is lower-cased and cut at the first `;`; it must be in `FILE_MIME_TYPES[kind]`;
    `base64` must be a string of 1 to `FILE_BASE64_MAX` characters matching `^[A-Za-z0-9+/]+={0,2}$`. The routes of
    621 and 626 call it, so the limits have one implementation.
  - `putPrivateFile(req, { kind, mimeType, buffer, deleteAfterDays })` → `fileId | null` (Contract correction of
    2026-11-17: the optional `deleteAfterDays`). Not configured → `null` (one
    `file_store.off` info line per process, not per call). A kind or mime type outside the lists, an empty buffer or
    more than 1,350,000 bytes → `null` with a `file_store.rejected` warn. Otherwise: `publicId =
    'fv/<businessId>/<kind>/<newId()>'`, upload, then insert `{ _id: newId(), businessId: req.user.businessId, kind,
    mimeType, bytes: buffer.length, provider: 'cloudinary', providerId, resourceType, format, createdBy:
    actorOf(req).userId, createdAt: now, deleteAfter }`, checked with the shared schema first. `deleteAfter`: a
    `voice` file always gets `now + 730 days` (a passed `deleteAfterDays` is ignored); any other kind gets
    `now + deleteAfterDays days` when `deleteAfterDays` is a whole number from 1 to 3,650, and no `deleteAfter`
    otherwise. Plan 626 stores an invoice file at read time with `deleteAfterDays: 30`.
  - `keepStoredFile(db, businessId, fileId)` → `boolean`: `updateOne({ _id: fileId, businessId }, { $unset:
    { deleteAfter: '' } })`; true when a document matched. It refuses a `voice` file (returns `false`, changes
    nothing). Plan 625's apply calls it when the invoice is written, so a kept invoice's file lives as long as the
    invoice and an abandoned read is cleaned by the retention job. A failed upload → `null` and one
    `req.log.warn({ event: 'file_store.upload_failed', kind, bytes })`. A failed schema check or insert → the uploaded
    asset is destroyed (best effort), the same warn with `reason: 'db'`, `null`. The function never throws and never
    logs a file name, the content or the provider id.
  - `signedFileUrl(file, ttlSeconds)` → the store's `url(file, Math.floor(Date.now() / 1000) + ttlSeconds)`, or `null`
    when not configured.
  - `deleteStoredFile(file)` → `true` after the provider asset is gone and the `storedFiles` document is deleted;
    `false` (document kept) when not configured or when the provider call fails (one `file_store.delete_failed` warn
    with `kind` only).
- [ ] `server/routes/files.js` (615's empty router): `GET /:id` — `verifyToken`; the document is read with
  `{ _id: req.params.id, businessId: req.user.businessId }`; none → 404 `{ error: 'Not found' }`; `kind: 'invoice'` →
  `assertCan(req, res, 'editMoney', { type: 'products' })` (403 for staff; the consultant role of plan 631 passes
  through the same call); `signedFileUrl(file, 300)` `null` → 503 `{ error: 'FILE_STORE_OFF' }`; else 200 `{ url }`
  and `req.log.info({ event: 'files.url_issued', kind })`. Before the read it calls `purgeRetained(db,
  req.user.businessId, Date.now())` inside a `try` (a sweep error never fails the request). No other route.
- [ ] `server/routes/admin-learning.js` (615's empty router): `GET /status` — `verifyToken, requirePlatformAdmin` →
  `{ fileStore: isFileStoreConfigured() }`.
- [ ] `server/jobs/retention.js`: `RETENTION` gains `voiceFilesDays: 730`; `purgeRetained` also reads up to 50
  `storedFiles` documents `{ businessId, deleteAfter: { $lt: now } }`, calls `deleteStoredFile` for each and returns
  the number deleted as `files` beside the three existing counts (`retention.purged` logs it too). The 24-hour
  throttle is unchanged. The sweep is by `deleteAfter` alone, whatever the kind: the provider asset is deleted first
  and the document only after it; a file with no `deleteAfter` (a kept invoice) is never matched.
- [ ] Deleting a whole business removes its private records and keeps what the platform learned from it, unless the
  business is private (the Human's rule of 2026-11-17, C-LEARN). `server/services/business.js` gains
  `deleteBusinessServerData(db, business, log)`, which takes the `businesses` document read before the delete:
  - Always, whatever the business is: for every `storedFiles` document of the business it calls `deleteStoredFile`
    (a `false` answer is counted, never thrown), then `deleteMany({ businessId })` on `storedFiles`, `priceHistory`,
    `invoiceAliases` (the business's own rows only — rows of `'__master__'` are never matched) and `businessAccess`.
    When any provider delete failed it logs one `log.warn({ event: 'business.delete.files_left', businessId, count })`.
  - When `mayLearnFrom(business)` is true (not private at delete time): the shared supplier brain is left as it is
    (`forgetBusiness` is not called — the shared rows hold no price, quantity or identity); the business's promoted
    recipe examples in the `'__master__'` pool of `GEMINI_SHOTS` stay; its `aiDrafts` rows stay, reduced to numbers:
    `updateMany({ businessId }, { $unset: { input: '', aiDraft: '', saved: '', userId: '', subject: '' } })`, so
    `feature`, `model`, `keptRatio`, `status`, `at`, `confirmedAt` and `businessId` remain and no content of the
    business does. (`subject` goes too: it holds an id of a record that no longer exists.)
  - When the business is private at delete time: everything goes — `GEMINI_SHOTS` documents
    `{ businessId: '__master__', 'promotedFrom.businessId': id }` are deleted (as `setAiPrivate` does), its `aiDrafts`
    rows are deleted, and the function ends at the comment line `// plan 627 calls forgetBusiness(db, businessId)
    here (private business only)` — the same placeholder plan 618 leaves in `setAiPrivate`.
  - It returns the counts and never logs content. `server/routes/admin.js` `DELETE /users/:userId` reads the
    business document and calls the function inside the `wholeBusiness` branch only, before the `businesses`
    document is deleted; a throw from it is caught and logged (`admin.users_delete.extras_failed`, business id only)
    and the delete goes on. A deleted staff user changes nothing here: a business is removed only together with its
    owner, as the route already works.
  - "Erase everything" needs no new screen: the platform admin turns private mode on for the business (plan 620's
    dialog) and then deletes it.
- [ ] `server/services/gemini-client.js`:
  - `MODEL_MEDIA` (exported, frozen): `['image', 'audio', 'pdf']` for `gemini-3.1-flash-lite`,
    `gemini-3.5-flash-lite`, `gemini-2.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-3-flash-preview`;
    `['image', 'audio']` for `gemini-2.5-flash`. A comment gives the source pages and the date 2026-11-17.
  - `modelTakes(model, medium)` (exported) → `MODEL_MEDIA[model]?.includes(medium) ?? (medium === 'image' &&
    isVisionModel(model))`.
  - `callGemini` gains `needsMedia` (`'image' | 'audio' | 'pdf'`, optional). The medium is `needsMedia`, else
    `'image'` when `needsVision` is true, else none. The one chain filter (line 416 today) becomes
    `modelChain().filter(m => !medium || modelTakes(m, medium))`. An unknown `needsMedia` value throws
    `Error('callGemini: unknown needsMedia')` under vitest and is ignored with one `ai.media.unknown` error log
    otherwise (the same pattern as a missing `usage.feature`). When the filter leaves no model, one
    `log.warn({ event: 'ai.media.no_model', medium })` is written and the result stays `all_exhausted` as today.
    Everything else — the cap check of plan 617, the retry loop, the return shapes — is untouched.
- [ ] `server/services/ai-usage.js`: `buildRow` writes `fileCount` = the number of `inlineData` parts whose `mimeType`
  starts with `audio/` or equals `application/pdf` (left out at 0), and `audioSeconds` = `Math.round(usage.audioSeconds)`
  when that is a finite number above 0 and at most 34,200 (left out otherwise). `imageCount` is unchanged.
- [ ] `server/app.js`: the helmet policy gains one directive, `mediaSrc: ["'self'", "blob:",
  "https://api.cloudinary.com", "https://res.cloudinary.com"]`, with a comment: a recording is replayed from a `blob:`
  before it is sent, and a stored recording is played from the file store's link (plans 623, 628). No other line of
  the file changes.
- [ ] `render.yaml`: three entries after `WHATSAPP_VERIFY_TOKEN`, each `sync: false`, under the comment "Private file
  store (plan 619). Optional: without all three, invoices and voice notes still work and the file is not kept. Set in
  the Render dashboard by hand - never commit a value." — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`. `server/.env.example`: the same three names with empty values and the same comment.
- [ ] `docs/security-go-live.md`: a section "Private files: invoices and voice notes" — what is stored and where
  (`storedFiles` holds ids and sizes, the file itself only in the file store, never in MongoDB); the three variable
  names and that the browser never gets them; the gate G3 steps in order (create the three values in the provider's
  console, set them on Render, allow "PDF and ZIP files delivery" under the provider's Security settings, check
  `/platform` shows the store on); a link lives 300 seconds; who may open what (any member a voice note, the owner an
  invoice); what is logged (kind and size only). A sub-section "Deleting a business and an erasure request": what a
  delete always removes (files, price history, own name memory, access grants, with the user-data collections), what
  stays for a business that is not private (its part in the shared supplier memory, promoted recipe examples, draft
  rows without any content), and the two steps of a full erasure — 1. turn private mode on for the business on
  `/platform`, 2. delete the business — after which nothing learned from it remains. The "Data retention" table gains a row: voice recordings, 24 months
  from the recording, the same sweep (also run when a file link is asked for); the file of an invoice read that was
  never saved, 30 days; the file of a saved invoice, as long as the invoice.
- [ ] `docs/agent/standards-backend.md` §5: rows for `GET /api/v1/files/:id` and `GET /api/v1/admin/learning/status`;
  the `storedFiles` row of §1 names `server/services/file-store.js` as its only writer. `server/breadcrumbs.md`: rows
  for `services/file-store.js`, `services/cloudinary-requests.js`, `routes/files.js`, `routes/admin-learning.js`, and
  the `jobs/retention.js` row mentions voice files.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen, no dictionary key, no icon in this plan. Hebrew RTL is not touched.
- What a later screen can rely on: `fileId: null` from a read or transcribe route means "worked, file not kept" and is
  not an error to show; `GET /api/v1/files/:id` 503 `FILE_STORE_OFF` and 404 are the two refusals a screen shows as
  "the file is not available".

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Put the file limits and allowed file types in one shared place — FILE_BASE64_MAX, FILE_KINDS, FILE_MIME_TYPES, VOICE_FILE_KEEP_DAYS and the optional format field in the stored-file schema; pnpm run build:schemas — shared/schemas/entities/stored-file.schema.ts
- [x] A2: Build the signed requests to the file store as pure functions checked against the provider's own examples — signParams, resourceTypeOf, uploadRequest, downloadUrl, destroyRequest; tests: the two published signatures, upload URL per kind, type authenticated, expires_at, no secret in any URL or field — server/services/cloudinary-requests.js, server/test/file-store.test.js
- [x] A3: Add the file store service that keeps a file privately and never breaks a feature when it cannot — isFileStoreConfigured, the real store over fetch and FormData, setFileStoreForTests, createMemoryFileStore, readUploadedFile, putPrivateFile with deleteAfterDays, keepStoredFile, signedFileUrl, deleteStoredFile; tests on the in-memory store and with fetch stubbed (vi.stubGlobal): not configured, stored field list, failed upload, failed insert destroys the asset, voice deleteAfter, the three readUploadedFile refusals, logs hold kind and bytes only — server/services/file-store.js, server/test/file-store.test.js
- [x] A4: Let a member open a stored file through a link that expires and let the platform admin see if storage is on — GET /:id (own business, invoice needs editMoney, 404, 403, 503, lazy sweep) and GET /status; tests for each status code with signTestToken; update plan 615's empty-router test for these two routers; the mediaSrc line in the helmet policy so the browser may play a recording, with a test that reads the content-security-policy header — server/routes/files.js, server/routes/admin-learning.js, server/app.js, server/test/files-route.test.js
- [x] A5: Delete voice recordings after twenty-four months — RETENTION.voiceFilesDays, the storedFiles sweep (50 per run) through deleteStoredFile, the files count; update the two toEqual assertions of the existing test and add the five file cases — server/jobs/retention.js, server/test/retention.test.js
- [x] A6: Send an audio or PDF request only to a model that can read it — MODEL_MEDIA, modelTakes, needsMedia in callGemini with needsVision kept as image; tests: pdf skips gemini-2.5-flash, audio does not, every DEFAULT_MODELS entry has media, unknown value throws under vitest, the existing vision tests unchanged — server/services/gemini-client.js, server/test/gemini-client.test.js
- [x] A7: Count audio seconds and attached files in the AI usage ledger — fileCount and audioSeconds in buildRow; three new cases; the stored-field-list test still passes for a text call — server/services/ai-usage.js, server/test/ai-usage.test.js
- [x] A8: Leave nothing of a business behind when the platform admin deletes it — deleteBusinessServerData: always the stored files through deleteStoredFile, price history, own aliases and access grants; a business that is not private keeps its shared contributions and promoted examples and its drafts stripped to numbers; a private business loses promoted copies and drafts too and reaches the forgetBusiness placeholder; called with the business document from the whole-business branch of the delete route; tests on the in-memory store for a non-private delete (exact remaining draft keys), a private delete, a failed provider delete and a staff delete — server/services/business.js, server/routes/admin.js, server/test/admin-business-delete.test.js
- [x] A9: Document the three keys and the go-live steps without writing any value — render.yaml entries, .env.example names, the new section and retention row in the security doc, the backend standards rows, the server map rows — render.yaml, server/.env.example, docs/security-go-live.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [x] A10: Run every check and write the evidence into the plan — pnpm run test:server, pnpm --dir server run lint, pnpm run build, node scripts/log-query.mjs --since=plan-start --level=error; exact result lines into Execution Notes; the [human] card is handed over for gate G3

## Technical Considerations
- Dependencies: `callGemini`'s existing callers pass no `needsMedia` and behave as before; `purgeRetained`'s callers
  ignore its return value (`server/routes/generic.js` line 70). Plans 621 (`needsMedia: 'audio'`,
  `usage.audioSeconds`, `readUploadedFile`, `putPrivateFile`), 626 (`needsMedia: 'image' | 'pdf'`) and 628
  (`GET /api/v1/files/:id`) build on this plan; plan 630 shows `GET /api/v1/admin/learning/status`.
- New files needed: `server/services/file-store.js`, `server/services/cloudinary-requests.js`,
  `server/test/file-store.test.js`, `server/test/files-route.test.js`, `server/test/admin-business-delete.test.js`.
- Model changes: none in the browser. `storedFiles` documents gain optional `format`; `aiUsage` rows gain optional
  `audioSeconds` and `fileCount`.
- Backend / API: new `GET /api/v1/files/:id` → `{ url }`; new `GET /api/v1/admin/learning/status` →
  `{ fileStore }`; `callGemini` gains `needsMedia`; `purgeRetained` returns one more count; the response header
  `Content-Security-Policy` gains `media-src`.
- Auth and validation: `GET /files/:id` — a signed-in member of the file's business; an invoice file needs
  `editMoney` (owner; consultant after plan 631); the id is used only as a query value. `GET /admin/learning/status` —
  platform admin. `readUploadedFile` checks kind, mime type, length and the base64 alphabet before anything is
  decoded.
- Security surface: a business delete keeps no content of a non-private business (drafts are stripped to numbers; shared rows hold no price, quantity or identity) and nothing at all of a private one. Three new server secrets, read only from the environment inside `file-store.js`; they never
  reach a log, an error, a test, a response or the browser (tests pass the documentation's sample values to the pure
  builders and use the in-memory store elsewhere). The upload is `type: authenticated`, so no public link exists;
  the only link the app hands out expires after 300 seconds and is given only to a member of the business. The file
  bytes never enter MongoDB or a log. Logs carry `kind` and `bytes` only. A real provider call cannot be run in the
  automated checks (no key): the `[human]` item at gate G3 is the real-world check, and the request shapes are pinned
  to the provider's published examples.
- Data / migration: no migration; `storedFiles` is created on first insert (registered by 615). Voice files carry
  `deleteAfter` (730 days); an invoice file carries it only until its invoice is saved (`keepStoredFile`). Free tier: a `storedFiles` document
  is about 300 bytes; the files themselves are outside MongoDB.
- Project checks: the `[auto] log-query` item is present; `pnpm run test:server` is a Done-when item; no dictionary
  key and no Lucide icon (no screen); Reuse Check filled; the entity shape stays in `shared/schemas`; the collection's
  registration follows `standards-backend.md` §3 in plan 615 and this plan adds the §5 rows for its two routes.

## Out of Scope
- Any route that receives a file or calls the model with one: transcription (621), the invoice read (626), the
  screens (623, 628) and the platform status tile (630).
- Moving the browser's public image uploads (`CloudinaryService`: recipe, venue and profile photos) to the private store.
- The `audio` and `pdf` columns in the platform admin's model manager screen (`getChainSettings` keeps reporting
  `vision` only).
- A price for audio input in `server/constants/ai-prices.js` (audio tokens cost more than text tokens on the provider's
  price list; the estimate uses the text rate until a later plan adds `audioPerMinute`).
- Deleting an invoice's file when the invoice is removed for good — the plan that owns that delete calls
  `deleteStoredFile`. Setting `deleteAfterDays: 30` on an invoice read (626) and calling `keepStoredFile` from apply (625).
- Setting the three keys (gate G3, Dandan).

## Critical Questions
- none

## Execution Notes
- decided: the expiring link is the provider's download endpoint with `expires_at`, not a signed delivery URL — why: the documentation read on 2026-11-17 says a signed delivery URL does not expire and token-based access is a paid feature; the Contract asks for a link that expires in 300 seconds and Dandan pays for no tier.
- decided: requests are signed with SHA-1 hex over the sorted parameters — why: it is the documented default and needs only `node:crypto`; an account limited to SHA-256 is a support setting Dandan has not asked for.
- decided: uploads use the resource type `video` for audio and `image` for pictures and PDF, with `type: authenticated` — why: these are the documented types for those files and the download endpoint's documented examples use them.
- decided: Contract extension — `storedFiles` gains optional `format`, taken from the provider's upload answer — why: the download endpoint requires `format`, and guessing it from the mime type can differ from what the provider stored (for example an `audio/mp4` recording).
- decided: Contract extension — `server/services/cloudinary-requests.js` holds the pure request builders beside `file-store.js` — why: they are tested against the provider's published signature examples with sample values, so no secret and no network is needed.
- decided: `readUploadedFile` and `createMemoryFileStore` live in `file-store.js` — why: 621 and 626 need the same limits and the same fake; one implementation of each.
- decided: `GET /api/v1/files/:id` answers 403 to staff for an invoice file (through `assertCan`) and 503 `FILE_STORE_OFF` when the keys are missing — why: 403 is what every other owner-only read answers; a missing store is a server state, not a missing file.
- decided: the stripped draft rows also lose `subject` — why: it holds the id of an event, invoice or count that the delete removed; the Human's list of fields that stay does not name it.
- decided: `deleteBusinessServerData` takes the business document, not only its id — why: it must ask `mayLearnFrom(business)` before the document is deleted.
- note: a stripped `aiDrafts` row no longer has the fields plan 615's schema may require (`input`, `aiDraft`, `userId`); nothing validates a stored draft on read, and plan 630, which reads drafts for the platform admin, must read `feature`, `model`, `keptRatio`, `status`, `at` only.
- decided: a failed provider delete during a business delete still removes the `storedFiles` rows — why: the business is gone, so the row could never be retried from inside it; the warn line with the business id and a count is the trace.
- decided: the retention sweep also runs when a file link is asked for — why: its only caller today is the read of requests and bookings, which a business without the front desk never makes.
- decided: `server/app.js` gains the `media-src` policy line here — why: without it the browser refuses to play a `blob:` recording or a stored one, and after wave 0 no plan may edit this file.
- decided: `gemini-2.5-flash` is marked as not reading PDF — why: its model page lists no PDF input; it is deprecated and rerouted on 2026-12-01.
- decided: when no model in the chain reads the medium the result stays `all_exhausted` with a warn log — why: a new failure kind would need a new branch in `respondFromGeminiFailure` (`server/routes/ai.js`, exported by plan 615 for the sub-routers), which is not this plan's file.
- decided: `audioSeconds` comes only from the caller (`usage.audioSeconds`) — why: the route knows the recording's length from the browser; deriving it from token counts would tie the ledger to a field of the model's answer that this plan could not verify.
- evidence: pnpm run test:server -> exit 0, 120 files, 1607 tests passed; pnpm --dir server run lint -> exit 0; pnpm run build -> exit 0; pnpm run lint -> exit 0. Signature examples a21ad0f6… and bfd09f95… reproduced in server/test/file-store.test.js.
- decided: kept 615's STORED_FILE_KINDS and added FILE_KINDS as an alias of it — why: the plan names FILE_KINDS, 615 exported the other name.
- decided: the download link is signed with the documented API rule; the page gives no other formula (the open item below) — a real call is the [human] G3 check.
- open for the Worker: the documentation pages give the download link's parameters and two example links but not its signing formula; the plan signs them with the documented API rule (what the provider's SDKs do). If the provider's page says otherwise at build time, follow the page and write the difference here.
- scope extended: docs/brain/component-families.md — approved by the Human (ask 619-1); four family headings (file-store, cloudinary-requests, business-delete, model-media) added; inventory.md regenerated. kit-checks → ok (6 checks).
