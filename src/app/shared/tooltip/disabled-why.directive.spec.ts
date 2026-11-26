import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { DisabledWhyDirective } from './disabled-why.directive'
import { TOOLTIP_HOVER_DELAY_MS } from './tooltip.directive'

@Component({
  standalone: true,
  imports: [DisabledWhyDirective],
  template: `
    <div style="padding: 300px 40px">
      <button
        id="btn"
        type="button"
        [appDisabledWhy]="why()"
        [disabledWhyTip]="tip()"
        (click)="pressed()"
        (keydown)="keyed()"
      >
        save
      </button>
      <a id="link" href="#somewhere" [appDisabledWhy]="why()" (click)="pressed()">go</a>
      <input id="text" type="text" [appDisabledWhy]="why()" (click)="pressed()" />
      <input id="locked" type="text" readonly [appDisabledWhy]="why()" />
      <textarea id="area" [appDisabledWhy]="why()"></textarea>
      <select id="pick" [appDisabledWhy]="why()" (mousedown)="pressed()">
        <option value="a">a</option>
        <option value="b">b</option>
      </select>
      <input id="check" type="checkbox" [appDisabledWhy]="why()" />
      <span id="plain" [appDisabledWhy]="why()" (click)="pressed()">plain</span>
      <label id="chip" class="c-chip c-chip--toggle">
        <input id="chipInput" type="checkbox" [appDisabledWhy]="why()" />
        <span id="chipText">chip</span>
      </label>
    </div>
  `
})
class HostComponent {
  readonly why = signal<string | null>('sign in first')
  readonly tip = signal<string | null>(null)
  presses = 0
  keys = 0
  pressed(): void {
    this.presses++
  }
  keyed(): void {
    this.keys++
  }
}

