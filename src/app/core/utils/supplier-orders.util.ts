import type { EventPlan, RawLine } from '../engine/event-plan.types'
import { formatQty } from '../engine/rounding'
import type { Product } from '@models/product.model'
import type { Supplier } from '@models/supplier.model'

/** Plan 435 — one order per supplier, built from the engine plan. Plan 437 (print) and 444 (partial badge) read it too. */
export interface SupplierOrderCard {
  /** null on the "no supplier" card. */
  supplierId: string | null
  name: string
  phone: string | null
  lines: RawLine[]
  /** Sum of the known line costs; display only. */
  total: number
  /** True when at least one line has no cost. */
  partial: boolean
}

export interface SupplierOrders {
  /** Supplier cards by name, then the "no supplier" card last. Never contains review lines. */
  cards: SupplierOrderCard[]
  /** unlinked, no_conversion and deleted lines: never sendable. */
  review: RawLine[]
}

export interface OrderHeader {
  business: string
  eventName: string
  /** `YYYY-MM-DD`; empty or missing → the date part is left out. */
  eventDate?: string
}

type Translate = (key: string) => string

/** Right-to-left mark: keeps a line right-aligned in WhatsApp even when it starts with Latin text. */
const RLM = '\u200F'

function byName(a: string, b: string): number {
  return a.localeCompare(b, 'he')
}

/** The first of the supplier's numbers WhatsApp can open, else the first number written, else null. */
function pickPhone(supplier: Supplier): string | null {
  const numbers = [supplier.phone, supplier.phone2].map((p) => (p ?? '').trim()).filter((p) => p !== '')
  return numbers.find((p) => toWhatsAppPhone(p) !== null) ?? numbers[0] ?? null
}

function makeCard(supplierId: string | null, name: string, phone: string | null, lines: RawLine[]): SupplierOrderCard {
  const sorted = [...lines].sort((a, b) => byName(a.name, b.name))
  return {
    supplierId,
    name,
    phone,
    lines: sorted,
    total: sorted.reduce((sum, l) => sum + (l.lineCost ?? 0), 0),
    partial: sorted.some((l) => l.lineCost == null)
  }
}

export function buildSupplierOrders(
  plan: EventPlan,
  _productsById: Map<string, Product>, // reserved for the plan contract signature; unused
  suppliersById: Map<string, Supplier>,
  t: Translate = (key) => key
): SupplierOrders {
  const review: RawLine[] = []
  const bySupplier = new Map<string, RawLine[]>()
  const noSupplier: RawLine[] = []

  for (const line of plan.rawLines) {
    if (line.status !== 'ok') {
      review.push(line)
    } else if (line.supplierId && suppliersById.has(line.supplierId)) {
      const group = bySupplier.get(line.supplierId) ?? []
      group.push(line)
      bySupplier.set(line.supplierId, group)
    } else {
      noSupplier.push(line)
    }
  }

  const cards = [...bySupplier.entries()]
    .map(([id, lines]) => {
      const supplier = suppliersById.get(id) as Supplier
      return makeCard(id, supplier.nameHebrew, pickPhone(supplier), lines)
    })
    .sort((a, b) => byName(a.name, b.name))
  if (noSupplier.length > 0) cards.push(makeCard(null, t('no_supplier'), null, noSupplier))

  review.sort((a, b) => byName(a.name, b.name))
  return { cards, review }
}

/** Israeli mobile → WhatsApp number (`9725XXXXXXXX`), anything else → null. */
export function toWhatsAppPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (/^05\d{8}$/.test(digits)) return '972' + digits.slice(1)
  if (/^9725\d{8}$/.test(digits)) return digits
  return null
}

export function unitLabel(unit: string, t: Translate): string {
  return unit === 'unit' ? t('unit_short_unit') : t(unit)
}

export interface OrderLineView {
  name: string
  qty: number
  unit: string
  /** E.g. '2 ארגז'; empty when the line has no purchase unit. */
  purchase: string
}

/** One line as the screen and the message show it: engine rounding, short Hebrew units. */
export function describeOrderLine(line: RawLine, t: Translate): OrderLineView {
  const buy = formatQty(line.buyQty, line.unit)
  let purchase = ''
  if (line.purchase) {
    const p = formatQty(line.purchase.count, line.purchase.unit)
    purchase = `${p.qty} ${unitLabel(p.unit, t)}`
  }
  return { name: line.name, qty: buy.qty, unit: unitLabel(buy.unit, t), purchase }
}

function lineText(line: RawLine, t: Translate): string {
  const v = describeOrderLine(line, t)
  return RLM + v.name + ' – ' + v.qty + ' ' + v.unit + (v.purchase ? ' (' + v.purchase + ')' : '')
}

function formatDate(iso: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

function headerLines(header: OrderHeader, t: Translate): string[] {
  const date = formatDate(header.eventDate)
  const event = date ? `${header.eventName} · ${date}` : header.eventName
  return [
    RLM + t('order_msg_title').replace('{business}', header.business),
    RLM + t('order_msg_event').replace('{event}', event)
  ]
}

export function buildOrderMessage(header: OrderHeader, card: SupplierOrderCard, t: Translate): string {
  return [
    headerLines(header, t).join('\n'),
    card.lines.map((l) => lineText(l, t)).join('\n'),
    RLM + t('order_msg_thanks')
  ].join('\n\n')
}

/** Every card in one message: a name line per supplier, its lines, an empty line between cards. */
export function buildAllOrdersMessage(header: OrderHeader, cards: SupplierOrderCard[], t: Translate): string {
  const blocks = cards.map((c) => [RLM + c.name, ...c.lines.map((l) => lineText(l, t))].join('\n'))
  return [headerLines(header, t).join('\n'), ...blocks, RLM + t('order_msg_thanks')].join('\n\n')
}
