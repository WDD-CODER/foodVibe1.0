/**
 * Plan 675 (C-TEMPLATES): the closed list of messages a business may send outside the 24-hour window. Pure, no imports.
 * The names and the parameter order are registered at the provider later: never rename them.
 * The Hebrew body of each is a dictionary key (`bodyKey`); the server never holds a body.
 */

export interface MessageTemplateButton {
  prefix: string
  titleKey: string
}

export interface MessageTemplate {
  name: string
  params: readonly string[]
  bodyKey: string
  buttons?: readonly MessageTemplateButton[]
}

function tpl(name: string, params: string[], buttons?: MessageTemplateButton[]): MessageTemplate {
  return Object.freeze({
    name,
    params: Object.freeze(params),
    bodyKey: 'tpl_' + name,
    ...(buttons && { buttons: Object.freeze(buttons.map(b => Object.freeze(b))) })
  })
}

export const MESSAGE_TEMPLATES: Readonly<Record<string, MessageTemplate>> = Object.freeze({
  booking_confirmed: tpl('booking_confirmed', ['name', 'date', 'time', 'partySize']),
  booking_reminder: tpl('booking_reminder', ['name', 'time', 'partySize'], [
    { prefix: 'CONFIRM', titleKey: 'tpl_btn_confirm' },
    { prefix: 'CANCEL', titleKey: 'tpl_btn_cancel' }
  ]),
  booking_cancelled: tpl('booking_cancelled', ['name', 'date', 'time']),
  waitlist_table_ready: tpl('waitlist_table_ready', ['name']),
  request_received: tpl('request_received', ['name']),
  request_approved: tpl('request_approved', ['name']),
  request_declined: tpl('request_declined', ['name']),
  need_more_info: tpl('need_more_info', ['text'])
})

export const MESSAGE_TEMPLATE_NAMES: readonly string[] = Object.freeze(Object.keys(MESSAGE_TEMPLATES))

const ONE_LINE_MAX = 200

/** A parameter as one line (R-17): newlines and tabs become spaces, runs of spaces collapse, trimmed, cut at 200. */
export function oneLine(value: string): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, ONE_LINE_MAX)
}

function bad(message: string): Error {
  return Object.assign(new Error(message), { code: 'BAD_TEMPLATE' })
}

export interface TemplateMessage {
  name: string
  params: string[]
  buttons?: { id: string; title: string }[]
}

/** `{ name, params, buttons? }` for one template. Throws an Error with `code: 'BAD_TEMPLATE'`. */
export function templateMessage(name: string, values: Record<string, unknown> = {}, token?: string): TemplateMessage {
  const t = Object.prototype.hasOwnProperty.call(MESSAGE_TEMPLATES, name) ? MESSAGE_TEMPLATES[name] : undefined
  if (!t) throw bad('unknown template')
  const v = values ?? {}
  const params = t.params.map(p => {
    if (v[p] === undefined || v[p] === null) throw bad('missing template value: ' + p)
    return oneLine(String(v[p]))
  })
  const fromValues = v['token']
  const tok = token ?? (typeof fromValues === 'string' || typeof fromValues === 'number' ? String(fromValues) : '')
  if (!t.buttons) return { name, params }
  if (!tok) throw bad('template buttons need a token')
  return { name, params, buttons: t.buttons.map(b => ({ id: `${b.prefix}:${tok}`, title: b.titleKey })) }
}
