import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { CoefficientManagerComponent } from './coefficient-manager.component'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'

type Term = { key: string; userId: string; coefficient?: number }

describe('CoefficientManagerComponent', () => {
  let fixture: ComponentFixture<CoefficientManagerComponent>
  let component: CoefficientManagerComponent
  let store: jasmine.SpyObj<TaxonomyStore>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let isAdmin: boolean
  let openTernary: jasmine.Spy

  const eventTypes: Term[] = [
    { key: 'פרטי', userId: '__master__', coefficient: 1.15 },
    { key: 'חתונה', userId: '__master__', coefficient: 1.2 },
    { key: 'שלי', userId: 'u1', coefficient: 1.3 }
  ]
  const servingTypes: Term[] = [{ key: 'buffet_family', userId: '__master__', coefficient: 1.1 }]

  const inputs = (): HTMLInputElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input.coef-input'))

  beforeEach(async () => {
    isAdmin = false
    store = jasmine.createSpyObj<TaxonomyStore>('TaxonomyStore', [
      'terms',
      'find',
      'add',
      'updateByKey',
      'removeByKey',
      'canEdit',
      'isShared',
      'errorMessage',
      'ensureLoaded',
      'reload',
      'loadSafely',
      'reloadSafely'
    ])
    store.terms.and.callFake(((kind: string) => signal(kind === 'eventType' ? eventTypes : servingTypes)) as never)
    store.find.and.callFake(((kind: string, key: string) =>
      (kind === 'eventType' ? eventTypes : servingTypes).find((t) => t.key === key)) as never)
    store.isShared.and.callFake(((t: Term) => t.userId === '__master__') as never)
    store.canEdit.and.callFake(((t: Term) => t.userId !== '__master__' || isAdmin) as never)
    store.add.and.returnValue(Promise.resolve({} as never))
    store.updateByKey.and.returnValue(Promise.resolve(true))
    store.removeByKey.and.returnValue(Promise.resolve(true))
    store.errorMessage.and.returnValue(null)
    store.ensureLoaded.and.returnValue(Promise.resolve())
    store.loadSafely.and.returnValue(Promise.resolve())
    store.reloadSafely.and.returnValue(Promise.resolve())
    openTernary = jasmine.createSpy('openTernary').and.resolveTo('cancel')
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])

    await TestBed.configureTestingModule({
      imports: [CoefficientManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: TaxonomyStore, useValue: store },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true), openTernary } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error']) }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(CoefficientManagerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('lists the event types and serving types with their coefficients', () => {
    const values = inputs().map((i) => i.value)
    expect(values.slice(0, 3)).toEqual(['1.15', '1.2', '1.3'])
    expect(values.at(-1)).toBe('1.1')
  })

  it('adding event type "בר מצווה" with 1.25 calls TaxonomyStore.add with the coefficient', async () => {
    const name = document.createElement('input')
    const coefficient = document.createElement('input')
    name.value = 'בר מצווה'
    coefficient.value = '1.25'
    await component.onAddEventType(name, coefficient)
    expect(store.add).toHaveBeenCalledWith('eventType', 'בר מצווה', { coefficient: 1.25 })
    expect(name.value).toBe('')
  })

  it('refuses a coefficient with 3 decimals when adding', async () => {
    const name = document.createElement('input')
    const coefficient = document.createElement('input')
    name.value = 'בר מצווה'
    coefficient.value = '1.255'
    await component.onAddEventType(name, coefficient)
    expect(store.add).not.toHaveBeenCalled()
  })

  it('blames the name, not the coefficient, when the event type already exists', async () => {
    const name = document.createElement('input')
    const coefficient = document.createElement('input')
    name.value = 'חתונה'
    coefficient.value = '1.2'
    await component.onAddEventType(name, coefficient)
    expect(store.add).not.toHaveBeenCalled()
    expect(component['invalid_']()).toEqual({ row: 'new', key: 'metadata_event_type_exists' })
  })

  // Plan 482: the own term 'שלי' is the third box; typing only keeps a draft.
  const typeInto = (index: number, text: string): HTMLInputElement => {
    const box = inputs()[index]
    box.value = text
    box.dispatchEvent(new Event('input'))
    box.dispatchEvent(new Event('change'))
    fixture.detectChanges()
    return box
  }
  const saveButton = (): HTMLButtonElement =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.coef-actions button')).at(
      -1
    )!

  it('does not save on input or change; «שמור» turns on only for a changed valid value', () => {
    expect(saveButton().disabled).toBeTrue()
    typeInto(2, '1.35')
    expect(store.updateByKey).not.toHaveBeenCalled()
    expect(saveButton().disabled).toBeFalse()
    expect(component.hasRealChanges()).toBeTrue()
    typeInto(2, '1.3')
    expect(saveButton().disabled).toBeTrue()
    expect(component.hasRealChanges()).toBeFalse()
  })

  it('keeps «שמור» off and shows the error for 0 or 3 decimals', () => {
    typeInto(2, '0')
    expect(saveButton().disabled).toBeTrue()
    expect(component.hasRealChanges()).toBeTrue()
    expect((fixture.nativeElement as HTMLElement).querySelector('.c-field-error')).not.toBeNull()
    typeInto(2, '1.255')
    expect(saveButton().disabled).toBeTrue()
  })

  it('«שמור» saves every changed value, one updateByKey each, and shows one success message', async () => {
    isAdmin = true
    typeInto(0, '1.25')
    typeInto(2, '1.35')
    saveButton().click()
    await fixture.whenStable()
    expect(store.updateByKey.calls.allArgs()).toEqual([
      ['eventType', 'פרטי', { coefficient: 1.25 } as never],
      ['eventType', 'שלי', { coefficient: 1.35 } as never]
    ])
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledTimes(1)
    expect(component.hasRealChanges()).toBeFalse()
  })

  it('shows the store message when a save is refused and keeps the draft', async () => {
    store.updateByKey.and.returnValue(Promise.reject(new Error('read only')))
    store.errorMessage.and.returnValue('taxonomy_shared_admin_only')
    typeInto(2, '1.4')
    expect(await component.onSave()).toBeFalse()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('taxonomy_shared_admin_only')
    expect(userMsg.onSetSuccessMsg).not.toHaveBeenCalled()
    expect(component.hasRealChanges()).toBeTrue()
  })

  it('«ביטול» drops the drafts and puts the stored value back', () => {
    const box = typeInto(2, '1.9')
    component.onDiscard()
    fixture.detectChanges()
    expect(box.value).toBe('1.3')
    expect(component.hasRealChanges()).toBeFalse()
  })

  it('leaving with changes asks the ternary question; cancel stays and keeps the typed value', async () => {
    const box = typeInto(2, '1.35')
    expect(await component.confirmLeave()).toBeFalse()
    expect(openTernary).toHaveBeenCalledOnceWith('unsaved_changes_confirm', {
      variant: 'warning',
      saveLabel: 'leave_without_saving',
      saveButtonLabel: 'save_and_leave'
    })
    expect(box.value).toBe('1.35')
    expect(component.hasRealChanges()).toBeTrue()
  })

  it('leaving: «שמור וצא» saves then leaves; «יציאה בלי לשמור» drops the drafts', async () => {
    typeInto(2, '1.35')
    openTernary.and.resolveTo('save')
    expect(await component.confirmLeave()).toBeTrue()
    expect(store.updateByKey).toHaveBeenCalledOnceWith('eventType', 'שלי', { coefficient: 1.35 } as never)
    typeInto(2, '1.5')
    openTernary.and.resolveTo('confirm')
    expect(await component.confirmLeave()).toBeTrue()
    expect(store.updateByKey.calls.count()).toBe(1)
    expect(component.hasRealChanges()).toBeFalse()
  })

  it('leaving without changes does not ask', async () => {
    expect(await component.confirmLeave()).toBeTrue()
    expect(openTernary).not.toHaveBeenCalled()
  })

  it('a click outside the card and the route guard for the same click share one question', async () => {
    typeInto(2, '1.35')
    document.body.click()
    const fromGuard = component.confirmLeave()
    expect(await fromGuard).toBeFalse()
    expect(openTernary).toHaveBeenCalledTimes(1)
  })

  it('a click inside the card or inside a popup does not ask', () => {
    typeInto(2, '1.35')
    inputs()[2].click()
    const shell = document.createElement('app-modal-shell')
    const button = document.createElement('button')
    shell.appendChild(button)
    document.body.appendChild(shell)
    button.click()
    shell.remove()
    expect(openTernary).not.toHaveBeenCalled()
  })

  it('disables a shared term input for a non-admin and enables it for an admin', () => {
    const [privateInput, , ownInput] = inputs()
    expect(privateInput.disabled).toBeTrue()
    expect(ownInput.disabled).toBeFalse()
    isAdmin = true
    fixture.componentRef.changeDetectorRef.markForCheck()
    fixture = TestBed.createComponent(CoefficientManagerComponent)
    fixture.detectChanges()
    expect(inputs()[0].disabled).toBeFalse()
  })

  it('deletes an own event type after the confirm', async () => {
    await component.onDeleteEventType(eventTypes[2] as never)
    expect(store.removeByKey).toHaveBeenCalledWith('eventType', 'שלי')
  })
})
