import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { LayoutModeService } from './layout-mode.service'

@Component({ template: '', standalone: true })
class StubPage {}

describe('LayoutModeService', () => {
  let router: Router
  let layout: LayoutModeService

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'book/:slug', component: StubPage, data: { bare: true } },
          { path: 'dashboard', component: StubPage },
          {
            path: 'parent',
            component: StubPage,
            children: [{ path: 'child', component: StubPage, data: { bare: true } }]
          }
        ])
      ]
    })
    router = TestBed.inject(Router)
    layout = TestBed.inject(LayoutModeService)
  })

  it('is false before any navigation', () => {
    expect(layout.bare_()).toBeFalse()
  })

  it('is true on a route with { bare: true }', async () => {
    await router.navigateByUrl('/book/x')
    expect(layout.bare_()).toBeTrue()
  })

  it('is false on a normal route and goes back to false after a bare one', async () => {
    await router.navigateByUrl('/book/x')
    await router.navigateByUrl('/dashboard')
    expect(layout.bare_()).toBeFalse()
  })

  it('reads the deepest active route', async () => {
    await router.navigateByUrl('/parent/child')
    expect(layout.bare_()).toBeTrue()
  })
})
