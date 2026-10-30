import { Directive, OnDestroy, input, output } from '@angular/core'

/**
 * Plan 500 — the one press-and-hold behaviour for every +/- button around a number.
 * Put it on a button: `appStepHold (stepHold)="step(-1, $event)"`.
 * - pointerdown (touch and mouse) emits one step (`0`), then after a delay repeats with 1, 2, 3 … (the repeat count
 *   of this press; it restarts at 1 on every new press, so a release resets the step size).
 * - pointerup / pointerleave / pointercancel stop the repeat.
 * - A keyboard activation (click with detail 0) emits one step.
 * - `stepHoldStop` true (limit reached, e.g. the minimum) stops the repeat.
 */
@Directive({
  selector: '[appStepHold]',
  standalone: true,
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'stop()',
    '(pointerleave)': 'stop()',
    '(pointercancel)': 'stop()',
    '(contextmenu)': '$event.preventDefault()',
    '(click)': 'onClick($event)'
  }
})
export class StepHoldDirective implements OnDestroy {
  /** True when the limit (minimum / maximum) is reached — the repeat stops. */
  stepHoldStop = input<boolean>(false)

  /** Emits `0` for the first step of a press and 1, 2, 3 … for every repeated step. */
  stepHold = output<number>()

  static readonly REPEAT_DELAY_MS = 500
  static readonly REPEAT_INTERVAL_MS = 80

  private timer_: ReturnType<typeof setTimeout> | null = null

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    this.stop()
    if (this.stepHoldStop()) return
    this.stepHold.emit(0)
    let repeat = 0
    const tick = (): void => {
      if (this.stepHoldStop()) {
        this.stop()
        return
      }
      repeat += 1
      this.stepHold.emit(repeat)
      this.timer_ = setTimeout(tick, StepHoldDirective.REPEAT_INTERVAL_MS)
    }
    this.timer_ = setTimeout(tick, StepHoldDirective.REPEAT_DELAY_MS)
  }

  protected onClick(event: MouseEvent): void {
    event.preventDefault()
    // detail 0 = keyboard / assistive activation; a pointer press was already handled on pointerdown
    if (event.detail === 0 && !this.stepHoldStop()) this.stepHold.emit(0)
  }

  stop(): void {
    if (this.timer_ == null) return
    clearTimeout(this.timer_)
    this.timer_ = null
  }

  ngOnDestroy(): void {
    this.stop()
  }
}
