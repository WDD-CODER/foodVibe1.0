/**
 * The one breakpoint set (default `one-breakpoint-set`, plan 656): phone up to 767px, tablet 768–1023px,
 * desktop from 1024px, and one narrow step inside the phone range, up to 419px (plan 763). The same values are the Sass names at the top of src/styles.scss and in
 * src/app/core/styles/_breakpoints.scss; breakpoints.spec.ts and scripts/test/breakpoints-no-literals.test.mjs
 * keep them equal. No other `.ts` file under src/app types a media width.
 */
export const PHONE_NARROW_MAX = 419
export const PHONE_MAX = 767
export const TABLET_MAX = 1023

/** Narrow phone (plan 763): up to 419px, the narrow step inside the phone range. */
export const PHONE_NARROW_QUERY = `(max-width: ${PHONE_NARROW_MAX}px)`
/** Phone: up to 767px. */
export const PHONE_QUERY = `(max-width: ${PHONE_MAX}px)`
/** Phone and tablet (below desktop): up to 1023px. */
export const TABLET_DOWN_QUERY = `(max-width: ${TABLET_MAX}px)`
/** Desktop: from 1024px. */
export const DESKTOP_QUERY = `(min-width: ${TABLET_MAX + 1}px)`
