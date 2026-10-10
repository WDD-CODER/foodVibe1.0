import { fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing'
import { CookTimerService } from './cook-timer.service'

describe('CookTimerService', () => {
  let timer: CookTimerService

  beforeEach(() => {
    timer = new CookTimerService()
  })

  afterEach(() => {
    timer.ngOnDestroy()
  })

  it('counts down once started', fakeAsync(() => {
    timer.startTimer(2, 10)
    tick(3000)
    expect(timer.timerSecondsLeft_()).toBe(7)
    expect(timer.countdownStepIndex_()).toBe(2)
    expect(timer.timerPaused_()).toBeFalse()
    timer.cancelTimer()
  }))

  it('pause keeps the remaining seconds and stops the count', fakeAsync(() => {
    timer.startTimer(0, 10)
    tick(4000)
    timer.pauseTimer()
    tick(5000)
    expect(timer.timerSecondsLeft_()).toBe(6)
    expect(timer.timerPaused_()).toBeTrue()
    expect(timer.activeTimerStepIndex_()).toBe(0)
  }))

  it('resume continues from where it paused', fakeAsync(() => {
    timer.startTimer(0, 10)
    tick(2000)
    timer.pauseTimer()
    tick(3000)
    timer.resumeTimer()
    tick(2000)
    expect(timer.timerSecondsLeft_()).toBe(6)
    expect(timer.timerPaused_()).toBeFalse()
    timer.cancelTimer()
  }))

  it('toggle pauses a running countdown and resumes a paused one', fakeAsync(() => {
    timer.startTimer(1, 10)
    timer.toggleTimer()
    expect(timer.timerPaused_()).toBeTrue()
    timer.toggleTimer()
    expect(timer.timerPaused_()).toBeFalse()
    tick(1000)
    expect(timer.timerSecondsLeft_()).toBe(9)
    timer.cancelTimer()
  }))

  it('reset returns to the starting time, paused', fakeAsync(() => {
    timer.startTimer(3, 60)
    tick(10000)
    timer.resetTimer()
    tick(5000)
    expect(timer.timerSecondsLeft_()).toBe(60)
    expect(timer.timerPaused_()).toBeTrue()
    expect(timer.countdownStepIndex_()).toBe(3)
  }))

  it('finishing marks the step and reset brings the clock back on that step', fakeAsync(() => {
    timer.startTimer(4, 3)
    tick(3000)
    expect(timer.timerFinishedStepIndex_()).toBe(4)
    expect(timer.activeTimerStepIndex_()).toBeNull()
    expect(timer.countdownStepIndex_()).toBe(4)
    timer.resetTimer()
    expect(timer.timerFinishedStepIndex_()).toBeNull()
    expect(timer.activeTimerStepIndex_()).toBe(4)
    expect(timer.timerSecondsLeft_()).toBe(3)
    expect(timer.timerPaused_()).toBeTrue()
  }))

  it('setTimerTime sets a new starting time and holds the clock', fakeAsync(() => {
    timer.startTimer(0, 300)
    tick(2000)
    timer.setTimerTime(0, 90)
    tick(3000)
    expect(timer.timerSecondsLeft_()).toBe(90)
    expect(timer.timerPaused_()).toBeTrue()
    timer.resumeTimer()
    tick(1000)
    expect(timer.timerSecondsLeft_()).toBe(89)
    timer.resetTimer()
    expect(timer.timerSecondsLeft_()).toBe(90)
  }))

  it('resetStopwatch goes back to zero, paused, and stays on its step', fakeAsync(() => {
    timer.startStopwatch(5)
    tick(4000)
    timer.resetStopwatch()
    tick(2000)
    expect(timer.stopwatchSecondsElapsed_()).toBe(0)
    expect(timer.stopwatchPaused_()).toBeTrue()
    expect(timer.stopwatchStepIndex_()).toBe(5)
    timer.resumeStopwatch()
    tick(1000)
    expect(timer.stopwatchSecondsElapsed_()).toBe(1)
    timer.stopStopwatch()
    discardPeriodicTasks()
  }))
})
