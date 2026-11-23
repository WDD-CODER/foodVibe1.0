import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { TipDirective, TIP_TAP_MS } from './tip.directive'

@Component({
  standalone: true,
  imports: [TipDirective],
  template: '<button type="button" aria-describedby="keep-me" [appTip]="text()">x</button>'
})
class HostComponent {
  readonly text = signal<string | null>('יש שולחנות באזור הזה')
}

describe('TipDirective (plan 699)', () => {
  let fixture: ComponentFixture<HostComponent>
  let button: HTMLButtonElement

  const bubble = (): HTMLElement | null => document.querySelector<HTMLElement>('.c-tip[popover]')
  const open = (): boolean => !!bubble()?.matches(':popover-open')

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent)
    fixture.detectChanges()
    button = fixture.nativeElement.querySelector('button')
  })

  afterEach(() => fixture.destroy())

  it('shows at once on mouseenter, names it in aria-describedby, and goes on mouseleave', () => {
    button.dispatchEvent(new MouseEvent('mouseenter'))
    expect(open()).toBeTrue()
    expect(bubble()?.textContent).toBe('יש שולחנות באזור הזה')
    expect(bubble()?.getAttribute('role')).toBe('tooltip')
    const id = bubble()?.id ?? ''
    expect(id).toBeTruthy()
    expect(button.getAttribute('aria-describedby')?.split(' ')).toEqual(['keep-me', id])

    button.dispatchEvent(new MouseEvent('mouseleave'))
    expect(open()).toBeFalse()
    expect(button.getAttribute('aria-describedby')).toBe('keep-me')
  })

  it('shows on focusin and goes on focusout', () => {
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(open()).toBeTrue()
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(open()).toBeFalse()
  })

  it('goes on Escape', () => {
    button.dispatchEvent(new MouseEvent('mouseenter'))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(open()).toBeFalse()
  })

  it('a click shows it and it closes after 3000 ms', fakeAsync(() => {
    button.click()
    expect(open()).toBeTrue()
    tick(TIP_TAP_MS - 1)
    expect(open()).toBeTrue()
    tick(1)
    expect(TIP_TAP_MS).toBe(3000)
    expect(open()).toBeFalse()
  }))

  it('an empty text shows nothing', () => {
    fixture.componentInstance.text.set('  ')
    fixture.detectChanges()
    button.dispatchEvent(new MouseEvent('mouseenter'))
    button.click()
    expect(open()).toBeFalse()
    fixture.componentInstance.text.set(null)
    fixture.detectChanges()
    button.dispatchEvent(new MouseEvent('mouseenter'))
    expect(open()).toBeFalse()
  })

  it('removes the bubble when destroyed', () => {
    button.dispatchEvent(new MouseEvent('mouseenter'))
    expect(bubble()).not.toBeNull()
    fixture.destroy()
    expect(bubble()).toBeNull()
  })

  it('sits below an anchor at the top of a 600 px viewport and above one at its bottom', () => {
    spyOnProperty(window, 'innerHeight').and.returnValue(600)
    spyOnProperty(window, 'innerWidth').and.returnValue(800)
    const rect = (top: number): DOMRect => new DOMRect(100, top, 36, 36)

    spyOn(button, 'getBoundingClientRect').and.returnValue(rect(20))
    button.dispatchEvent(new MouseEvent('mouseenter'))
    const height = bubble()?.getBoundingClientRect().height ?? 0
    expect(parseFloat(bubble()?.style.top ?? '')).toBe(20 + 36 + 8)
    button.dispatchEvent(new MouseEvent('mouseleave'))

    ;(button.getBoundingClientRect as jasmine.Spy).and.returnValue(rect(550))
    button.dispatchEvent(new MouseEvent('mouseenter'))
    const top = parseFloat(bubble()?.style.top ?? '')
    expect(top).toBeLessThan(550)
    expect(top).toBeCloseTo(550 - 8 - height, 0)
  })
})
