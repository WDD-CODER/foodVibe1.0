import { Component, ElementRef, signal, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormsModule } from '@angular/forms'
import { EnglishKeyInputDirective } from './english-key-input.directive'

@Component({
  standalone: true,
  imports: [FormsModule, EnglishKeyInputDirective],
  template: '<input #field englishKeyInput [ngModel]="key_()" (ngModelChange)="key_.set($event)" />'
})
class TestHostComponent {
  readonly key_ = signal('')
  readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field')
}

describe('EnglishKeyInputDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let host: TestHostComponent
  let input: HTMLInputElement

  function keydown(init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
    input.dispatchEvent(event)
    return event
  }

  function typeRaw(value: string): void {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents()
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
    await fixture.whenStable()
    input = host.field().nativeElement
    input.focus()
  })

  it('sets the LTR / English host attributes', () => {
    expect(input.getAttribute('dir')).toBe('ltr')
    expect(input.getAttribute('lang')).toBe('en')
    expect(input.getAttribute('autocapitalize')).toBe('off')
    expect(input.getAttribute('autocorrect')).toBe('off')
    expect(input.getAttribute('spellcheck')).toBe('false')
  })

  it('types the English letter for a physical key pressed on the Hebrew layout', () => {
    const event = keydown({ code: 'KeyO', key: 'ם' })
    expect(event.defaultPrevented).toBeTrue()
    expect(input.value).toBe('o')
    expect(host.key_()).toBe('o')
  })

  it('inserts at the caret, not at the end', () => {
    typeRaw('olil')
    input.setSelectionRange(2, 2)
    keydown({ code: 'KeyI', key: 'ן' })
    keydown({ code: 'KeyV', key: 'ה' })
    expect(input.value).toBe('olivil')
    expect(input.selectionStart).toBe(4)
  })

  it('leaves the default when the key already is the English char', () => {
    const event = keydown({ code: 'KeyA', key: 'a' })
    expect(event.defaultPrevented).toBeFalse()
  })

  it('turns the space key into an underscore', () => {
    typeRaw('olive')
    const event = keydown({ code: 'Space', key: ' ' })
    expect(event.defaultPrevented).toBeTrue()
    expect(host.key_()).toBe('olive_')
  })

  it('does not intercept Ctrl / Meta / Alt combos', () => {
    expect(keydown({ code: 'KeyV', key: 'ה', ctrlKey: true }).defaultPrevented).toBeFalse()
    expect(keydown({ code: 'KeyC', key: 'ב', metaKey: true }).defaultPrevented).toBeFalse()
    expect(keydown({ code: 'KeyA', key: 'ש', altKey: true }).defaultPrevented).toBeFalse()
  })

  it('skips mobile keydown with an unidentified key', () => {
    expect(keydown({ code: '', key: 'Unidentified' }).defaultPrevented).toBeFalse()
  })

  it('normalizes pasted / mobile input live: spaces → _, lowercase', () => {
    typeRaw('Olive Oil')
    expect(input.value).toBe('olive_oil')
    expect(host.key_()).toBe('olive_oil')
  })

  it('finalizes on blur: collapse and trim underscores, hyphen → _', () => {
    typeRaw('_extra-virgin  olive_')
    input.dispatchEvent(new Event('blur'))
    expect(host.key_()).toBe('extra_virgin_olive')
  })

  it('keeps leftover Hebrew so validation can flag it', () => {
    typeRaw('olive שמן')
    input.dispatchEvent(new Event('blur'))
    expect(host.key_()).toBe('olive_שמן')
  })
})
