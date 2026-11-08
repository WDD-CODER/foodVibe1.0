import type { APIRequestContext, BrowserContext } from '@playwright/test'
import { pathToFileURL } from 'url'
import { resolve } from 'path'

interface QaLogin {
  loginQa(o: { api: string; userKey: string; passKey: string }): Promise<unknown>
  seedQaContext(context: BrowserContext, session: unknown, app: string): Promise<void>
  qaCredential(key: string): string
}

// Playwright compiles specs to CommonJS and cannot require() the .mjs helper, so load it with a native import().
const nativeImport = new Function('u', 'return import(u)') as (u: string) => Promise<QaLogin>
const loadLogin = () => nativeImport(pathToFileURL(resolve(__dirname, '../../scripts/qa/lib/qa-login.mjs')).href)

export interface QaSession {
  token: string
  user: { name: string; [k: string]: unknown }
}

const apiOf = (api?: string) => (api ?? process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

/** Signs a browser context in as the QA user (ORCH_QA_USER/PASSWORD, else QA_USER/QA_PASS). Never prints credentials. */
export async function signInQa(context: BrowserContext, opts: { api?: string; app?: string } = {}): Promise<QaSession> {
  const { loginQa, seedQaContext, qaCredential } = await loadLogin()
  const orch = qaCredential('ORCH_QA_USER') && qaCredential('ORCH_QA_PASSWORD')
  const userKey = orch ? 'ORCH_QA_USER' : 'QA_USER'
  const passKey = orch ? 'ORCH_QA_PASSWORD' : 'QA_PASS'
  if (!qaCredential(userKey) || !qaCredential(passKey)) {
    throw new Error('QA credentials not set (ORCH_QA_USER / ORCH_QA_PASSWORD or QA_USER / QA_PASS)')
  }
  const session = (await loginQa({ api: apiOf(opts.api), userKey, passKey })) as QaSession
  await seedQaContext(context, session, opts.app ?? process.env['E2E_APP_URL'] ?? 'http://localhost:4200')
  return session
}

async function check(res: { ok(): boolean; status(): number; text(): Promise<string> }, what: string) {
  if (res.ok()) return
  let msg = ''
  try {
    msg = await res.text()
  } catch {
    /* ignore */
  }
  throw new Error(`${what} failed: HTTP ${res.status()} ${msg.slice(0, 300)}`)
}

/** Creates a throwaway menu event and returns its _id. */
export async function createQaEvent(
  request: APIRequestContext,
  session: QaSession,
  overrides: Record<string, unknown> = {},
  api?: string
): Promise<string> {
  const base = apiOf(api)
  const headers = { authorization: `Bearer ${session.token}` }
  const termsRes = await request.get(`${base}/api/v1/data/taxonomyTerms`, { headers })
  await check(termsRes, 'taxonomyTerms')
  const body = await termsRes.json()
  const terms: { kind: string; key: string }[] = Array.isArray(body) ? body : (body.data ?? body.items ?? [])
  const eventType = terms.find((t) => t.kind === 'eventType')?.key
  const servingType = terms.find((t) => t.kind === 'menuType')?.key
  if (!eventType || !servingType) throw new Error('createQaEvent: no eventType / menuType taxonomy term found')
  const res = await request.post(`${base}/api/v1/data/menuEvents`, {
    headers,
    data: { name: 'E2E ' + Date.now(), eventType, servingType, guestCount: 50, sections: [], ...overrides }
  })
  await check(res, 'create event')
  const created = await res.json()
  return (created._id ?? created.data?._id) as string
}

/** Deletes an event created by createQaEvent. */
export async function deleteQaEvent(request: APIRequestContext, session: QaSession, id: string, api?: string): Promise<void> {
  const res = await request.delete(`${apiOf(api)}/api/v1/data/menuEvents/${id}`, {
    headers: { authorization: `Bearer ${session.token}` }
  })
  await check(res, 'delete event')
}
