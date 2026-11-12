/**
 * Makes `window.matchMedia('(pointer: coarse)')` report false for the current spec, so a component that switches to a
 * touch UI (e.g. `app-date-field`) behaves the same on a PC with a touch input. Other queries go to what
 * `matchMedia` did before (the real one, or an existing spy's fake).
 */
export function stubFinePointer(): void {
  const isCoarse = (query: string) => query.includes('pointer') && query.includes('coarse')
  const current = window.matchMedia
  if (jasmine.isSpy(current)) {
    const strategy = (current as jasmine.Spy).and as unknown as { plan?: (q: string) => MediaQueryList }
    const previous = strategy.plan?.bind(strategy) ?? (current as unknown as { and: { getOriginal: () => typeof window.matchMedia } }).and.getOriginal().bind(window)
    ;(current as jasmine.Spy).and.callFake((query: string) =>
      isCoarse(query) ? ({ matches: false, media: query } as MediaQueryList) : previous(query)
    )
    return
  }
  const real = current.bind(window)
  spyOn(window, 'matchMedia').and.callFake((query: string) =>
    isCoarse(query) ? ({ matches: false, media: query } as MediaQueryList) : real(query)
  )
}
