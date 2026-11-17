import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router'
import type { ModuleKey } from '@schemas/modules'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { moduleGuard } from './module.guard'

describe('moduleGuard', () => {
  const user = signal<{ _id: string } | null>({ _id: 'u1' })
  let on: ModuleKey[]
  let resolveReady: () => void
  let readyCalled: boolean

  beforeEach(() => {
    user.set({ _id: 'u1' })
    on = ['events']
    readyCalled = false
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user_: user } },
        {
          provide: ModuleService,
          useValue: {
            has: (keys: readonly ModuleKey[]) => keys.some((k) => on.includes(k)),
            ready: () => {
              readyCalled = true
              return new Promise<void>((r) => (resolveReady = r))
            }
          }
        }
      ]
    })
  })

  const run = (keys: readonly ModuleKey[]) =>
    TestBed.runInInjectionContext(() =>
      moduleGuard(keys)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as Promise<boolean | UrlTree>

  it('returns true with the module, after ready()', async () => {
    const p = run(['events'])
    expect(readyCalled).toBeTrue()
    resolveReady()
    expect(await p).toBeTrue()
  })

  it('returns the /dashboard UrlTree without the module', async () => {
    const p = run(['frontdesk'])
    resolveReady()
    const res = await p
    expect(res instanceof UrlTree).toBeTrue()
    expect(TestBed.inject(Router).serializeUrl(res as UrlTree)).toBe('/dashboard')
  })

  it('waits for ready() before it answers', async () => {
    let settled = false
    const p = run(['frontdesk']).then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBeFalse()
    resolveReady()
    await p
    expect(settled).toBeTrue()
  })

  it('signed out: true without waiting', async () => {
    user.set(null)
    expect(await run(['frontdesk'])).toBeTrue()
    expect(readyCalled).toBeFalse()
  })
})
