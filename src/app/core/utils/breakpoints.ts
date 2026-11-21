/**
 * The one breakpoint set (default `one-breakpoint-set`, plan 656): phone up to 767px, tablet up to 1023px,
 * desktop from 1024px. The styles use the same values through src/app/core/styles/_breakpoints.scss
 * breakpoints.spec.ts keeps the two in step. No other `.ts` file types a width.
 */
export const PHONE_MAX = 767
export const TABLET_MAX = 1023

/** Phone: up to 767px. */
export const PHONE_QUERY = '(max-width: 767px)'
/** Phone and tablet: up to 1023px (below desktop). */
export const TABLET_DOWN_QUERY = '(max-width: 1023px)'
/** Desktop: from 1024px. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
