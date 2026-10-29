import type { Route } from '@angular/router'
import { pendingChangesGuard } from './pending-changes.guard'
import { routes } from '../../app.routes'

/** Plan 498: every route that edits typed data asks before the user leaves it. */
describe('routes: unsaved-work guards', () => {
  const flatten = (list: Route[], prefix = ''): Map<string, Route> => {
    const out = new Map<string, Route>()
    for (const route of list) {
      const path = [prefix, route.path ?? ''].filter(Boolean).join('/')
      out.set(path, route)
      if (route.children) flatten(route.children, path).forEach((value, key) => out.set(key, value))
    }
    return out
  }
  const all = flatten(routes)

  for (const path of [
    'inventory/equipment/add',
    'inventory/equipment/edit/:id',
    'suppliers/add',
    'suppliers/edit/:id',
    'settings'
  ]) {
    it(`${path} has the pending-changes guard`, () => {
      expect(all.get(path)?.canDeactivate).toContain(pendingChangesGuard)
    })
  }

  it('settings re-runs the guard on a ?tab= change', () => {
    expect(all.get('settings')?.runGuardsAndResolvers).toBe('paramsOrQueryParamsChange')
  })
})
