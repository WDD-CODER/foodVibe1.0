import { HttpErrorResponse } from '@angular/common/http'
import { API } from '@services/http-storage.adapter'

export interface ServerIssue {
  path: string
  code: string
  message: string
}

export interface ServerRefusal {
  issues: ServerIssue[]
  error: string
}

const DATA_API_PATH = API.data('')

/** Top-level schema field -> dictionary label key of the field the chef sees. */
export const PATH_LABEL_KEYS: Readonly<Record<string, string>> = {
  nameHebrew: 'name',
  baseUnit: 'base_unit',
  category: 'category',
  categories: 'category',
  purchaseOptions: 'purchase_units_section',
  yieldAmount: 'yield',
  yieldUnit: 'unit',
  phone: 'phone',
  contactPerson: 'contact_person',
  deliveryDays: 'delivery_days',
  leadTimeDays: 'lead_time',
  minOrderMov: 'min_order',
  ownedQuantity: 'owned_quantity',
  notes: 'notes',
  environmentType: 'environment_type'
}

function firstSegment(path: string): string {
  return String(path ?? '').split('.')[0]
}

function isDataApi(err: HttpErrorResponse): boolean {
  return typeof err.url === 'string' && err.url.includes(DATA_API_PATH)
}

/** A data-API 400 (the server's strict schema check) as `{ issues, error }`; anything else is null. */
export function readServerRefusal(err: unknown): ServerRefusal | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400 || !isDataApi(err)) return null
  const body = (err.error ?? {}) as { error?: unknown; issues?: unknown }
  const issues = Array.isArray(body.issues)
    ? body.issues.map((raw) => {
        const i = (raw ?? {}) as Partial<ServerIssue>
        return { path: String(i.path ?? ''), code: String(i.code ?? ''), message: String(i.message ?? '') }
      })
    : []
  return { issues, error: typeof body.error === 'string' ? body.error : '' }
}

/** True for exactly the answers the interceptor already toasted (data-API 400, 403 no_permission, data-API 429). */
export function refusalShownToUser(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false
  if (err.status === 400) return isDataApi(err)
  if (err.status === 429) return isDataApi(err)
  if (err.status === 403) return err.error?.messageKey === 'no_permission'
  return false
}

/** The toast text of a refused save: the labelled fields, a "contact support" text, or the generic one. */
export function saveRefusalMessage(refusal: ServerRefusal, translator: { translate(key: string): string }): string {
  const labelKeys = refusal.issues.map((i) => PATH_LABEL_KEYS[firstSegment(i.path)]).filter((k): k is string => !!k)
  if (labelKeys.length > 0) {
    const labels = [...new Set(labelKeys)].map((k) => translator.translate(k))
    return translator.translate('save_refused_fields').replace('{{fields}}', labels.join(', '))
  }
  return translator.translate(refusal.issues.length > 0 ? 'save_refused_hidden' : 'save_refused_generic')
}

/** Refused issues on mapped fields -> the form's `validationErrors_` entries (formKey -> translation key). */
export function serverFieldErrors(err: unknown, fieldMap: Record<string, string>): Record<string, string> {
  const refusal = readServerRefusal(err)
  const out: Record<string, string> = {}
  if (!refusal) return out
  for (const issue of refusal.issues) {
    const formKey = fieldMap[firstSegment(issue.path)]
    if (!formKey || !issue.path) continue
    out[formKey] =
      issue.code === 'too_big'
        ? 'server_field_too_long'
        : issue.code === 'invalid_type' && issue.message.includes('received undefined')
          ? 'field_required'
          : 'server_field_invalid'
  }
  return out
}
