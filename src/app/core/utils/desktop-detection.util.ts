import { Signal, afterNextRender, signal } from '@angular/core'

/** Row edit panel vs modal split (plan 305 decision 2) — matches $break-tablet-max in styles.scss. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Tracks whether the viewport is at desktop width. Used to switch a screen's row-edit
 * UI between the old inline expanding panel (desktop) and a modal (tablet + mobile) —
 * plan 305 M4 decision 2, not a general-purpose responsive helper.
 *
 * Same synchronous-read + afterNextRender-listener shape as `useResponsivePanelState`
 * (panel-preference.util.ts) and for the same reason: the initial value must be correct
 * before first paint, not corrected a frame later, or the wrong edit UI flashes briefly.
 *
 * Must be called synchronously from a component constructor.
 */
export function useIsDesktop(): Signal<boolean> {
  const isDesktop_ = signal(typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches)

  afterNextRender(() => {
    if (typeof window === 'undefined') return
    const q = window.matchMedia(DESKTOP_QUERY)
    q.addEventListener('change', (e) => isDesktop_.set(e.matches))
  })

  return isDesktop_.asReadonly()
}
