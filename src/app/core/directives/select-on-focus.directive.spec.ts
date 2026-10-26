import { Component, ElementRef, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SelectOnFocusDirective } from './select-on-focus.directive'

@Component({
  standalone: true,
  imports: [SelectOnFocusDirective],
  template: `
    <input appSelectOnFocus #inputField />
    <input appSelectOnFocus type="number" #numberField />
    <input type="number" #plainNumberField />
  `
})
class TestHostComponent {
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputField')
  readonly numberElement = viewChild.required<ElementRef<HTMLInputElement>>('numberField')
  readonly plainNumberElement = viewChild.required<ElementRef<HTMLInputElement>>('plainNumberField')
}

describe('SelectOnFocusDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let host: TestHostComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents()
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  it('selects the text when the input is focused', () => {
    const inputEl = host.inputElement().nativeElement
    const selectSpy = spyOn(inputEl, 'select').and.callThrough()
    inputEl.dispatchEvent(new Event('focus'))
    expect(selectSpy).toHaveBeenCalled()
  })

  it('selects the whole value of a text box', () => {
    const inputEl = host.inputElement().nativeElement
    inputEl.value = '1.5'
    inputEl.dispatchEvent(new Event('focus'))
    expect(inputEl.selectionStart).toBe(0)
    expect(inputEl.selectionEnd).toBe(3)
  })

  it('default-prevents the next mouseup once, then lets later ones through', () => {
    const inputEl = host.inputElement().nativeElement
    inputEl.dispatchEvent(new Event('focus'))
    const first = new MouseEvent('mouseup', { cancelable: true })
    inputEl.dispatchEvent(first)
    expect(first.defaultPrevented).toBeTrue()
    const second = new MouseEvent('mouseup', { cancelable: true })
    inputEl.dispatchEvent(second)
    expect(second.defaultPrevented).toBeFalse()
  })

  it('does not block a mouseup when the box was not just focused', () => {
    const inputEl = host.inputElement().nativeElement
    const up = new MouseEvent('mouseup', { cancelable: true })
    inputEl.dispatchEvent(up)
    expect(up.defaultPrevented).toBeFalse()
  })

  it('forgets the pending mouseup on blur', () => {
    const inputEl = host.inputElement().nativeElement
    inputEl.dispatchEvent(new Event('focus'))
    inputEl.dispatchEvent(new Event('blur'))
    const up = new MouseEvent('mouseup', { cancelable: true })
    inputEl.dispatchEvent(up)
    expect(up.defaultPrevented).toBeFalse()
  })

  it('desktop click: selects all again on mouseup after mousedown -> focus moved the caret (plan 482)', () => {
    const inputEl = host.inputElement().nativeElement
    inputEl.value = '1.25'
    inputEl.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))
    inputEl.dispatchEvent(new Event('focus'))
    // What Chromium's mousedown default action does after focus: the caret lands at the pointer.
    inputEl.setSelectionRange(2, 2)
    const up = new MouseEvent('mouseup', { cancelable: true })
    inputEl.dispatchEvent(up)
    expect(up.defaultPrevented).toBeTrue()
    expect(inputEl.selectionStart).toBe(0)
    expect(inputEl.selectionEnd).toBe(4)
  })

  it('touch: focus alone selects the whole value (plan 482 keeps the mobile behaviour)', () => {
    const inputEl = host.inputElement().nativeElement
    inputEl.value = '1.25'
    inputEl.dispatchEvent(new Event('focus'))
    expect(inputEl.selectionStart).toBe(0)
    expect(inputEl.selectionEnd).toBe(4)
  })

  it('desktop click on a number box re-selects on mouseup', () => {
    const numberEl = host.numberElement().nativeElement
    numberEl.value = '5'
    numberEl.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))
    numberEl.dispatchEvent(new Event('focus'))
    const selectSpy = spyOn(numberEl, 'select').and.callThrough()
    numberEl.dispatchEvent(new MouseEvent('mouseup', { cancelable: true }))
    expect(selectSpy).toHaveBeenCalledTimes(1)
  })

  it('a number box without the attribute gets select-all too (input[type=number] selector)', () => {
    const plainEl = host.plainNumberElement().nativeElement
    const selectSpy = spyOn(plainEl, 'select').and.callThrough()
    plainEl.dispatchEvent(new Event('focus'))
    expect(selectSpy).toHaveBeenCalled()
  })

  it('a click into a box that already has focus keeps the caret', () => {
    const inputEl = host.inputElement().nativeElement
    inputEl.value = '1.25'
    inputEl.focus()
    inputEl.dispatchEvent(new MouseEvent('mouseup', { cancelable: true }))
    inputEl.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))
    inputEl.setSelectionRange(1, 1)
    const up = new MouseEvent('mouseup', { cancelable: true })
    inputEl.dispatchEvent(up)
    expect(up.defaultPrevented).toBeFalse()
    expect(inputEl.selectionStart).toBe(1)
  })

  it('does not throw on a number input', () => {
    const numberEl = host.numberElement().nativeElement
    numberEl.value = '5'
    expect(() => numberEl.dispatchEvent(new Event('focus'))).not.toThrow()
  })
})
