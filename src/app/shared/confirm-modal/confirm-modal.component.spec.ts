import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ConfirmModalComponent } from './confirm-modal.component'
import { ConfirmModalService } from '@services/confirm-modal.service'

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent
  let fixture: ComponentFixture<ConfirmModalComponent>
  let mockModalService: {
    isOpen: WritableSignal<boolean>
    message: WritableSignal<string>
    saveLabel: WritableSignal<string>
    headerKey: WritableSignal<string | null>
    variant: () => string
    showSaveButton: () => boolean
    saveButtonLabel: () => string
    choose: jasmine.Spy
    typedConfirm: WritableSignal<{ expected: string; labelKey: string } | null>
    typedText: WritableSignal<string>
    canConfirm: () => boolean
    setTypedText: jasmine.Spy
  }
  let typedConfirm: WritableSignal<{ expected: string; labelKey: string } | null>
  let typedText: WritableSignal<string>

  beforeEach(async () => {
    const isOpen = signal(false)
    const message = signal('')
    const saveLabel = signal('save')
    const headerKey = signal<string | null>(null)
    const variant = signal<'default' | 'danger' | 'warning'>('default')
    const showSaveButton = signal(false)
    const saveButtonLabel = signal('save')
    typedConfirm = signal<{ expected: string; labelKey: string } | null>(null)
    typedText = signal('')
    mockModalService = {
      typedConfirm,
      typedText,
      canConfirm: () => !typedConfirm() || typedText().trim() === typedConfirm()!.expected.trim(),
      setTypedText: jasmine.createSpy('setTypedText'),
      isOpen,
      message,
      saveLabel,
      headerKey,
      variant: variant as () => string,
      showSaveButton: showSaveButton as () => boolean,
      saveButtonLabel: saveButtonLabel as () => string,
      choose: jasmine.createSpy('choose')
    }

    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmModalService, useValue: mockModalService }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(ConfirmModalComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should call choose(cancel) when cancel is clicked', () => {
    mockModalService.isOpen.set(true)
    fixture.detectChanges()
    const cancelBtn = fixture.nativeElement.querySelector('.c-btn-ghost')
    cancelBtn?.click()
    expect(mockModalService.choose).toHaveBeenCalledWith('cancel')
  })

  it('should call choose(confirm) when confirm is clicked', () => {
    mockModalService.isOpen.set(true)
    fixture.detectChanges()
    const confirmBtn = fixture.nativeElement.querySelector('.c-btn-primary')
    confirmBtn?.click()
    expect(mockModalService.choose).toHaveBeenCalledWith('confirm')
  })

  it('shows no text box without typedConfirm', () => {
    mockModalService.isOpen.set(true)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('#confirm-modal-typed')).toBeNull()
  })

  describe('with typedConfirm', () => {
    beforeEach(() => {
      typedConfirm.set({ expected: 'מטבח', labelKey: 'delete_business_type_name' })
      mockModalService.isOpen.set(true)
      fixture.detectChanges()
    })

    const confirmBtn = (): HTMLButtonElement => fixture.nativeElement.querySelector('.c-btn-primary')
    const box = (): HTMLInputElement => fixture.nativeElement.querySelector('#confirm-modal-typed')

    it('shows the box and the expected name, and locks confirm', () => {
      expect(box()).not.toBeNull()
      expect(fixture.nativeElement.querySelector('.confirm-modal-typed__expected').textContent).toContain('מטבח')
      expect(confirmBtn().disabled).toBeTrue()
    })

    it('reports typing to the service and unlocks confirm on a match', () => {
      box().value = 'מטבח'
      box().dispatchEvent(new Event('input'))
      expect(mockModalService.setTypedText).toHaveBeenCalledWith('מטבח')
      typedText.set('מטבח')
      fixture.detectChanges()
      expect(confirmBtn().disabled).toBeFalse()
    })

    it('Enter confirms only on a match', () => {
      box().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(mockModalService.choose).not.toHaveBeenCalled()
      typedText.set('מטבח')
      box().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(mockModalService.choose).toHaveBeenCalledWith('confirm')
    })
  })
})
