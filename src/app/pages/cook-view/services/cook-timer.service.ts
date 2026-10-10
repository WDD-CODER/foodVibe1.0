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
  /** True while the countdown is held (paused, reset, or its time just edited). */
  timerPaused_ = signal<boolean>(false)
  /** The countdown's starting time in seconds — what reset returns to. */
  timerBaseSecs_ = signal<number>(0)
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
  /** Step that owns the countdown clock — running, paused or finished (null = no countdown). */
  countdownStepIndex_ = computed(() => this.activeTimerStepIndex_() ?? this.timerFinishedStepIndex_())

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
    this.clearTimerInterval()
    this.timerFinishedStepIndex_.set(null)
    this.activeTimerStepIndex_.set(stepIndex)
    this.timerBaseSecs_.set(totalSeconds)
    this.timerSecondsLeft_.set(totalSeconds)
    this.timerPaused_.set(false)
    this.runTimer()
  }

  /** Hold the countdown; the remaining seconds are kept. */
  pauseTimer(): void {
    if (this.activeTimerStepIndex_() === null) return
    this.clearTimerInterval()
    this.timerPaused_.set(true)
  }

  /** Continue a paused countdown from the seconds it had left. */
  resumeTimer(): void {
    if (this.activeTimerStepIndex_() === null || !this.timerPaused_() || this.timerSecondsLeft_() <= 0) return
    this.timerPaused_.set(false)
    this.runTimer()
  }

  /** Play/pause: pauses a running countdown, resumes a paused one. */
  toggleTimer(): void {
    if (this.timerPaused_()) this.resumeTimer()
    else this.pauseTimer()
  }

  /** Back to the starting time, paused. Also clears a finished alert (the clock stays on its step). */
  resetTimer(): void {
    const stepIndex = this.countdownStepIndex_()
    if (stepIndex === null) return
    this.clearTimerInterval()
    this.timerFinishedStepIndex_.set(null)
    this.activeTimerStepIndex_.set(stepIndex)
    this.timerSecondsLeft_.set(this.timerBaseSecs_())
    this.timerPaused_.set(true)
  }

  /** Set a new starting time (an edited countdown): it becomes the reset time and the clock holds. */
  setTimerTime(stepIndex: number, totalSeconds: number): void {
    if (totalSeconds <= 0) return
    this.clearTimerInterval()
    this.timerFinishedStepIndex_.set(null)
    this.activeTimerStepIndex_.set(stepIndex)
    this.timerBaseSecs_.set(totalSeconds)
    this.timerSecondsLeft_.set(totalSeconds)
    this.timerPaused_.set(true)
  }

  /** Cancel the active countdown timer. */
  cancelTimer(): void {
    this.clearTimerInterval()
    this.activeTimerStepIndex_.set(null)
    this.timerFinishedStepIndex_.set(null)
    this.timerSecondsLeft_.set(0)
    this.timerPaused_.set(false)
  }

  private runTimer(): void {
    this.timerIntervalId_ = setInterval(() => {
      this.timerSecondsLeft_.update((s) => s - 1)
      if (this.timerSecondsLeft_() <= 0) {
        this.clearTimerInterval()
        this.timerFinishedStepIndex_.set(this.activeTimerStepIndex_())
        this.activeTimerStepIndex_.set(null)
        this.timerSecondsLeft_.set(0)
        this.timerPaused_.set(false)
      }
    }, 1000)
  }

  private clearTimerInterval(): void {
    if (this.timerIntervalId_ !== null) {
      clearInterval(this.timerIntervalId_)
      this.timerIntervalId_ = null
    }
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
    if (this.stopwatchIntervalId_ !== null) return
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

  /** Back to 0:00, paused (the stopwatch stays on its step). */
  resetStopwatch(): void {
    if (this.stopwatchStepIndex_() === null) return
    if (this.stopwatchIntervalId_ !== null) {
      clearInterval(this.stopwatchIntervalId_)
      this.stopwatchIntervalId_ = null
    }
    this.stopwatchSecondsElapsed_.set(0)
    this.stopwatchPaused_.set(true)
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
