'use strict'
/**
 * Plan 583 A3: read one chain's full price file (the XML every Israeli chain must publish) into plain items.
 * No XML package: the files are flat `<Item>` (or `<Product>`) records of simple text elements, read
 * case-insensitively. Element names found are recorded so a chain that differs can be seen.
 */

const zlib = require('node:zlib')

const decode = s => s
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&')
  .trim()

/** Gunzips when the bytes are gzip, drops a BOM, returns text. */
function fileText(buffer) {
  const raw = buffer[0] === 0x1f && buffer[1] === 0x8b ? zlib.gunzipSync(buffer) : buffer
  return raw.toString('utf8').replace(/^﻿/, '')
}

const RECORD = /<(item|product)>([\s\S]*?)<\/\1>/gi
const FIELD = /<([A-Za-z_][\w]*)\s*(?:\/>|>([\s\S]*?)<\/\1>)/g

function num(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

/**
 * @returns {{ items: Array<{ code: string, name: string, manufacturer: string, quantity: number | null,
 *   unit: string, unitOfMeasure: string, isWeighted: boolean, price: number | null, unitPrice: number | null }>,
 *   fields: string[] }}
 */
function parsePriceXml(text) {
  const items = []
  const fields = new Set()
  for (const rec of text.matchAll(RECORD)) {
    const f = {}
    for (const m of rec[2].matchAll(FIELD)) {
      fields.add(m[1])
      f[m[1].toLowerCase()] = m[2] === undefined ? '' : decode(m[2])
    }
    const name = f.itemname || f.manufactureitemdescription || ''
    if (!name) continue
    items.push({
      code: f.itemcode ?? '',
      name,
      manufacturer: f.manufacturename ?? '',
      quantity: num(f.quantity),
      unit: f.unitqty ?? '',
      unitOfMeasure: f.unitofmeasure ?? '',
      isWeighted: f.bisweighted === '1' || /^true$/i.test(f.bisweighted ?? ''),
      price: num(f.itemprice),
      unitPrice: num(f.unitofmeasureprice)
    })
  }
  return { items, fields: [...fields].sort() }
}

module.exports = { fileText, parsePriceXml }
