import { Injectable, OnDestroy, computed, signal } from '@angular/core'

/** One step's countdown: seconds left, the start time reset returns to, and its state. */
export interface StepCountdown {
  left: number
  base: number
  paused: boolean
  finished: boolean
}

/** One step's stopwatch: seconds counted up and whether it is held. */
export interface StepStopwatch {
  elapsed: number
  paused: boolean
}

/**
 * Per-step clocks for Cook View (plan 404): every step can own one countdown and one stopwatch, and
 * all of them keep running while the cook moves between steps. One shared 1s tick drives every
 * running clock. Component-scoped (provided on CookViewPage) — destroyed with the page.
 */
@Injectable()
export class CookTimerService implements OnDestroy {
  // ---- SIGNALS ----
  /** Countdown per step index. A step with no entry has no countdown. */
  readonly countdowns_ = signal<Record<number, StepCountdown>>({})
  /** Stopwatch per step index. A step with no entry has no stopwatch. */
  readonly stopwatches_ = signal<Record<number, StepStopwatch>>({})
  private tickId_: ReturnType<typeof setInterval> | null = null

  // ---- COMPUTED ----
  /** The clock the page header shows: a finished countdown first, else the earliest running one. */
  readonly headerTimer_ = computed(() => {
    const entries = Object.entries(this.countdowns_()).map(([k, c]) => ({ step: Number(k), c }))
    const pick = entries.find((e) => e.c.finished) ?? entries.find((e) => !e.c.paused)
    return pick ? { step: pick.step, display: this.formatSeconds(pick.c.left), finished: pick.c.finished } : null
  })

  ngOnDestroy(): void {
    this.cancelAll()
  }

  // ---- COUNTDOWN ----
  hasCountdown(step: number): boolean {
    return this.countdowns_()[step] !== undefined
  }

  isTimerPaused(step: number): boolean {
    return this.countdowns_()[step]?.paused ?? false
  }

  isTimerFinished(step: number): boolean {
    return this.countdowns_()[step]?.finished ?? false
  }

  timerDisplay(step: number): string {
    return this.formatSeconds(this.countdowns_()[step]?.left ?? 0)
  }

  /** Add (or restart) this step's countdown and run it. */
  startTimer(step: number, totalSeconds: number): void {
    if (totalSeconds <= 0) return
    this.setCountdown(step, { left: totalSeconds, base: totalSeconds, paused: false, finished: false })
  }

  /** Hold the countdown; the remaining seconds are kept. */
  pauseTimer(step: number): void {
    const c = this.countdowns_()[step]
    if (!c || c.finished) return
    this.setCountdown(step, { ...c, paused: true })
  }

  /** Continue a paused countdown from the seconds it had left. */
  resumeTimer(step: number): void {
    const c = this.countdowns_()[step]
    if (!c || c.finished || c.left <= 0) return
    this.setCountdown(step, { ...c, paused: false })
  }

  toggleTimer(step: number): void {
    if (this.isTimerPaused(step)) this.resumeTimer(step)
    else this.pauseTimer(step)
  }

  /** Back to the starting time, paused. Also clears a finished alert. */
  resetTimer(step: number): void {
    const c = this.countdowns_()[step]
    if (!c) return
    this.setCountdown(step, { left: c.base, base: c.base, paused: true, finished: false })
  }

  /** A new starting time (the edited countdown): it becomes the reset time and the clock holds. */
  setTimerTime(step: number, totalSeconds: number): void {
    if (totalSeconds <= 0) return
    this.setCountdown(step, { left: totalSeconds, base: totalSeconds, paused: true, finished: false })
  }

  /** Clear a finished countdown's alert (removes that clock). */
  dismissTimerDone(step: number): void {
    this.cancelTimer(step)
  }

  /** Remove this step's countdown. */
  cancelTimer(step: number): void {
    const { [step]: _removed, ...rest } = this.countdowns_()
    this.countdowns_.set(rest)
    this.syncTick()
  }

  // ---- STOPWATCH ----
  hasStopwatch(step: number): boolean {
    return this.stopwatches_()[step] !== undefined
  }

  isStopwatchPaused(step: number): boolean {
    return this.stopwatches_()[step]?.paused ?? false
  }

  stopwatchDisplay(step: number): string {
    return this.formatSeconds(this.stopwatches_()[step]?.elapsed ?? 0)
  }

  /** Add (or restart) this step's stopwatch from 0:00 and run it. */
  startStopwatch(step: number): void {
    this.setStopwatch(step, { elapsed: 0, paused: false })
  }

  pauseStopwatch(step: number): void {
    const s = this.stopwatches_()[step]
    if (s) this.setStopwatch(step, { ...s, paused: true })
  }

  resumeStopwatch(step: number): void {
    const s = this.stopwatches_()[step]
    if (s) this.setStopwatch(step, { ...s, paused: false })
  }

  toggleStopwatch(step: number): void {
    if (this.isStopwatchPaused(step)) this.resumeStopwatch(step)
    else this.pauseStopwatch(step)
  }

  /** Back to 0:00, paused (the stopwatch stays on its step). */
  resetStopwatch(step: number): void {
    if (this.hasStopwatch(step)) this.setStopwatch(step, { elapsed: 0, paused: true })
  }

  /** Remove this step's stopwatch. */
  stopStopwatch(step: number): void {
    const { [step]: _removed, ...rest } = this.stopwatches_()
    this.stopwatches_.set(rest)
    this.syncTick()
  }

  /** Remove every clock (a different recipe was opened). */
  cancelAll(): void {
    this.countdowns_.set({})
    this.stopwatches_.set({})
    this.syncTick()
  }

  // ---- TICK ----
  private setCountdown(step: number, c: StepCountdown): void {
    this.countdowns_.update((all) => ({ ...all, [step]: c }))
    this.syncTick()
  }

  private setStopwatch(step: number, s: StepStopwatch): void {
    this.stopwatches_.update((all) => ({ ...all, [step]: s }))
    this.syncTick()
  }

  /** Run the shared tick only while at least one clock is running. */
  private syncTick(): void {
    const running =
      Object.values(this.countdowns_()).some((c) => !c.paused && !c.finished) ||
      Object.values(this.stopwatches_()).some((s) => !s.paused)
    if (running && this.tickId_ === null) {
      this.tickId_ = setInterval(() => this.tick(), 1000)
    } else if (!running && this.tickId_ !== null) {
      clearInterval(this.tickId_)
      this.tickId_ = null
    }
  }

  private tick(): void {
    this.countdowns_.update((all) => {
      const next: Record<number, StepCountdown> = {}
      for (const [k, c] of Object.entries(all)) {
        if (c.paused || c.finished) {
          next[Number(k)] = c
          continue
        }
        const left = c.left - 1
        next[Number(k)] = left <= 0 ? { ...c, left: 0, finished: true } : { ...c, left }
      }
      return next
    })
    this.stopwatches_.update((all) => {
      const next: Record<number, StepStopwatch> = {}
      for (const [k, s] of Object.entries(all)) next[Number(k)] = s.paused ? s : { ...s, elapsed: s.elapsed + 1 }
      return next
    })
    this.syncTick()
  }

  private formatSeconds(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`
  }
}
