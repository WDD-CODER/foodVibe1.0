import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { warnBeforeUnload } from './leave-warning.util'

let dirty = false

@Component({ standalone: true, template: '' })
class TestHostComponent {
  constructor() {
    warnBeforeUnload(() => dirty)
  }
}

// The Karma page owns `window.onbeforeunload` and fails the run when it sees a real `beforeunload`,
// so these specs capture the listener the helper registers and call it with a fake event instead.
describe('warnBeforeUnload', () => {
  let handlers: EventListener[]
  let removed: EventListener[]

  const fire = (): { defaultPrevented: boolean; returnValue: unknown } => {
    const event = {
      defaultPrevented: false,
      returnValue: undefined as unknown,
      preventDefault() {
        this.defaultPrevented = true
      }
    }
    handlers.forEach((h) => h(event as unknown as Event))
    return event
  }

  beforeEach(() => {
    dirty = false
    handlers = []
    removed = []
    const add = window.addEventListener.bind(window)
    const remove = window.removeEventListener.bind(window)
    spyOn(window, 'addEventListener').and.callFake(((type: string, listener: EventListener, opts?: unknown) => {
      if (type === 'beforeunload') handlers.push(listener)
      else add(type, listener, opts as AddEventListenerOptions)
    }) as typeof window.addEventListener)
    spyOn(window, 'removeEventListener').and.callFake(((type: string, listener: EventListener, opts?: unknown) => {
      if (type === 'beforeunload') {
        removed.push(listener)
        handlers = handlers.filter((h) => h !== listener)
      } else remove(type, listener, opts as EventListenerOptions)
    }) as typeof window.removeEventListener)
  })

  it('does not block leaving while nothing is dirty', () => {
    const fixture = TestBed.createComponent(TestHostComponent)
    fixture.detectChanges()
    expect(handlers.length).toBe(1)
    expect(fire().defaultPrevented).toBeFalse()
    fixture.destroy()
  })

  it('prevents the unload while dirty and sets returnValue', () => {
    const fixture = TestBed.createComponent(TestHostComponent)
    fixture.detectChanges()
    dirty = true
    const event = fire()
    expect(event.defaultPrevented).toBeTrue()
    expect(event.returnValue).toBe('')
    dirty = false
    expect(fire().defaultPrevented).toBeFalse()
    fixture.destroy()
  })

  it('removes the listener when the component is destroyed', () => {
    const fixture = TestBed.createComponent(TestHostComponent)
    fixture.detectChanges()
    fixture.destroy()
    expect(removed.length).toBe(1)
    expect(handlers.length).toBe(0)
    dirty = true
    expect(fire().defaultPrevented).toBeFalse()
  })
})
