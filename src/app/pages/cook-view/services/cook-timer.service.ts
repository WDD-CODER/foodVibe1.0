import { Injectable, OnDestroy, computed, signal } from '@angular/core'

/**
 * Focus-mode countdown timer + stopwatch for a single cook-view step card.
 * Component-scoped (provided on CookViewPage) — one instance per page visit,
 * destroyed (and its intervals cleared) when the page is.
 */
@Injectable()
export class CookTimerService implements OnDestroy {
  // ---- COOK TIMER SIGNALS ----
  /** Which step card has an active countdown timer (null = none). */
  activeTimerStepIndex_ = signal<number | null>(null)
  /** Current countdown value in seconds. */
  timerSecondsLeft_ = signal<number>(0)
  /** Step index whose countdown just finished (null = none). Cleared by dismissTimerDone(). */
  timerFinishedStepIndex_ = signal<number | null>(null)
  private timerIntervalId_: ReturnType<typeof setInterval> | null = null

  // ---- COOK TIMER INPUT SIGNALS ----
  timerInputExpandedIndex_ = signal<number | null>(null)
  timerCustomInput_ = signal<string>('')

  // ---- STOPWATCH SIGNALS ----
  stopwatchStepIndex_ = signal<number | null>(null)
  stopwatchSecondsElapsed_ = signal<number>(0)
  stopwatchPaused_ = signal<boolean>(false)
  private stopwatchIntervalId_: ReturnType<typeof setInterval> | null = null

  // ---- COMPUTED SIGNALS ----
  /** Formatted timer display (m:ss under 1h, h:mm:ss at 1h+). */
  timerDisplay_ = computed(() => this.formatSeconds(this.timerSecondsLeft_()))

  /** Formatted stopwatch display (count-up, same format as timerDisplay_). */
  stopwatchDisplay_ = computed(() => this.formatSeconds(this.stopwatchSecondsElapsed_()))

  ngOnDestroy(): void {
    this.cancelTimer()
    this.stopStopwatch()
  }

  /** Start a countdown timer on a step card. */
  startTimer(stepIndex: number, totalSeconds: number): void {
    if (this.timerIntervalId_ !== null) {
      clearInterval(this.timerIntervalId_)
    }
    this.timerFinishedStepIndex_.set(null)
    this.activeTimerStepIndex_.set(stepIndex)
    this.timerSecondsLeft_.set(totalSeconds)
    this.timerIntervalId_ = setInterval(() => {
      this.timerSecondsLeft_.update((s) => s - 1)
      if (this.timerSecondsLeft_() <= 0) {
        clearInterval(this.timerIntervalId_!)
        this.timerIntervalId_ = null
        this.timerFinishedStepIndex_.set(this.activeTimerStepIndex_())
        this.activeTimerStepIndex_.set(null)
        this.timerSecondsLeft_.set(0)
      }
    }, 1000)
  }

  /** Cancel the active countdown timer. */
  cancelTimer(): void {
    if (this.timerIntervalId_ !== null) {
      clearInterval(this.timerIntervalId_)
      this.timerIntervalId_ = null
    }
    this.activeTimerStepIndex_.set(null)
    this.timerFinishedStepIndex_.set(null)
    this.timerSecondsLeft_.set(0)
  }

  /** Dismiss the timer-done alert for a finished step. */
  dismissTimerDone(): void {
    this.timerFinishedStepIndex_.set(null)
  }

  /** Expand the h:mm input for a step, pre-filling with the step's preset cooking time. */
  expandTimerInput(stepIndex: number, presetMinutes: number): void {
    const h = Math.floor(presetMinutes / 60)
    const m = presetMinutes % 60
    this.timerCustomInput_.set(h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${presetMinutes}`)
    this.timerInputExpandedIndex_.set(stepIndex)
  }

  /** Parse the h:mm input and start the countdown timer. */
  confirmTimerInput(stepIndex: number): void {
    const raw = this.timerCustomInput_().trim()
    let totalMinutes = 0
    if (raw.includes(':')) {
      const parts = raw.split(':')
      const h = parseInt(parts[0], 10) || 0
      const m = parseInt(parts[1], 10) || 0
      totalMinutes = h * 60 + m
    } else {
      totalMinutes = parseInt(raw, 10) || 0
    }
    if (totalMinutes > 0) {
      this.startTimer(stepIndex, totalMinutes)
    }
    this.timerInputExpandedIndex_.set(null)
    this.timerCustomInput_.set('')
  }

  /** Dismiss the h:mm input without starting a timer. */
  cancelTimerInput(): void {
    this.timerInputExpandedIndex_.set(null)
    this.timerCustomInput_.set('')
  }

  /** Start a count-up stopwatch on a step card. */
  startStopwatch(stepIndex: number): void {
    if (this.stopwatchIntervalId_ !== null) {
      clearInterval(this.stopwatchIntervalId_)
    }
    this.stopwatchStepIndex_.set(stepIndex)
    this.stopwatchSecondsElapsed_.set(0)
    this.stopwatchPaused_.set(false)
    this.stopwatchIntervalId_ = setInterval(() => {
      this.stopwatchSecondsElapsed_.update((s) => s + 1)
    }, 1000)
  }

  /** Pause the running stopwatch. */
  pauseStopwatch(): void {
    if (this.stopwatchIntervalId_ !== null) {
      clearInterval(this.stopwatchIntervalId_)
      this.stopwatchIntervalId_ = null
    }
    this.stopwatchPaused_.set(true)
  }

  /** Resume a paused stopwatch from where it left off. */
  resumeStopwatch(): void {
    this.stopwatchPaused_.set(false)
    this.stopwatchIntervalId_ = setInterval(() => {
      this.stopwatchSecondsElapsed_.update((s) => s + 1)
    }, 1000)
  }

  /** Toggle pause/resume on the active stopwatch. */
  toggleStopwatch(): void {
    if (this.stopwatchPaused_()) {
      this.resumeStopwatch()
    } else {
      this.pauseStopwatch()
    }
  }

  /** Close and reset the active stopwatch. */
  stopStopwatch(): void {
    if (this.stopwatchIntervalId_ !== null) {
      clearInterval(this.stopwatchIntervalId_)
      this.stopwatchIntervalId_ = null
    }
    this.stopwatchStepIndex_.set(null)
    this.stopwatchSecondsElapsed_.set(0)
    this.stopwatchPaused_.set(false)
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
