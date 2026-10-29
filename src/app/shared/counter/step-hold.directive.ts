import { Directive, OnDestroy, input, output } from '@angular/core'

/**
 * Plan 500 — the one press-and-hold behaviour for every +/- button around a number.
 * Put it on a button: `appStepHold (stepHold)="step(-1, $event)"`.
 * - pointerdown (touch and mouse) emits one step (`false`), then after a delay repeats with `true` (hold).
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

  /** Emits `false` for the first step of a press and `true` for every repeated step. */
  stepHold = output<boolean>()

  static readonly REPEAT_DELAY_MS = 500
  static readonly REPEAT_INTERVAL_MS = 80

  private timer_: ReturnType<typeof setTimeout> | null = null

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    this.stop()
    if (this.stepHoldStop()) return
    this.stepHold.emit(false)
    const tick = (): void => {
      if (this.stepHoldStop()) {
        this.stop()
        return
      }
      this.stepHold.emit(true)
      this.timer_ = setTimeout(tick, StepHoldDirective.REPEAT_INTERVAL_MS)
    }
    this.timer_ = setTimeout(tick, StepHoldDirective.REPEAT_DELAY_MS)
  }

  protected onClick(event: MouseEvent): void {
    event.preventDefault()
    // detail 0 = keyboard / assistive activation; a pointer press was already handled on pointerdown
    if (event.detail === 0 && !this.stepHoldStop()) this.stepHold.emit(false)
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
