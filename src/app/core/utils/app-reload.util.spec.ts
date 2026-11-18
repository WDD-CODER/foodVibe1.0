import { TestBed } from '@angular/core/testing'
import { APP_RELOAD } from './app-reload.util'

describe('APP_RELOAD', () => {
  it('is injectable by default and is a function taking a path', () => {
    const reload = TestBed.inject(APP_RELOAD)
    expect(typeof reload).toBe('function')
    expect(reload.length).toBe(1)
  })

  it('can be replaced by a spec', () => {
    const spy = jasmine.createSpy('reload')
    TestBed.configureTestingModule({ providers: [{ provide: APP_RELOAD, useValue: spy }] })
    TestBed.inject(APP_RELOAD)('/dashboard')
    expect(spy).toHaveBeenCalledOnceWith('/dashboard')
  })
})
