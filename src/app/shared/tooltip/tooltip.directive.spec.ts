import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { PHONE_QUERY } from '@utils/breakpoints'
import { TooltipDirective, TOOLTIP_HOVER_DELAY_MS, TOOLTIP_TAP_QUERY } from './tooltip.directive'

@Component({
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <div style="padding: 300px 40px">
      <button
        id="a"
        type="button"
        aria-describedby="prev"
        [appTooltip]="text()"
        [tooltipOnClick]="onClick()"
        [tooltipPlacement]="placement()"
      >
        A
      </button>
      <button id="b" type="button" [appTooltip]="'second'">B</button>
      <button id="t" type="button" [appTooltip]="tpl">T</button>
      <ng-template #tpl><span class="rich">rich content</span></ng-template>
      @if (showC()) {
        <button id="c" type="button" appTooltip="gone soon">C</button>
      }
    </div>
  `
})
class HostComponent {
  readonly text = signal<string | null>('first')
  readonly onClick = signal(false)
  readonly placement = signal<'above' | 'below'>('above')
  readonly showC = signal(true)
}

describe('TooltipDirective (plan 744)', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent
  /** Plan 762: true = a phone width (or no hover), where the tooltip works by tap. */
  let byTap = false

  const el = (id: string): HTMLElement => fixture.nativeElement.querySelector(`#${id}`)
  const box = (): HTMLElement | null => document.body.querySelector('.c-tooltip')
  const pointer = (target: HTMLElement, type: string, pointerType = 'mouse'): void => {
    target.dispatchEvent(
      new PointerEvent(type, { pointerType, bubbles: type !== 'pointerenter' && type !== 'pointerleave' })
    )
  }

  /** What a finger or a mouse button does on a control: press, release, click. */
  const tap = (target: HTMLElement, pointerType = 'touch'): void => {
    pointer(target, 'pointerdown', pointerType)
    pointer(target, 'pointerup', pointerType)
    target.click()
  }

  beforeEach(() => {
    byTap = false
    const real = window.matchMedia.bind(window)
    spyOn(window, 'matchMedia').and.callFake((query: string) =>
      query === TOOLTIP_TAP_QUERY ? ({ matches: byTap } as MediaQueryList) : real(query)
    )
    TestBed.configureTestingModule({ imports: [HostComponent] })
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    document.body.appendChild(fixture.nativeElement)
    fixture.detectChanges()
  })

  afterEach(() => {
    fixture.destroy()
    document.body.querySelectorAll('.c-tooltip').forEach((n) => n.remove())
  })

  it('hover opens after the delay and leave closes', fakeAsync(() => {
    pointer(el('a'), 'pointerenter')
    tick(TOOLTIP_HOVER_DELAY_MS - 1)
    expect(box()).toBeNull()
    tick(1)
    expect(box()?.textContent?.trim()).toBe('first')
    expect(box()?.getAttribute('role')).toBe('tooltip')
    pointer(el('a'), 'pointerleave')
    expect(box()).toBeNull()
  }))

  it('leaving before the delay opens nothing', fakeAsync(() => {
    pointer(el('a'), 'pointerenter')
    tick(100)
    pointer(el('a'), 'pointerleave')
    tick(1000)
    expect(box()).toBeNull()
  }))

  it('keyboard focus opens at once and blur closes', () => {
    el('a').focus()
    expect(box()).not.toBeNull()
    el('a').blur()
    expect(box()).toBeNull()
  })

  it('Escape closes and the event is not stopped', () => {
    el('a').focus()
    let seen = false
    let prevented = false
    const spy = (e: Event): void => {
      seen = true
      prevented = e.defaultPrevented
    }
    document.body.addEventListener('keydown', spy)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    el('a').dispatchEvent(event)
    document.body.removeEventListener('keydown', spy)
    expect(box()).toBeNull()
    expect(seen).toBeTrue()
    expect(prevented).toBeFalse()
  })

  it('the tap rule is the app phone breakpoint, or a touch screen that cannot hover', () => {
    expect(TOOLTIP_TAP_QUERY).toBe(`${PHONE_QUERY}, (hover: none) and (pointer: coarse)`)
  })

  describe('above a phone (plan 762)', () => {
    it('a click opens nothing, with or without tooltipOnClick', fakeAsync(() => {
      for (const onClick of [false, true]) {
        host.onClick.set(onClick)
        fixture.detectChanges()
        tap(el('a'), 'mouse')
        tick(1000)
        expect(box()).toBeNull()
      }
    }))

    it('a tap on a touch screen opens nothing, also through the focus it brings', fakeAsync(() => {
      pointer(el('a'), 'pointerenter', 'touch')
      pointer(el('a'), 'pointerdown', 'touch')
      el('a').focus()
      el('a').click()
      tick(1000)
      expect(box()).toBeNull()
    }))

    it('keyboard focus still opens after an earlier press', () => {
      pointer(el('a'), 'pointerdown')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
      el('a').focus()
      expect(box()).not.toBeNull()
    })

    it('a click on a hovered control does not pin: leaving closes it', fakeAsync(() => {
      pointer(el('a'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      tap(el('a'), 'mouse')
      expect(box()).not.toBeNull()
      pointer(el('a'), 'pointerleave')
      expect(box()).toBeNull()
    }))

    it('a press elsewhere and a scroll close it', () => {
      el('a').focus()
      pointer(document.body, 'pointerdown')
      expect(box()).toBeNull()
      el('b').focus()
      document.dispatchEvent(new Event('scroll'))
      expect(box()).toBeNull()
    })
  })

  describe('at a phone width (plan 762)', () => {
    beforeEach(() => (byTap = true))

    it('a finger does not hover; a mouse in a narrow window still does', fakeAsync(() => {
      pointer(el('a'), 'pointerenter', 'touch')
      tick(TOOLTIP_HOVER_DELAY_MS + 10)
      expect(box()).toBeNull()
      pointer(el('a'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      expect(box()).not.toBeNull()
      pointer(el('a'), 'pointerleave')
      expect(box()).toBeNull()
    }))

    it('a tap on an already focused or hovered box keeps it open and takes it over', fakeAsync(() => {
      pointer(el('a'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      tap(el('a'), 'mouse')
      pointer(el('a'), 'pointerleave')
      expect(box()).not.toBeNull()
      tap(el('a'), 'mouse')
      expect(box()).toBeNull()
    }))

    it('a click with no press before it (the keyboard) toggles it', () => {
      el('a').click()
      expect(box()).not.toBeNull()
      el('a').click()
      expect(box()).toBeNull()
    })

    it('a tap opens it and it stays when the finger lifts', () => {
      tap(el('a'))
      expect(box()?.textContent?.trim()).toBe('first')
      pointer(el('a'), 'pointerleave', 'touch')
      expect(box()).not.toBeNull()
    })

    it('a later tap elsewhere closes it', () => {
      tap(el('a'))
      pointer(document.body, 'pointerdown', 'touch')
      expect(box()).toBeNull()
    })

    it('a later tap on the same control closes it, and the one after opens it again', () => {
      tap(el('a'))
      tap(el('a'))
      expect(box()).toBeNull()
      tap(el('a'))
      expect(box()).not.toBeNull()
    })

    it('the press itself closes it, and a press that made no click does not eat the next tap', () => {
      tap(el('a'))
      pointer(el('a'), 'pointerdown', 'touch')
      expect(box()).toBeNull()
      pointer(el('a'), 'pointercancel', 'touch')
      tap(el('a'))
      expect(box()).not.toBeNull()
      // A press that closes it and then ends in nothing at all: the next full tap still opens.
      pointer(el('a'), 'pointerdown', 'touch')
      tap(el('a'))
      expect(box()).not.toBeNull()
    })

    it('a scroll of the page or of any scroll container closes it', () => {
      tap(el('a'))
      document.dispatchEvent(new Event('scroll'))
      expect(box()).toBeNull()
      tap(el('a'))
      el('a').parentElement!.dispatchEvent(new Event('scroll'))
      expect(box()).toBeNull()
    })

    it('a tap on another control closes the first and opens the second', () => {
      tap(el('a'))
      tap(el('b'))
      expect(document.body.querySelectorAll('.c-tooltip').length).toBe(1)
      expect(box()?.textContent?.trim()).toBe('second')
    })

    it('Escape closes it', () => {
      tap(el('a'))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(box()).toBeNull()
    })
  })

  it('the box stays inside the viewport on both sides', () => {
    const wrap = el('a').parentElement!
    for (const side of ['left: 0', 'right: 0']) {
      wrap.style.cssText = `position: fixed; top: 300px; ${side}; padding: 0`
      el('a').focus()
      const rect = box()!.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      expect(rect.left).toBeGreaterThanOrEqual(7.5)
      expect(rect.right).toBeLessThanOrEqual(width - 7.5)
      el('a').blur()
    }
  })

  it('a second tooltip closes the first', () => {
    el('a').focus()
    el('b').focus()
    expect(document.body.querySelectorAll('.c-tooltip').length).toBe(1)
    expect(box()?.textContent?.trim()).toBe('second')
  })

  it('aria-describedby is set while open and restored on close', () => {
    el('a').focus()
    const id = box()!.id
    expect(id).toBeTruthy()
    expect(el('a').getAttribute('aria-describedby')).toBe(id)
    el('a').blur()
    expect(el('a').getAttribute('aria-describedby')).toBe('prev')
  })

  it('a template input renders its content', () => {
    el('t').focus()
    expect(box()?.querySelector('.rich')?.textContent).toBe('rich content')
  })

  it('an empty input opens nothing; emptying it closes an open one', () => {
    host.text.set('')
    fixture.detectChanges()
    el('a').focus()
    expect(box()).toBeNull()
    host.text.set('x')
    fixture.detectChanges()
    el('a').blur()
    el('a').focus()
    expect(box()).not.toBeNull()
    host.text.set(null)
    fixture.detectChanges()
    expect(box()).toBeNull()
  })

  it('destroy removes the box from the body', () => {
    el('c').focus()
    expect(box()).not.toBeNull()
    host.showC.set(false)
    fixture.detectChanges()
    expect(box()).toBeNull()
  })

  it('sits below the control when there is no room above', () => {
    const wrap = el('a').parentElement!
    wrap.style.cssText = 'position: fixed; top: 0; left: 40px; padding: 0'
    el('a').focus()
    expect(box()?.classList.contains('c-tooltip--below')).toBeTrue()
  })

  it('stays above when there is room and the placement is above', () => {
    el('a').focus()
    expect(box()?.classList.contains('c-tooltip--below')).toBeFalse()
  })
})
