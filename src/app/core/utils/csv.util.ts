/** Plan 557: a pure CSV builder (RFC 4180) and the download step; Excel opens the UTF-8 BOM file in Hebrew. */

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

const BOM = '\uFEFF'
const FORMULA_START = /^[=+\-@]/

/** One cell: a leading `'` when it could run as a spreadsheet formula, quotes when it holds a comma, quote or break. */
function cell(raw: string | number | null | undefined): string {
  let text = raw === null || raw === undefined ? '' : String(raw)
  if (FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Header row plus one row per record, `\r\n` between rows, the UTF-8 BOM first. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')]
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}

/** Saves `text` as a file through a temporary object URL (revoked after the click). */
export function downloadCsv(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