describe('DisabledWhyDirective (plan 747)', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  const el = <T extends HTMLElement = HTMLElement>(id: string): T => fixture.nativeElement.querySelector(`#${id}`)
  const box = (): HTMLElement | null => document.body.querySelector('.c-tooltip')
  const pointer = (target: HTMLElement, type: string, pointerType = 'mouse'): void => {
    target.dispatchEvent(
      new PointerEvent(type, { pointerType, bubbles: type !== 'pointerenter' && type !== 'pointerleave' })
    )
  }
  const key = (target: HTMLElement, name: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init })
    target.dispatchEvent(event)
    return event
  }
  const enable = (): void => {
    host.why.set(null)
    fixture.detectChanges()
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

  describe('a button with a reason', () => {
    it('is marked aria-disabled and is-disabled, and never natively disabled', () => {
      const btn = el<HTMLButtonElement>('btn')
      expect(btn.getAttribute('aria-disabled')).toBe('true')
      expect(btn.classList).toContain('is-disabled')
      expect(btn.disabled).toBeFalse()
      expect(btn.hasAttribute('disabled')).toBeFalse()
    })

    it('does not run its click handler, and a click shows the reason', () => {
      el('btn').click()
      expect(host.presses).toBe(0)
      expect(box()?.textContent?.trim()).toBe('sign in first')
      // Pinned by the click: leaving with the mouse keeps it.
      pointer(el('btn'), 'pointerleave')
      expect(box()).not.toBeNull()
    })

    it('swallows Enter and Space and lets Tab through', () => {
      expect(key(el('btn'), 'Enter').defaultPrevented).toBeTrue()
      expect(key(el('btn'), ' ').defaultPrevented).toBeTrue()
      expect(host.keys).toBe(0)
      expect(key(el('btn'), 'Tab').defaultPrevented).toBeFalse()
      expect(host.keys).toBe(1)
    })

    it('shows the reason on hover', fakeAsync(() => {
      pointer(el('btn'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      expect(box()?.textContent?.trim()).toBe('sign in first')
      pointer(el('btn'), 'pointerleave')
      expect(box()).toBeNull()
    }))

    it('stays focusable and shows the reason on keyboard focus', () => {
      el('btn').focus()
      expect(document.activeElement).toBe(el('btn'))
      expect(box()?.textContent?.trim()).toBe('sign in first')
    })

    it('a tap on touch shows the reason', () => {
      pointer(el('btn'), 'pointerdown', 'touch')
      el('btn').click()
      expect(host.presses).toBe(0)
      expect(box()?.textContent?.trim()).toBe('sign in first')
    })
  })

  describe('with no reason', () => {
    beforeEach(() => enable())

    it('the control works and carries no aria-disabled', fakeAsync(() => {
      const btn = el('btn')
      expect(btn.hasAttribute('aria-disabled')).toBeFalse()
      expect(btn.classList).not.toContain('is-disabled')
      btn.click()
      expect(host.presses).toBe(1)
      expect(key(btn, 'Enter').defaultPrevented).toBeFalse()
      expect(host.keys).toBe(1)
      pointer(btn, 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      expect(box()).toBeNull()
    }))

    it('an empty string counts as no reason', () => {
      host.why.set('')
      fixture.detectChanges()
      expect(el('btn').hasAttribute('aria-disabled')).toBeFalse()
      el('btn').click()
      expect(host.presses).toBe(1)
    })

    it('shows the ordinary hint from disabledWhyTip on hover only', fakeAsync(() => {
      host.tip.set('saves the form')
      fixture.detectChanges()
      el('btn').click()
      expect(host.presses).toBe(1)
      expect(box()).toBeNull()
      pointer(el('btn'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      expect(box()?.textContent?.trim()).toBe('saves the form')
    }))
  })

  it('the reason wins over the ordinary hint, and a reason that goes away closes the open tooltip', () => {
    host.tip.set('saves the form')
    fixture.detectChanges()
    el('btn').click()
    expect(box()?.textContent?.trim()).toBe('sign in first')
    enable()
    expect(box()).toBeNull()
  })

  describe('a link', () => {
    it('does not navigate or run its handler with a reason', () => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      el('link').dispatchEvent(event)
      expect(event.defaultPrevented).toBeTrue()
      expect(host.presses).toBe(0)
      expect(el('link').getAttribute('aria-disabled')).toBe('true')
      expect(box()?.textContent?.trim()).toBe('sign in first')
    })
  })

  describe('a text field', () => {
    it('is read-only, aria-disabled and not natively disabled with a reason', () => {
      const field = el<HTMLInputElement>('text')
      expect(field.readOnly).toBeTrue()
      expect(field.disabled).toBeFalse()
      expect(field.getAttribute('aria-disabled')).toBe('true')
      expect(field.classList).toContain('is-disabled')
    })

    it('swallows typing keys and the click, lets Tab, Escape and copy through', () => {
      const field = el<HTMLInputElement>('text')
      expect(key(field, 'a').defaultPrevented).toBeTrue()
      expect(key(field, 'Enter').defaultPrevented).toBeTrue()
      expect(key(field, 'Tab').defaultPrevented).toBeFalse()
      expect(key(field, 'Escape').defaultPrevented).toBeFalse()
      expect(key(field, 'c', { ctrlKey: true }).defaultPrevented).toBeFalse()
      field.click()
      expect(host.presses).toBe(0)
      expect(box()?.textContent?.trim()).toBe('sign in first')
    })

    it('can be edited again when the reason goes away', () => {
      enable()
      const field = el<HTMLInputElement>('text')
      expect(field.readOnly).toBeFalse()
      expect(field.hasAttribute('aria-disabled')).toBeFalse()
      expect(key(field, 'a').defaultPrevented).toBeFalse()
    })

    it('a field that was read-only before stays read-only afterwards', () => {
      expect(el<HTMLInputElement>('locked').readOnly).toBeTrue()
      enable()
      expect(el<HTMLInputElement>('locked').readOnly).toBeTrue()
    })

    it('a textarea is read-only with a reason and editable without', () => {
      const area = el<HTMLTextAreaElement>('area')
      expect(area.readOnly).toBeTrue()
      expect(area.getAttribute('aria-disabled')).toBe('true')
      enable()
      expect(area.readOnly).toBeFalse()
    })
  })

  describe('a select', () => {
    it('swallows mousedown and the keys with a reason, and is not natively disabled', () => {
      const pick = el<HTMLSelectElement>('pick')
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      pick.dispatchEvent(down)
      expect(down.defaultPrevented).toBeTrue()
      expect(host.presses).toBe(0)
      expect(key(pick, 'ArrowDown').defaultPrevented).toBeTrue()
      expect(key(pick, ' ').defaultPrevented).toBeTrue()
      expect(key(pick, 'Tab').defaultPrevented).toBeFalse()
      expect(pick.disabled).toBeFalse()
      expect(pick.getAttribute('aria-disabled')).toBe('true')
      expect(pick.classList).toContain('is-disabled')
    })

    it('shows the reason on click', () => {
      el('pick').click()
      expect(box()?.textContent?.trim()).toBe('sign in first')
    })

    it('opens again when the reason goes away', () => {
      enable()
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      el('pick').dispatchEvent(down)
      expect(down.defaultPrevented).toBeFalse()
      expect(host.presses).toBe(1)
      expect(key(el('pick'), 'ArrowDown').defaultPrevented).toBeFalse()
    })
  })

  it('a checkbox does not toggle with a reason and toggles without', () => {
    const check = el<HTMLInputElement>('check')
    check.click()
    expect(check.checked).toBeFalse()
    enable()
    check.click()
    expect(check.checked).toBeTrue()
  })

  describe('a checkbox inside a label (a toggle chip)', () => {
    it('shows the reason when the label is hovered and closes when the pointer leaves it', fakeAsync(() => {
      pointer(el('chip'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      expect(box()?.textContent?.trim()).toBe('sign in first')
      pointer(el('chip'), 'pointerleave')
      expect(box()).toBeNull()
    }))

    it('a click or tap on the label text does not toggle the checkbox and shows the reason', () => {
      el('chipText').click()
      expect(el<HTMLInputElement>('chipInput').checked).toBeFalse()
      expect(box()?.textContent?.trim()).toBe('sign in first')
      // A press on the chip is a press on the control: the pinned reason stays until the next tap.
      el('chipText').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      expect(box()).not.toBeNull()
    })

    it('with no reason the label hover shows nothing and the chip toggles', fakeAsync(() => {
      enable()
      pointer(el('chip'), 'pointerenter')
      tick(TOOLTIP_HOVER_DELAY_MS)
      expect(box()).toBeNull()
      el('chipText').click()
      expect(el<HTMLInputElement>('chipInput').checked).toBeTrue()
    }))
  })

  it('a host the keyboard cannot reach gets a tabindex only while it has a reason', () => {
    expect(el('plain').getAttribute('tabindex')).toBe('0')
    el('plain').click()
    expect(host.presses).toBe(0)
    enable()
    expect(el('plain').hasAttribute('tabindex')).toBeFalse()
  })
})
