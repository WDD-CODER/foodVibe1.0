import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ListRowCheckboxComponent } from './list-row-checkbox.component'

@Component({
  standalone: true,
  imports: [ListRowCheckboxComponent],
  template: '<div [style.--row-checkbox-size]="size"><app-list-row-checkbox /></div>'
})
class HostComponent {
  size: string | null = null
}

describe('ListRowCheckboxComponent (plan 658)', () => {
  let fixture: ComponentFixture<HostComponent>

  const box = (): HTMLInputElement => fixture.nativeElement.querySelector('input[type="checkbox"]')

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] })
    fixture = TestBed.createComponent(HostComponent)
  })

  it('takes its size from --row-checkbox-size', () => {
    fixture.componentInstance.size = '2rem'
    fixture.detectChanges()
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(parseFloat(getComputedStyle(box()).width)).toBeCloseTo(2 * rem, 0)
    expect(parseFloat(getComputedStyle(box()).height)).toBeCloseTo(2 * rem, 0)
  })

  it('keeps its default size when the property is not set', () => {
    fixture.detectChanges()
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const width = parseFloat(getComputedStyle(box()).width)
    expect(width).toBeLessThan(1 * rem)
    expect(width).toBeGreaterThan(0)
  })
})
