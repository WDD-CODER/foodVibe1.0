import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot, type UrlTree } from '@angular/router'
import type { ModuleKey } from '@schemas/modules-pure'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { diagnosisGuard } from './diagnosis.guard'

describe('diagnosisGuard', () => {
  const acting = signal<'consultant' | 'platform' | null>(null)
  const homeModules = signal<string[]>([])
  let businessModules: ModuleKey[]

  const run = () =>
    TestBed.runInInjectionContext(() => diagnosisGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot))

  beforeEach(() => {
    acting.set(null)
    homeModules.set([])
    businessModules = []
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: { user_: signal({ _id: 'u1' }), acting_: acting, homeModules_: homeModules }
        },
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

  it('while acting, passes when the HOME modules include consultant_diag (the client modules do not count)', async () => {
    acting.set('consultant')
    homeModules.set(['consultant_diag'])
    expect(await run()).toBeTrue()
  })

  it('while acting, redirects to /dashboard without the home module even if the client has it', async () => {
    acting.set('consultant')
    businessModules = ['consultant_diag']
    expect(((await run()) as unknown as { path: string }).path).toBe('/dashboard')
  })

  it('at home, the module guard decides', async () => {
    homeModules.set(['consultant_diag'])
    expect(((await run()) as unknown as { path: string }).path).toBe('/dashboard')
    businessModules = ['consultant_diag']
    expect(await run()).toBeTrue()
  })
})
