/**
 * Plan sections a script reads: one `## <heading>` section whose rows are written as bullets or as a table.
 *
 *   sectionRows(planText, 'Reuse Check', ['piece', 'family', 'rung', 'why'])
 *   // → { present, rows: [{ piece, family, rung, why } | { none: true, why }], errors: [] }
 *
 * Bullet form: `- <first column> — <key>: <value> — <key>: <value>` (the separators are —, ·, | or a spaced - / --).
 * Table form: a header row names the columns; a header cell matches a column when it equals it or contains it
 * ("New piece" is the `piece` column). Both forms give the same row objects: every column is a string ('' when absent).
 * `- none — <why>` (or a table row starting with none) is `{ none: true, why }`: an empty declaration with its reason.
 * A column the caller did not name is refused: `errors` holds one line naming it. Used by `--reuse` and
 * `--defaults`.
 */

const SEP = /\s+(?:—|·|\||--?)\s+/

/** The body of the `## <heading>` section, or null. */
export function sectionBody(planText, heading) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = String(planText).match(new RegExp(`^## ${esc}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))
  return m ? m[1] : null
}

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

function noneRow(text) {
  return { none: true, why: text.replace(/^none\s*[—·:|-]*\s*/i, '').trim() }
}

function blank(columns) {
  return Object.fromEntries(columns.map((c) => [c, '']))
}

function bulletRow(text, columns, errors) {
  if (/^none\b/i.test(text)) return noneRow(text)
  const [lead, ...rest] = text.split(SEP)
  const row = blank(columns)
  row[columns[0]] = lead.trim()
  let last = columns[0]
  for (const seg of rest) {
    const m = seg.match(/^([A-Za-z][\w ]*?)\s*:\s*(.*)$/)
    if (!m) {
      row[last] = `${row[last]} — ${seg.trim()}`.replace(/^ — /, '')
      continue
    }
    const key = m[1].trim().toLowerCase()
    if (!columns.includes(key)) {
      errors.push(`unknown column "${m[1].trim()}" in: ${text}`)
      continue
    }
    row[key] = m[2].trim()
    last = key
  }
  return row
}

/** { present, rows, errors } for one section; present is false when the plan has no such heading. */
export function sectionRows(planText, heading, columns) {
  const body = sectionBody(planText, heading)
  if (body === null) return { present: false, rows: [], errors: [] }
  const rows = []
  const errors = []
  let map = null // table: index -> column (or null for an unknown header)
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('|')) {
      const c = cells(line)
      if (c.every((x) => /^:?-{2,}:?$/.test(x))) continue
      if (!map) {
        map = c.map((h) => {
          const k = h.toLowerCase()
          const col = columns.find((x) => x === k) ?? columns.find((x) => k.includes(x))
          if (!col) errors.push(`unknown column "${h}" in the ${heading} table`)
          return col ?? null
        })
        continue
      }
      if (/^none\b/i.test(c[0])) {
        rows.push({ none: true, why: c.slice(1).join(' ').trim() })
        continue
      }
      const row = blank(columns)
      c.forEach((v, i) => { if (map[i]) row[map[i]] = v })
      rows.push(row)
      continue
    }
    const b = line.match(/^[-*]\s+(.*)$/)
    if (b) rows.push(bulletRow(b[1], columns, errors))
  }
  return { present: true, rows, errors }
}
