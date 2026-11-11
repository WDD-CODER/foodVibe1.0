const ZONE = 'Asia/Jerusalem'

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})

/** The wall clock of `epoch` in Jerusalem, read back as if it were UTC (for the offset). */
function wallAsUtc(epoch: number): number {
  const parts: Record<string, number> = {}
  for (const p of formatter.formatToParts(new Date(epoch))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return Date.UTC(parts['year'], parts['month'] - 1, parts['day'], parts['hour'], parts['minute'], parts['second'])
}

/** Epoch ms of the wall time `date` (YYYY-MM-DD) + `time` (HH:mm) in Asia/Jerusalem (DST-correct). */
export function jerusalemEpoch(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, 0)
  let guess = asUtc - (wallAsUtc(asUtc) - asUtc)
  // The offset at the first guess can differ across a DST change: correct once.
  guess = asUtc - (wallAsUtc(guess) - guess)
  return guess
}

/** Day of the week of a calendar date: Sunday = 0 … Saturday = 6 (no time zone). */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
