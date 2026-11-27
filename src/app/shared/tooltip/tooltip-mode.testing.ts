import { PHONE_QUERY } from 'src/app/core/utils/breakpoints'

/** How the shared tooltip sees the screen: a phone width, a touch screen with no hover, or a hovering pointer. */
export type TooltipTestMode = 'phone' | 'no-hover' | 'hover'

/**
 * Specs only: makes the shared tooltip see the given screen, whatever the test browser's window is. Only the two
 * media queries the tooltip reads are faked; call the returned function to change the mode inside a test.
 */
export function mockTooltipMode(initial: TooltipTestMode): (mode: TooltipTestMode) => void {
  let mode = initial
  const real = window.matchMedia.bind(window)
  spyOn(window, 'matchMedia').and.callFake((query: string): MediaQueryList => {
    if (query !== PHONE_QUERY && query !== '(hover: none)') return real(query)
    const matches = query === PHONE_QUERY ? mode === 'phone' : mode === 'no-hover'
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {}
    } as unknown as MediaQueryList
  })
  return (next) => {
    mode = next
  }
}
