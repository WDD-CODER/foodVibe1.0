import { devCatalogRoutes } from './dev-catalog.routes'

describe('devCatalogRoutes', () => {
  it('registers dev/catalog when localDev is true', () => {
    const routes = devCatalogRoutes(true)
    expect(routes.length).toBe(1)
    expect(routes[0].path).toBe('dev/catalog')
  })

  it('registers nothing when localDev is false', () => {
    expect(devCatalogRoutes(false)).toEqual([])
  })
})
