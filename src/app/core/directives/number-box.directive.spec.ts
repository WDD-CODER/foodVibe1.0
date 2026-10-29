import { Component, ElementRef, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { NumberBoxDirective } from './number-box.directive'
import { SelectOnFocusDirective } from './select-on-focus.directive'

@Component({
  standalone: true,
  imports: [NumberBoxDirective, SelectOnFocusDirective],
  template: `
    <div appNumberBox class="box">
      <span #label class="label">unit</span>
      <input type="number" #field value="12" />
      <button type="button" #btn>x</button>
    </div>
    <div appNumberBox class="box">
      <span #lockedLabel>unit</span>
      <input type="number" #locked value="5" disabled />
    </div>
  `
})
class TestHostComponent {
  readonly label = viewChild.required<ElementRef<HTMLElement>>('label')
  readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field')
  readonly btn = viewChild.required<ElementRef<HTMLElement>>('btn')
  readonly lockedLabel = viewChild.required<ElementRef<HTMLElement>>('lockedLabel')
  readonly locked = viewChild.required<ElementRef<HTMLInputElement>>('locked')
}

describe('NumberBoxDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let host: TestHostComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents()
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
    document.body.appendChild(fixture.nativeElement)
  })

  afterEach(() => (document.activeElement as HTMLElement | null)?.blur())

  it('focuses and selects the number when the label is pressed', () => {
    const input = host.field().nativeElement
    const selectSpy = spyOn(input, 'select').and.callThrough()
    host.label().nativeElement.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(document.activeElement).toBe(input)
    expect(selectSpy).toHaveBeenCalled()
  })

  it('does not take the press from a button inside the box', () => {
    host.btn().nativeElement.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(document.activeElement).not.toBe(host.field().nativeElement)
  })

  it('does not focus a disabled number', () => {
    host.lockedLabel().nativeElement.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(document.activeElement).not.toBe(host.locked().nativeElement)
  })

  it('does nothing extra when the number already has focus', () => {
    const input = host.field().nativeElement
    input.focus()
    const selectSpy = spyOn(input, 'select').and.callThrough()
    host.label().nativeElement.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(selectSpy).not.toHaveBeenCalled()
  })
})
