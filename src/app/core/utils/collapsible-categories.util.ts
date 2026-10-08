import { DestroyRef, inject, signal } from '@angular/core'

/** Matches list-shell's `$panel-overlay-break` — below this the filter panel stacks full-width. */
export const COLLAPSIBLE_MOBILE_QUERY = '(max-width: 1023px)'

export interface CollapsibleCategoriesOptions {
  /** Category names that start collapsed on desktop (everything else starts expanded there). */
  desktopCollapsed?: string[]
}

export interface CollapsibleCategories {
  isExpanded: (name: string) => boolean
  toggle: (name: string) => void
  /** Expands `name` when it has an active selection; a no-op otherwise. */
  expandIfActive: (name: string, hasActive: boolean) => void
}

/**
 * Filter-panel category open/closed state for list pages.
 *
 * Mobile (≤1023px): every category starts collapsed — tracks the *expanded* names.
 * Desktop: every category starts expanded except `desktopCollapsed` — tracks the *collapsed* names.
 * The mode follows the viewport across breakpoint crossings.
 *
 * The initial mobile check is synchronous (no afterNextRender) so the first paint on a phone
 * is already collapsed — same reasoning as `useResponsivePanelState`; see docs/brain/gotchas.md.
 *
 * Must be called in an injection context (field initializer or constructor).
 */
export function useCollapsibleCategories(opts: CollapsibleCategoriesOptions = {}): CollapsibleCategories {
  const destroyRef = inject(DestroyRef)
  const mql =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(COLLAPSIBLE_MOBILE_QUERY)
      : null

  const isMobile_ = signal<boolean>(mql?.matches ?? false)
  const mobileExpanded_ = signal<Set<string>>(new Set())
  const desktopCollapsed_ = signal<Set<string>>(new Set(opts.desktopCollapsed ?? []))

  if (mql) {
    const onChange = (e: MediaQueryListEvent): void => isMobile_.set(e.matches)
    mql.addEventListener('change', onChange)
    destroyRef.onDestroy(() => mql.removeEventListener('change', onChange))
  }

  const isExpanded = (name: string): boolean =>
    isMobile_() ? mobileExpanded_().has(name) : !desktopCollapsed_().has(name)

  const toggle = (name: string): void => {
    const target = isMobile_() ? mobileExpanded_ : desktopCollapsed_
    target.update((set) => {
      const next = new Set(set)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const expandIfActive = (name: string, hasActive: boolean): void => {
    if (!hasActive) return
    if (!mobileExpanded_().has(name)) mobileExpanded_.update((set) => new Set(set).add(name))
    if (desktopCollapsed_().has(name)) {
      desktopCollapsed_.update((set) => {
        const next = new Set(set)
        next.delete(name)
        return next
      })
    }
  }

  return { isExpanded, toggle, expandIfActive }
}
