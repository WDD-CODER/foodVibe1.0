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
  /**
   * A positive number ranks the order a column falls into the switching column; 1 falls first. A column with
   * no `fall` falls after all the ranked ones, the later one in the list first (plan 747).
   */
  fall?: number
  /** Never falls: the name and the actions (plan 747). */
  stay?: boolean
  /**
   * The checkbox column: dropped on a phone with no hover, and dropped (never put in the switching column)
   * when there is no room for it.
   */
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
  /** Ids of the checkbox columns dropped for lack of room (not in the template). */
  dropped: string[]
  /** `grid-template-columns` value. */
  template: string
}

export const DEFAULT_CAROUSEL_TRACK = 'minmax(7rem, 1.6fr)'
export const DEFAULT_CAROUSEL_MIN = '7rem'

/** A track that is a plain `fr` share gets its `min` as a floor, so the grid never squeezes a cell below it. */
function floored(track: string, min: string): string {
  return /^\d*\.?\d+fr$/.test(track.trim()) ? `minmax(${min}, ${track.trim()})` : track
}

/** `4rem` / `80px` → px. */
export function toPx(value: string, rem: number): number {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 0
  return /rem\s*$/.test(value) ? n * rem : n
}

interface Shown {
  col: ListColumn
  track: string
  minText: string
  min: number
  index: number
}

export function fitColumns(columns: readonly ListColumn[], opts: FitColumnsOptions): FitColumnsResult {
  const carouselMinText = opts.carouselMin ?? DEFAULT_CAROUSEL_MIN
  const carouselTrack = opts.carouselTrack ?? `minmax(${carouselMinText}, 1.6fr)`
  const carouselMin = toPx(carouselMinText, opts.rem)

  const shown: Shown[] = columns
    .filter((c) => !(opts.touchPhone && c.hideOnTouchPhone))
    .map((col, index) => {
      const minText = opts.phone && col.phoneMin ? col.phoneMin : col.min
      return {
        col,
        index,
        minText,
        track: opts.phone && col.phoneTrack ? col.phoneTrack : col.track,
        min: toPx(minText, opts.rem)
      }
    })

  // Fall order (plan 747): the ranked columns first (lowest `fall` first, on a tie the later column), then
  // the un-ranked ones from the end of the list. A `stay` column is never in it.
  const candidates = shown.filter((s) => !s.col.stay)
  const ranked = candidates
    .filter((s) => (s.col.fall ?? 0) > 0)
    .sort((a, b) => (a.col.fall as number) - (b.col.fall as number) || b.index - a.index)
  const unranked = candidates.filter((s) => !((s.col.fall ?? 0) > 0)).sort((a, b) => b.index - a.index)
  const order = [...ranked, ...unranked]

  const collapsedList: Shown[] = []
  const droppedList: Shown[] = []

  const need = (): number => {
    const own = shown.filter((s) => !collapsedList.includes(s) && !droppedList.includes(s))
    const hasCarousel = collapsedList.length > 0
    const count = own.length + (hasCarousel ? 1 : 0)
    const sum = own.reduce((acc, s) => acc + s.min, 0) + (hasCarousel ? carouselMin : 0)
    return sum + opts.gap * Math.max(0, count - 1)
  }

  // The checkbox column has no value to show in a carousel: when its turn comes it is dropped. Dropping it is a
  // step of its own: the room is checked again before the next column is taken.
  let cursor = 0

  // A switching column of one column is pointless: it needs two to start.
  if (order.filter((s) => !s.col.hideOnTouchPhone).length >= 2) {
    while (need() > opts.available && cursor < order.length) {
      const next = order[cursor++]
      if (next.col.hideOnTouchPhone) {
        droppedList.push(next)
        continue
      }
      collapsedList.push(next)
      if (collapsedList.length === 1) {
        // The partner of the first fallen column: the next one in the order that is not the checkbox.
        const partnerAt = order.findIndex((s, i) => i >= cursor && !s.col.hideOnTouchPhone)
        if (partnerAt !== -1) {
          for (let i = cursor; i < partnerAt; i++) droppedList.push(order[i])
          collapsedList.push(order[partnerAt])
          cursor = partnerAt + 1
        }
      }
    }
  }

  const tracks: string[] = []
  const firstCollapsedIndex = Math.min(...collapsedList.map((s) => s.index))
  for (const s of shown) {
    if (droppedList.includes(s)) continue
    if (collapsedList.includes(s)) {
      if (s.index === firstCollapsedIndex) tracks.push(carouselTrack)
      continue
    }
    tracks.push(floored(s.track, s.minText))
  }

  return {
    collapsed: collapsedList.map((s) => s.col.id),
    dropped: droppedList.map((s) => s.col.id),
    template: tracks.join(' ')
  }
}
