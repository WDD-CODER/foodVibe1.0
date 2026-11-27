import { engineUnitKey, fromShown, shownRange, toShown } from './assistant-engine.util'
import type { EngineRange } from './assistant-engine.util'

const TIME: EngineRange = { min: 1000, max: 15000, unit: 'ms' }
const COUNT: EngineRange = { min: 1, max: 50, unit: 'turns' }

describe('assistant engine numbers (plan 760)', () => {
  it('shows a time in seconds with one decimal and a count as it is', () => {
    expect(toShown(3000, 'ms')).toBe('3.0')
    expect(toShown(35000, 'ms')).toBe('35.0')
    expect(toShown(8, 'turns')).toBe('8')
    expect(shownRange(TIME)).toBe('1.0–15.0')
    expect(shownRange({ min: 3550, max: 30000, unit: 'ms' })).toBe('3.6–30.0')
    expect(shownRange(COUNT)).toBe('1–50')
  })

  it('reads the box back inside the range only', () => {
    expect(fromShown('4', TIME)).toBe(4000)
    expect(fromShown('2.5', TIME)).toBe(2500)
    expect(fromShown('1', TIME)).toBe(1000)
    expect(fromShown('15', TIME)).toBe(15000)
    expect(fromShown('0.9', TIME)).toBeNull()
    expect(fromShown('15.1', TIME)).toBeNull()
    expect(fromShown('', TIME)).toBeNull()
    expect(fromShown('abc', TIME)).toBeNull()
    expect(fromShown('12', COUNT)).toBe(12)
    expect(fromShown('1.5', COUNT)).toBeNull()
    expect(fromShown('0', COUNT)).toBeNull()
    expect(fromShown('51', COUNT)).toBeNull()
  })

  it('names the unit', () => {
    expect(engineUnitKey('ms')).toBe('asr_unit_seconds')
    expect(engineUnitKey('chars')).toBe('asr_unit_chars')
  })
})
