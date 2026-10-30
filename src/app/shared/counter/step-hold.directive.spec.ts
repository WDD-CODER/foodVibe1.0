import { Component } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { StepHoldDirective } from './step-hold.directive'

@Component({
  standalone: true,
  imports: [StepHoldDirective],
  template: '<button type="button" appStepHold (stepHold)="log.push($event)">+</button>'
})
class HostComponent {
  log: number[] = []
}

describe('StepHoldDirective (plan 511: repeat count)', () => {
  let fixture: ComponentFixture<HostComponent>
  let button: HTMLButtonElement

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
    button = fixture.nativeElement.querySelector('button')
  })

  const down = (): void => {
    button.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, cancelable: true }))
  }
  const up = (): void => {
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  }

  it('emits 0 on press, then 1, 2, 3 … while held', fakeAsync(() => {
    down()
    tick(StepHoldDirective.REPEAT_DELAY_MS)
    tick(StepHoldDirective.REPEAT_INTERVAL_MS * 2)
    up()
    expect(fixture.componentInstance.log).toEqual([0, 1, 2, 3])
  }))

  it('the repeat count restarts on the next press after a release', fakeAsync(() => {
    down()
    tick(StepHoldDirective.REPEAT_DELAY_MS + StepHoldDirective.REPEAT_INTERVAL_MS)
    up()
    fixture.componentInstance.log.length = 0
    down()
    tick(StepHoldDirective.REPEAT_DELAY_MS)
    up()
    expect(fixture.componentInstance.log).toEqual([0, 1])
  }))

  it('a keyboard activation emits one step (0)', () => {
    button.click()
    expect(fixture.componentInstance.log).toEqual([0])
  })
})
