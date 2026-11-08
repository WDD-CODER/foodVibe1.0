import { Routes } from '@angular/router'

/**
 * Plan 535: the dev-only catalog route. It exists only when the build's `localDev` flag is true
 * (local, test and slot builds); production, remote and gh-pages builds register nothing.
 */
export function devCatalogRoutes(localDev: boolean): Routes {
  return localDev
    ? [{ path: 'dev/catalog', loadComponent: () => import('./dev-catalog.page').then((m) => m.DevCatalogPage) }]
    : []
}
