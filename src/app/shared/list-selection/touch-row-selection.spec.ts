import { Injector, runInInjectionContext } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ListSelectionState } from './list-selection.state'
import { TouchRowSelection } from './touch-row-selection'

function press(x = 0, y = 0): PointerEvent {
  const target = document.createElement('div')
  const event = new PointerEvent('pointerdown', { button: 0, clientX: x, clientY: y })
  Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('TouchRowSelection', () => {
  let selection: ListSelectionState

  function create(touch: boolean): TouchRowSelection {
    spyOn(window, 'matchMedia').and.returnValue({ matches: touch } as MediaQueryList)
    return runInInjectionContext(
      TestBed.inject(Injector),
      () => new TouchRowSelection({ selection, historyKey: 'test' })
    )
  }

  beforeEach(() => {
    jasmine.clock().install()
    selection = new ListSelectionState()
  })

  afterEach(() => jasmine.clock().uninstall())

  it('selects a row after a long press and swallows the click that follows', () => {
    const touch = create(true)
    touch.onPointerDown('a', press())
    jasmine.clock().tick(500)
    expect(selection.isSelected('a')).toBeTrue()
    expect(touch.consumeClick()).toBeTrue()
    expect(touch.consumeClick()).toBeFalse()
  })

  it('does not select when the finger moves (a scroll)', () => {
    const touch = create(true)
    touch.onPointerDown('a', press())
    touch.onPointerMove(new PointerEvent('pointermove', { clientX: 0, clientY: 30 }))
    jasmine.clock().tick(600)
    expect(selection.selectionMode()).toBeFalse()
  })

  it('does nothing on mouse devices', () => {
    const touch = create(false)
    touch.onPointerDown('a', press())
    jasmine.clock().tick(600)
    expect(selection.selectionMode()).toBeFalse()
  })
})
