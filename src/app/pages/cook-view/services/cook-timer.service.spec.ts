import { fakeAsync, tick } from '@angular/core/testing'
import { CookTimerService } from './cook-timer.service'

describe('CookTimerService', () => {
  let timer: CookTimerService

  beforeEach(() => {
    timer = new CookTimerService()
  })

  afterEach(() => {
    timer.ngOnDestroy()
  })

  it('counts a step countdown down once started', fakeAsync(() => {
    timer.startTimer(2, 10)
    tick(3000)
    expect(timer.timerDisplay(2)).toBe('0:07')
    expect(timer.hasCountdown(2)).toBeTrue()
    expect(timer.isTimerPaused(2)).toBeFalse()
    timer.cancelAll()
  }))

  it('pause keeps the remaining seconds; resume continues from there', fakeAsync(() => {
    timer.startTimer(0, 10)
    tick(4000)
    timer.pauseTimer(0)
    tick(5000)
    expect(timer.countdowns_()[0].left).toBe(6)
    expect(timer.isTimerPaused(0)).toBeTrue()
    timer.resumeTimer(0)
    tick(2000)
    expect(timer.countdowns_()[0].left).toBe(4)
    timer.cancelAll()
  }))

  it('toggle pauses a running countdown and resumes a paused one', fakeAsync(() => {
    timer.startTimer(1, 10)
    timer.toggleTimer(1)
    expect(timer.isTimerPaused(1)).toBeTrue()
    timer.toggleTimer(1)
    tick(1000)
    expect(timer.countdowns_()[1].left).toBe(9)
    timer.cancelAll()
  }))

  it('reset returns to the starting time, paused', fakeAsync(() => {
    timer.startTimer(3, 60)
    tick(10000)
    timer.resetTimer(3)
    tick(5000)
    expect(timer.countdowns_()[3].left).toBe(60)
    expect(timer.isTimerPaused(3)).toBeTrue()
  }))

  it('a finished countdown stays on its step until reset or dismissed', fakeAsync(() => {
    timer.startTimer(4, 3)
    tick(3000)
    expect(timer.isTimerFinished(4)).toBeTrue()
    expect(timer.headerTimer_()).toEqual({ step: 4, display: '0:00', finished: true })
    timer.resetTimer(4)
    expect(timer.isTimerFinished(4)).toBeFalse()
    expect(timer.countdowns_()[4].left).toBe(3)
    timer.dismissTimerDone(4)
    expect(timer.hasCountdown(4)).toBeFalse()
  }))

  it('setTimerTime sets a new starting time and holds the clock', fakeAsync(() => {
    timer.startTimer(0, 300)
    tick(2000)
    timer.setTimerTime(0, 90)
    tick(3000)
    expect(timer.countdowns_()[0].left).toBe(90)
    timer.resumeTimer(0)
    tick(1000)
    timer.resetTimer(0)
    expect(timer.countdowns_()[0].left).toBe(90)
  }))

  it('runs clocks on several steps at once, each on its own', fakeAsync(() => {
    timer.startTimer(0, 100)
    timer.startTimer(2, 50)
    timer.startStopwatch(0)
    timer.startStopwatch(3)
    tick(2000)
    timer.pauseTimer(2)
    timer.pauseStopwatch(3)
    tick(3000)
    expect(timer.countdowns_()[0].left).toBe(95)
    expect(timer.countdowns_()[2].left).toBe(48)
    expect(timer.stopwatches_()[0].elapsed).toBe(5)
    expect(timer.stopwatches_()[3].elapsed).toBe(2)
    timer.cancelTimer(0)
    expect(timer.hasCountdown(0)).toBeFalse()
    expect(timer.hasCountdown(2)).toBeTrue()
    timer.cancelAll()
  }))

  it('resetStopwatch goes back to zero, paused, and stays on its step', fakeAsync(() => {
    timer.startStopwatch(5)
    tick(4000)
    timer.resetStopwatch(5)
    tick(2000)
    expect(timer.stopwatchDisplay(5)).toBe('0:00')
    expect(timer.isStopwatchPaused(5)).toBeTrue()
    timer.resumeStopwatch(5)
    tick(1000)
    expect(timer.stopwatchDisplay(5)).toBe('0:01')
    timer.stopStopwatch(5)
    expect(timer.hasStopwatch(5)).toBeFalse()
  }))

  it('stops ticking when no clock is running', fakeAsync(() => {
    timer.startTimer(0, 10)
    timer.pauseTimer(0)
    tick(3000)
    expect(timer.countdowns_()[0].left).toBe(10)
  }))
})
