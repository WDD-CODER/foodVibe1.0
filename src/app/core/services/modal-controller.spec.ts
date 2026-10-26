import { isTopModalShell, ModalController, popModalShell, pushModalShell } from './modal-controller'

describe('ModalController', () => {
  it('starts closed', () => {
    const controller = new ModalController<string | null>(null)
    expect(controller.isOpen_()).toBeFalse()
  })

  it('open() shows the popup and resolves with the closing result', async () => {
    const controller = new ModalController<string | null>(null)
    const pending = controller.open()
    expect(controller.isOpen_()).toBeTrue()
    controller.close('chosen')
    expect(controller.isOpen_()).toBeFalse()
    expect(await pending).toBe('chosen')
  })

  it('close() without a result resolves with the cancel value', async () => {
    const controller = new ModalController<string | null>(null)
    const pending = controller.open()
    controller.close()
    expect(await pending).toBeNull()
  })

  it('a second open() while open resolves the first with the cancel value', async () => {
    const controller = new ModalController<string>('cancelled')
    const first = controller.open()
    const second = controller.open()
    expect(await first).toBe('cancelled')
    expect(controller.isOpen_()).toBeTrue()
    controller.close('second result')
    expect(await second).toBe('second result')
  })

  it('close() when nothing is pending does not throw', () => {
    const controller = new ModalController<void>(undefined)
    expect(() => controller.close()).not.toThrow()
    expect(controller.isOpen_()).toBeFalse()
  })

  it('works with a void result', async () => {
    const controller = new ModalController<void>(undefined)
    const pending = controller.open()
    controller.close()
    await expectAsync(pending).toBeResolvedTo(undefined)
  })
})

describe('modal shell stack', () => {
  it('only the most recently pushed shell is on top', () => {
    const lower = pushModalShell()
    const upper = pushModalShell()
    expect(isTopModalShell(lower)).toBeFalse()
    expect(isTopModalShell(upper)).toBeTrue()
    popModalShell(upper)
    expect(isTopModalShell(lower)).toBeTrue()
    popModalShell(lower)
    expect(isTopModalShell(lower)).toBeFalse()
  })
})
