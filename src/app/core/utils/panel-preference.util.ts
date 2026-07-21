import { signal, afterNextRender, WritableSignal } from '@angular/core'

const STORAGE_PREFIX = 'list-panel:'
const MOBILE_QUERY = '(max-width: 768px)'

/**
 * Reads the saved "panel open" state for a given context (e.g. 'inventory', 'venues').
 * Defaults to true if missing or invalid so lists start with the filter panel open.
 */
export function getPanelOpen(context: string): boolean {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PREFIX + context) : null
    if (raw === null) return true
    const value = JSON.parse(raw)
    return value === true
  } catch {
    return true
  }
}

/**
 * Persists the "panel open" state for a given context so it is restored when the user returns.
 */
export function setPanelOpen(context: string, open: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PREFIX + context, JSON.stringify(open))
    }
  } catch {
    /* ignore */
  }
}

export interface ResponsivePanelState {
  isPanelOpen_: WritableSignal<boolean>
  togglePanel: () => void
}

/**
 * Composes the filter-panel "open" signal for a list page: seeds it from the
 * persisted desktop preference, forces it closed on initial mobile load and
 * on every crossing into mobile width, and restores the persisted preference
 * when the viewport crosses back to desktop.
 *
 * Must be called synchronously from a component constructor — it relies on
 * afterNextRender's ambient injection context, same as calling inject()
 * directly in a field initializer.
 */
export function useResponsivePanelState(context: string): ResponsivePanelState {
  const isPanelOpen_ = signal<boolean>(getPanelOpen(context))

  afterNextRender(() => {
    if (typeof window === 'undefined') return
    const q = window.matchMedia(MOBILE_QUERY)
    if (q.matches) isPanelOpen_.set(false)
    q.addEventListener('change', (e) => {
      isPanelOpen_.set(e.matches ? false : getPanelOpen(context))
    })
  })

  const togglePanel = (): void => {
    isPanelOpen_.update((v) => !v)
    setPanelOpen(context, isPanelOpen_())
  }

  return { isPanelOpen_, togglePanel }
}
