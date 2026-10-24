import { TestBed } from '@angular/core/testing'
import { ConfirmModalService } from './confirm-modal.service'

describe('ConfirmModalService typedConfirm', () => {
  let service: ConfirmModalService

  beforeEach(() => {
    TestBed.configureTestingModule({})
    service = TestBed.inject(ConfirmModalService)
  })

  it('canConfirm is true from the start without typedConfirm', async () => {
    const p = service.open('msg')
    expect(service.canConfirm()).toBeTrue()
    service.choose('confirm')
    expect(await p).toBeTrue()
  })

  it('ignores confirm until the typed text matches', async () => {
    let settled = false
    const p = service.open('msg', { typedConfirm: { expected: 'Kitchen', labelKey: 'k' } }).then((r) => {
      settled = true
      return r
    })
    service.choose('confirm')
    service.choose(true)
    await Promise.resolve()
    expect(settled).toBeFalse()
    expect(service.isOpen()).toBeTrue()

    service.setTypedText('Kitche')
    service.choose('confirm')
    await Promise.resolve()
    expect(settled).toBeFalse()

    service.setTypedText('kitchen')
    expect(service.canConfirm()).toBeFalse()

    service.setTypedText('  Kitchen  ')
    expect(service.canConfirm()).toBeTrue()
    service.choose('confirm')
    expect(await p).toBeTrue()
  })

  it('cancel still works while the text does not match', async () => {
    const p = service.open('msg', { typedConfirm: { expected: 'Kitchen', labelKey: 'k' } })
    service.choose('cancel')
    expect(await p).toBeFalse()
  })

  it('open() and choose() clear the typed text', async () => {
    const p = service.open('msg', { typedConfirm: { expected: 'A', labelKey: 'k' } })
    service.setTypedText('A')
    service.choose('cancel')
    await p
    expect(service.typedText()).toBe('')
    expect(service.typedConfirm()).toBeNull()

    service.setTypedText('leftover')
    const p2 = service.open('msg', { typedConfirm: { expected: 'A', labelKey: 'k' } })
    expect(service.typedText()).toBe('')
    service.choose('cancel')
    await p2
  })

  it('an expected text that is empty after trimming never confirms', () => {
    service.open('msg', { typedConfirm: { expected: '   ', labelKey: 'k' } })
    service.setTypedText('')
    expect(service.canConfirm()).toBeFalse()
    service.setTypedText('   ')
    expect(service.canConfirm()).toBeFalse()
    service.choose('cancel')
  })
})
