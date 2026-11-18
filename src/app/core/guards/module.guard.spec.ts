import { TestBed } from '@angular/core/testing'
import { Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router'
import { signal } from '@angular/core'
import type { ModuleKey } from '@schemas/modules-pure'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { moduleGuard } from './module.guard'

describe('moduleGuard', () => {
  const user = signal<{ _id: string } | null>({ _id: 'u1' })
  let on: ModuleKey[]
  let resolveReady: () => void
  let readyPromise: Promise<void>

  const run = (keys: ModuleKey[]) =>
    TestBed.runInInjectionContext(() => moduleGuard(keys)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot))

  beforeEach(() => {
    user.set({ _id: 'u1' })
    on = ['events']
    readyPromise = Promise.resolve()
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user_: user } },
        {
          provide: ModuleService,
          useValue: {
            has: (k: ModuleKey | ModuleKey[]) => [k].flat().some((x) => on.includes(x)),
            ready: () => readyPromise
          }
        },
        { provide: Router, useValue: { createUrlTree: (c: string[]) => ({ path: c.join('/') }) as unknown as UrlTree } }
      ]
    })
  })

  it('returns true with the module', async () => {
    expect(await run(['events'])).toBeTrue()
  })

  it('returns the /dashboard UrlTree without it', async () => {
    const res = (await run(['frontdesk'])) as unknown as { path: string }
    expect(res.path).toBe('/dashboard')
  })

  it('waits for ready() before it answers', async () => {
    readyPromise = new Promise<void>((r) => (resolveReady = r))
    let answered = false
    const p = Promise.resolve(run(['events'])).then(() => (answered = true))
    await Promise.resolve()
    expect(answered).toBeFalse()
    resolveReady()
    await p
    expect(answered).toBeTrue()
  })

  it('returns true when signed out', async () => {
    user.set(null)
    expect(await run(['frontdesk'])).toBeTrue()
  })
})
