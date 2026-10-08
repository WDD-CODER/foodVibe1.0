import { TestBed } from '@angular/core/testing'
import {
  KEYBOARD_INSET_VAR,
  KEYBOARD_OPEN_CLASS,
  KeyboardInsetService,
  KeyboardInsetWindow
} from './keyboard-inset.service'

class FakeVisualViewport extends EventTarget {
  height = 800
  offsetTop = 0
}

function fakeWindow(vv: FakeVisualViewport | null): KeyboardInsetWindow {
  return {
    innerHeight: 800,
    visualViewport: vv as unknown as VisualViewport | null,
    document,
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    }
  }
}

describe('KeyboardInsetService', () => {
  let service: KeyboardInsetService

  beforeEach(() => {
    // Other specs (e.g. AppComponent) may have started the real service in this browser.
    document.body.classList.remove(KEYBOARD_OPEN_CLASS)
    document.documentElement.style.removeProperty(KEYBOARD_INSET_VAR)
    TestBed.configureTestingModule({})
    service = TestBed.inject(KeyboardInsetService)
  })

  afterEach(() => {
    document.body.classList.remove(KEYBOARD_OPEN_CLASS)
    document.documentElement.style.removeProperty(KEYBOARD_INSET_VAR)
  })

  it('computes the inset and toggles body.kb-open past the threshold', () => {
    const vv = new FakeVisualViewport()
    service.start(fakeWindow(vv))
    expect(service.inset()).toBe(0)
    expect(service.isOpen()).toBeFalse()

    vv.height = 450
    vv.dispatchEvent(new Event('resize'))
    expect(service.inset()).toBe(350)
    expect(service.isOpen()).toBeTrue()
    expect(document.body.classList).toContain(KEYBOARD_OPEN_CLASS)
    expect(document.documentElement.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe('350px')

    vv.height = 700 // small inset (e.g. browser toolbar) — not a keyboard
    vv.dispatchEvent(new Event('resize'))
    expect(service.isOpen()).toBeFalse()
    expect(document.body.classList).not.toContain(KEYBOARD_OPEN_CLASS)
  })

  it('accounts for the visual viewport offset', () => {
    const vv = new FakeVisualViewport()
    service.start(fakeWindow(vv))
    vv.height = 400
    vv.offsetTop = 100
    vv.dispatchEvent(new Event('scroll'))
    expect(service.inset()).toBe(300)
  })

  it('centers the focused field when the keyboard opens', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const spy = spyOn(input, 'scrollIntoView')
    const vv = new FakeVisualViewport()
    service.start(fakeWindow(vv))
    vv.height = 450
    vv.dispatchEvent(new Event('resize'))
    expect(spy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    input.remove()
  })

  it('is a no-op without visualViewport', () => {
    service.start(fakeWindow(null))
    expect(service.inset()).toBe(0)
    expect(service.isOpen()).toBeFalse()
    expect(document.documentElement.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe('')
  })
})
