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
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])

    await TestBed.configureTestingModule({
      imports: [CoefficientManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: TaxonomyStore, useValue: store },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true) } },
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

  it('saves a changed coefficient with one updateByKey', async () => {
    const input = document.createElement('input')
    input.value = '1.35'
    await component.onCoefficientChange('eventType', eventTypes[2] as never, input)
    expect(store.updateByKey.calls.count()).toBe(1)
    expect(store.updateByKey.calls.mostRecent().args).toEqual(['eventType', 'שלי', { coefficient: 1.35 } as never])
  })

  it('puts the stored value back and saves nothing for 0', async () => {
    const input = document.createElement('input')
    input.value = '0'
    await component.onCoefficientChange('eventType', eventTypes[2] as never, input)
    expect(store.updateByKey).not.toHaveBeenCalled()
    expect(input.value).toBe('1.3')
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

  it('shows the store message when a save is refused', async () => {
    store.updateByKey.and.returnValue(Promise.reject(new Error('read only')))
    store.errorMessage.and.returnValue('taxonomy_shared_admin_only')
    const input = document.createElement('input')
    input.value = '1.4'
    await component.onCoefficientChange('eventType', eventTypes[2] as never, input)
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('taxonomy_shared_admin_only')
    expect(input.value).toBe('1.3')
  })

  it('deletes an own event type after the confirm', async () => {
    await component.onDeleteEventType(eventTypes[2] as never)
    expect(store.removeByKey).toHaveBeenCalledWith('eventType', 'שלי')
  })
})
