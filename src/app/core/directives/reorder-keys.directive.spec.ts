import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { ReorderKeysDirective } from './reorder-keys.directive'

@Component({
  standalone: true,
  imports: [ReorderKeysDirective],
  template: `
    <div class="c-drag-list">
      <span
        class="handle"
        appReorderKeys
        [reorderIndex]="index()"
        [reorderCount]="count()"
        [reorderKey]="'a'"
        (reorder)="steps.push($event)"
      ></span>
    </div>
  `
})
class HostComponent {
  readonly index = signal(1)
  readonly count = signal(3)
  readonly steps: number[] = []
}

describe('ReorderKeysDirective', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  const handle = (): HTMLElement => fixture.debugElement.query(By.css('.handle')).nativeElement

  function press(key: 'ArrowUp' | 'ArrowDown'): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true })
    handle().dispatchEvent(event)
    return event
  }

  it('makes the handle a focusable button', () => {
    expect(handle().getAttribute('tabindex')).toBe('0')
    expect(handle().getAttribute('role')).toBe('button')
  })

  it('emits -1 for the up arrow and 1 for the down arrow', () => {
    press('ArrowUp')
    press('ArrowDown')
    expect(host.steps).toEqual([-1, 1])
  })

  it('does not emit when the move would leave the list', () => {
    host.index.set(0)
    fixture.detectChanges()
    press('ArrowUp')
    host.index.set(2)
    fixture.detectChanges()
    press('ArrowDown')
    expect(host.steps).toEqual([])
  })

  it('stops the page from scrolling', () => {
    expect(press('ArrowDown').defaultPrevented).toBeTrue()
  })
})
