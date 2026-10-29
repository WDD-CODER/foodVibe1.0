import { Component, ElementRef, signal, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TextareaAutoGrowDirective } from './textarea-auto-grow.directive'

@Component({
  standalone: true,
  imports: [TextareaAutoGrowDirective],
  template: '<textarea appTextareaAutoGrow #box rows="1" style="width: 200px" [value]="text_()"></textarea>'
})
class TestHostComponent {
  readonly box = viewChild.required<ElementRef<HTMLTextAreaElement>>('box')
  readonly text_ = signal('')
}

describe('TextareaAutoGrowDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let box: HTMLTextAreaElement
  const lines = (n: number): string => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n')

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents()
    fixture = TestBed.createComponent(TestHostComponent)
    fixture.detectChanges()
    box = fixture.componentInstance.box().nativeElement
  })

  it('keeps the 40px minimum for an empty box', () => {
    expect(parseFloat(box.style.height)).toBeGreaterThanOrEqual(40)
  })

  it('hides the inner scrollbar', () => {
    expect(box.style.overflowY).toBe('hidden')
  })

  it('grows to its scrollHeight after typing', () => {
    box.value = lines(25)
    box.dispatchEvent(new Event('input'))
    expect(parseFloat(box.style.height)).toBe(Math.max(box.scrollHeight, 40))
    expect(box.scrollHeight).toBeGreaterThan(200)
  })

  it('follows a programmatic value change, growing and shrinking', () => {
    fixture.componentInstance.text_.set(lines(25))
    fixture.detectChanges()
    const tall = parseFloat(box.style.height)
    expect(tall).toBeGreaterThan(200)

    fixture.componentInstance.text_.set(lines(2))
    fixture.detectChanges()
    expect(parseFloat(box.style.height)).toBeLessThan(tall)
  })
})

@Component({
  standalone: true,
  imports: [TextareaAutoGrowDirective],
  template: '<textarea #box rows="1" style="width: 200px" [value]="text_()"></textarea>'
})
class PlainTextareaHostComponent {
  readonly box = viewChild.required<ElementRef<HTMLTextAreaElement>>('box')
  readonly text_ = signal('')
}

describe('TextareaAutoGrowDirective on a plain textarea', () => {
  it('grows a textarea that has no attribute, because the selector is every textarea', () => {
    const fixture = TestBed.createComponent(PlainTextareaHostComponent)
    fixture.detectChanges()
    const box = fixture.componentInstance.box().nativeElement
    expect(box.style.overflowY).toBe('hidden')
    const before = box.offsetHeight
    fixture.componentInstance.text_.set(Array.from({ length: 12 }, (_, i) => `line ${i}`).join('\n'))
    fixture.detectChanges()
    expect(box.offsetHeight).toBeGreaterThan(before)
  })
})
