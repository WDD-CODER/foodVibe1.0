/** Horizontal-swipe detection shared by the carousel header and cells (plan 349). */
export const SWIPE_THRESHOLD_PX = 40

export interface SwipeStart {
  x: number
  y: number
}

/**
 * 'next' / 'prev' for a finished horizontal swipe, or null (too short, or mostly vertical — so
 * vertical scrolling is never hijacked). In RTL "next" lies to the left, so dragging the
 * content to the right (positive dx) reveals it; in LTR it's the opposite.
 */
export function swipeDirection(start: SwipeStart, endX: number, endY: number, rtl: boolean): 'next' | 'prev' | null {
  const dx = endX - start.x
  const dy = endY - start.y
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return null
  const towardsNext = rtl ? dx > 0 : dx < 0
  return towardsNext ? 'next' : 'prev'
}

/** True when the element renders right-to-left. */
export function isRtl(el: HTMLElement): boolean {
  return getComputedStyle(el).direction === 'rtl'
}

/** The carousel only exists at ≤768px; on desktop the slides are plain grid cells. */
export const CAROUSEL_MEDIA_QUERY = '(max-width: 768px)'

export function isCarouselActive(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(CAROUSEL_MEDIA_QUERY).matches
}
