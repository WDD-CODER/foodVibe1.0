import { computed, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot, type UrlTree } from '@angular/router'
import type { ModuleKey } from '@schemas/modules-pure'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { monthlyPlanGuard } from './monthly-plan.guard'

describe('monthlyPlanGuard (plan 727)', () => {
  const user_ = signal<{ _id: string; businessRole: string } | null>(null)
  let businessModules: ModuleKey[]

  const run = () =>
    TestBed.runInInjectionContext(() => monthlyPlanGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot))
  const path = (result: unknown) => (result as { path: string }).path

  beforeEach(() => {
    user_.set({ _id: 'u1', businessRole: 'owner' })
    businessModules = ['monthly_plan']
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } },
        {
          provide: ModuleService,
          useValue: {
            has: (k: ModuleKey | ModuleKey[]) => [k].flat().some((x) => businessModules.includes(x)),
            ready: () => Promise.resolve()
          }
        },
        { provide: Router, useValue: { createUrlTree: (c: string[]) => ({ path: c.join('/') }) as unknown as UrlTree } }
      ]
    })
  })

  it('lets the owner in when the business has the module', async () => {
    expect(await run()).toBeTrue()
  })

  it('lets a consultant in when the business has the module', async () => {
    user_.set({ _id: 'c1', businessRole: 'consultant' })
    expect(await run()).toBeTrue()
  })

  it('sends staff to the dashboard even when the module is on', async () => {
    user_.set({ _id: 's1', businessRole: 'staff' })
    expect(path(await run())).toBe('/dashboard')
  })

  it('sends the owner to the dashboard when the module is off', async () => {
    businessModules = []
    expect(path(await run())).toBe('/dashboard')
  })
})
