/**
 * Columns a list declares so its container can decide, by measured width, which ones fit as their own
 * cell and which fall into the one switching (carousel) column (plan 745). Pure: no DOM.
 */
export interface ListColumn {
  id: string
  /** Grid track when the column is its own cell. */
  track: string
  /** Least width the column needs (`rem` or `px`). */
  min: string
  /** Replaces `track` at phone width. */
  phoneTrack?: string
  /** Replaces `min` at phone width. */
  phoneMin?: string
  /** A positive number marks a column that may fall; 1 falls first. No `fall` = never falls. */
  fall?: number
  /** Dropped on a phone with no hover (the checkbox column). */
  hideOnTouchPhone?: boolean
}

export interface FitColumnsOptions {
  /** Width of the list in px. */
  available: number
  /** Root font size in px (for `rem`). */
  rem: number
  /** Grid column gap in px. */
  gap: number
  phone: boolean
  touchPhone: boolean
  carouselTrack?: string
  carouselMin?: string
}

export interface FitColumnsResult {
  /** Ids of the columns inside the switching column, in fall order. */
  collapsed: string[]
  /** `grid-template-columns` value. */
  template: string
}

export const DEFAULT_CAROUSEL_TRACK = 'minmax(7rem, 1.6fr)'
export const DEFAULT_CAROUSEL_MIN = '7rem'

/** `4rem` / `80px` → px. */
export function toPx(value: string, rem: number): number {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 0
  return /rem\s*$/.test(value) ? n * rem : n
}

interface Shown {
  col: ListColumn
  track: string
  min: number
  index: number
}

export function fitColumns(columns: readonly ListColumn[], opts: FitColumnsOptions): FitColumnsResult {
  const carouselTrack = opts.carouselTrack ?? DEFAULT_CAROUSEL_TRACK
  const carouselMin = toPx(opts.carouselMin ?? DEFAULT_CAROUSEL_MIN, opts.rem)

  const shown: Shown[] = columns
    .filter((c) => !(opts.touchPhone && c.hideOnTouchPhone))
    .map((col, index) => ({
      col,
      index,
      track: opts.phone && col.phoneTrack ? col.phoneTrack : col.track,
      min: toPx(opts.phone && col.phoneMin ? col.phoneMin : col.min, opts.rem)
    }))

  const fallable = shown.filter((s) => (s.col.fall ?? 0) > 0)
  const collapsedList: Shown[] = []

  const need = (): number => {
    const own = shown.filter((s) => !collapsedList.includes(s))
    const hasCarousel = collapsedList.length > 0
    const count = own.length + (hasCarousel ? 1 : 0)
    const sum = own.reduce((acc, s) => acc + s.min, 0) + (hasCarousel ? carouselMin : 0)
    return sum + opts.gap * Math.max(0, count - 1)
  }

  const nextToFall = (): Shown | undefined => {
    const left = fallable.filter((s) => !collapsedList.includes(s))
    // lowest `fall` first; on a tie the later column in the list
    left.sort((a, b) => (a.col.fall as number) - (b.col.fall as number) || b.index - a.index)
    return left[0]
  }

  if (fallable.length >= 2) {
    while (need() > opts.available) {
      const next = nextToFall()
      if (!next) break
      collapsedList.push(next)
      if (collapsedList.length === 1) {
        const second = nextToFall()
        if (second) collapsedList.push(second)
      }
    }
  }

  const tracks: string[] = []
  const firstCollapsedIndex = Math.min(...collapsedList.map((s) => s.index))
  for (const s of shown) {
    if (collapsedList.includes(s)) {
      if (s.index === firstCollapsedIndex) tracks.push(carouselTrack)
      continue
    }
    tracks.push(s.track)
  }

  return { collapsed: collapsedList.map((s) => s.col.id), template: tracks.join(' ') }
}
