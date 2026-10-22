/** Gap between the anchor and the panel, and the breathing room kept against every viewport edge. */
export const PLACEMENT_GAP_PX = 8
export const PLACEMENT_MARGIN_PX = 8
/** Smallest height a panel is squeezed to before it stops shrinking. */
export const PLACEMENT_MIN_HEIGHT_PX = 80

export interface PlacementAnchor {
  top: number
  bottom: number
  left: number
  width: number
}

export interface PlacementInput {
  /** The element the panel points at, in viewport coordinates (`getBoundingClientRect`). */
  anchor: PlacementAnchor
  /** The panel's natural size (its full height, even when its content is scrolled). */
  panel: { width: number; height: number }
  viewport: { width: number; height: number }
  /** Side tried first; the panel flips only when that side cannot fit and the other is roomier. */
  prefer?: 'above' | 'below'
}

export interface PlacementResult {
  top: number
  left: number
  /** True when the panel sits under the anchor. */
  below: boolean
  /** Set when the panel is taller than the room it has; null when it fits as is. */
  maxHeight: number | null
  /** Horizontal centre of the anchor, in viewport coordinates (for an arrow that keeps pointing at it). */
  anchorCenterX: number
}

/**
 * Where a floating panel goes so it stays fully inside the viewport. Pure: flips above/below from the
 * measured height, caps the height when neither side fits, then clamps top and left to the viewport.
 */
export function placeInViewport(input: PlacementInput): PlacementResult {
  const { anchor, panel, viewport, prefer = 'above' } = input
  const roomAbove = anchor.top - PLACEMENT_MARGIN_PX
  const roomBelow = viewport.height - anchor.bottom - PLACEMENT_MARGIN_PX
  const needed = panel.height + PLACEMENT_GAP_PX

  const below =
    prefer === 'above' ? roomAbove < needed && roomBelow > roomAbove : !(roomBelow < needed && roomAbove > roomBelow)

  const room = Math.max(PLACEMENT_MIN_HEIGHT_PX, Math.floor((below ? roomBelow : roomAbove) - PLACEMENT_GAP_PX))
  const height = Math.min(panel.height, room)

  const wantedTop = below ? anchor.bottom + PLACEMENT_GAP_PX : anchor.top - PLACEMENT_GAP_PX - height
  const top = Math.max(PLACEMENT_MARGIN_PX, Math.min(viewport.height - PLACEMENT_MARGIN_PX - height, wantedTop))

  const anchorCenterX = anchor.left + anchor.width / 2
  const left = Math.max(
    PLACEMENT_MARGIN_PX,
    Math.min(viewport.width - PLACEMENT_MARGIN_PX - panel.width, anchorCenterX - panel.width / 2)
  )

  return { top, left, below, maxHeight: height < panel.height ? height : null, anchorCenterX }
}
