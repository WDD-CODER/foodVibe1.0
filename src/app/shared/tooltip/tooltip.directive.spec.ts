import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { TooltipDirective, TOOLTIP_HOVER_DELAY_MS } from './tooltip.directive'

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

  const el = (id: string): HTMLElement => fixture.nativeElement.querySelector(`#${id}`)
  const box = (): HTMLElement | null => document.body.querySelector('.c-tooltip')
  const pointer = (target: HTMLElement, type: string, pointerType = 'mouse'): void => {
    target.dispatchEvent(
      new PointerEvent(type, { pointerType, bubbles: type !== 'pointerenter' && type !== 'pointerleave' })
    )
  }

  beforeEach(() => {
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

  it('tooltipOnClick toggles and survives pointerleave; an outside press closes it', fakeAsync(() => {
    host.onClick.set(true)
    fixture.detectChanges()
    el('a').click()
    expect(box()).not.toBeNull()
    pointer(el('a'), 'pointerleave')
    expect(box()).not.toBeNull()
    pointer(document.body, 'pointerdown')
    expect(box()).toBeNull()
    el('a').click()
    el('a').click()
    expect(box()).toBeNull()
  }))

  it('a click without tooltipOnClick opens nothing', () => {
    el('a').click()
    expect(box()).toBeNull()
  })

  it('touch: hover does nothing, a tap toggles it (even without tooltipOnClick), a tap elsewhere closes it', fakeAsync(() => {
    pointer(el('a'), 'pointerenter', 'touch')
    tick(TOOLTIP_HOVER_DELAY_MS + 10)
    expect(box()).toBeNull()
    pointer(el('a'), 'pointerdown', 'touch')
    el('a').click()
    expect(box()).not.toBeNull()
    pointer(el('a'), 'pointerleave', 'touch')
    expect(box()).not.toBeNull()
    pointer(document.body, 'pointerdown', 'touch')
    expect(box()).toBeNull()
    pointer(el('a'), 'pointerdown', 'touch')
    el('a').click()
    el('a').click()
    expect(box()).toBeNull()
  }))

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
