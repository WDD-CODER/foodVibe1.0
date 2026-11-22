/**
 * The one breakpoint set (default `one-breakpoint-set`, plan 656): phone up to 767px, tablet 768–1023px,
 * desktop from 1024px. The same values are the Sass names at the top of src/styles.scss and in
 * src/app/core/styles/_breakpoints.scss; breakpoints.spec.ts and scripts/test/breakpoints-no-literals.test.mjs
 * keep them equal. No other `.ts` file under src/app types a media width.
 */
export const PHONE_MAX = 767
export const TABLET_MAX = 1023

/** Phone: up to 767px. */
export const PHONE_QUERY = `(max-width: ${PHONE_MAX}px)`
/** Phone and tablet (below desktop): up to 1023px. */
export const TABLET_DOWN_QUERY = `(max-width: ${TABLET_MAX}px)`
/** Desktop: from 1024px. */
export const DESKTOP_QUERY = `(min-width: ${TABLET_MAX + 1}px)`
