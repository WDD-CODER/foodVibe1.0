import { Component, ElementRef, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SelectOnFocusDirective } from './select-on-focus.directive'

@Component({
  standalone: true,
  imports: [SelectOnFocusDirective],
  template: `
    <input appSelectOnFocus #inputField />
    <input appSelectOnFocus type="number" #numberField />
  `
})
class TestHostComponent {
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputField')
  readonly numberElement = viewChild.required<ElementRef<HTMLInputElement>>('numberField')
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

  it('does not throw on a number input', () => {
    const numberEl = host.numberElement().nativeElement
    numberEl.value = '5'
    expect(() => numberEl.dispatchEvent(new Event('focus'))).not.toThrow()
  })
})
