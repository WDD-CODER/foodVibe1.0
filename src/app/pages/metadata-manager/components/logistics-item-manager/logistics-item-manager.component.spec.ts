import { ComponentFixture, TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { LucideAngularModule, ListChecks, Undo2 } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { LogisticsItemManagerComponent } from './logistics-item-manager.component'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { LogisticsItemRegistryService } from '@services/logistics-item-registry.service'
import { BusinessService } from '@services/business.service'
import { PermissionService } from '@services/permission.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'

type Term = {
  _id: string
  key: string
  userId: string
  phase: 'intake' | 'site_visit'
  section: string
  answerType: 'status' | 'quantity' | 'text'
  environments?: string[]
  removedAt?: number
}

const ALL_ENVS = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue'] as const

describe('LogisticsItemManagerComponent', () => {
  let fixture: ComponentFixture<LogisticsItemManagerComponent>
  let component: LogisticsItemManagerComponent
  let store: jasmine.SpyObj<TaxonomyStore>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let business: jasmine.SpyObj<BusinessService>
  let confirmOpen: jasmine.Spy
  let ternary: jasmine.Spy
  let addItemOpen: jasmine.Spy
  let hiddenAt: ReturnType<typeof signal<Map<string, number>>>
  let items: ReturnType<typeof signal<Term[]>>
  let canEditSettings = false

  const shared: Term = {
    _id: 't1',
    key: 'יש מטבח במקום?',
    userId: '__master__',
    phase: 'intake',
    section: 'infrastructure',
    answerType: 'status'
  }
  const own: Term = {
    _id: 't2',
    key: 'חניה לרכב קירור',
    userId: 'u1',
    phase: 'intake',
    section: 'access',
    answerType: 'quantity',
    environments: ['outdoor_field']
  }

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement
  const rowOf = (key: string): HTMLElement =>
    Array.from(host().querySelectorAll<HTMLElement>('.logistics-item')).find((r) => r.textContent?.includes(key))!

  const setup = async (admin: boolean): Promise<void> => {
    TestBed.resetTestingModule()
    items = signal<Term[]>([shared, own])
    hiddenAt = signal(new Map<string, number>())
    store = jasmine.createSpyObj<TaxonomyStore>(
      'TaxonomyStore',
      ['terms', 'isShared', 'canEdit', 'add', 'update', 'errorMessage', 'loadSafely'],
      { isAdmin_: signal(admin) }
    )
    store.isShared.and.callFake(((t: Term) => t.userId === '__master__') as never)
    store.canEdit.and.callFake(((t: Term) => t.userId !== '__master__' || admin) as never)
    store.add.and.callFake((async (_k: string, key: string) => {
      sections.update((l) => [...l, key])
      return { key }
    }) as never)
    store.update.and.resolveTo({} as never)
    store.errorMessage.and.returnValue(null)
    const sections = signal(['infrastructure', 'access', 'space', 'other'])
    const registry = {
      items_: computed(() => items().filter((t) => !t.removedAt)),
      allItems_: items,
      hiddenAt_: hiddenAt,
      sections_: sections,
      sectionLabel: (s: string) => (s === 'סעיף שלי' ? s : `logistics_section_${s}`)
    }
    business = jasmine.createSpyObj<BusinessService>('BusinessService', ['updateHiddenLogisticsKeys'])
    business.updateHiddenLogisticsKeys.and.resolveTo()
    confirmOpen = jasmine.createSpy('open').and.resolveTo(true)
    ternary = jasmine.createSpy('openTernary').and.resolveTo('confirm')
    addItemOpen = jasmine.createSpy('open').and.resolveTo('סעיף שלי')
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetSuccessMsg',
      'onSetErrorMsg',
      'onSetWarningMsg'
    ])

    await TestBed.configureTestingModule({
      imports: [LogisticsItemManagerComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks, Undo2 })],
      providers: [
        { provide: TaxonomyStore, useValue: store },
        { provide: LogisticsItemRegistryService, useValue: registry },
        { provide: BusinessService, useValue: business },
        { provide: PermissionService, useValue: { can: () => canEditSettings } },
        { provide: AddItemModalService, useValue: { open: addItemOpen } },
        { provide: ConfirmModalService, useValue: { open: confirmOpen, openTernary: ternary } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error']) },
        { provide: UserService, useValue: { isLoggedIn: signal(true) } },
        { provide: AuthModalService, useValue: jasmine.createSpyObj('AuthModalService', ['open']) }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(LogisticsItemManagerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(async () => {
    canEditSettings = false
    await setup(false)
  })

  it('shows the shared item as a locked tag with no trash or pencil for a staff member', () => {
    const row = rowOf(shared.key)
    expect(row.querySelector('.c-chip--tag lucide-icon[name="lock"]')).not.toBeNull()
    expect(row.querySelector('.c-icon-btn.danger')).toBeNull()
    expect(row.querySelector('[aria-label="edit"]')).toBeNull()
  })

  it('shows the own item with pencil and trash, its type and environment', () => {
    const row = rowOf(own.key)
    expect(row.querySelector('[aria-label="edit"]')).not.toBeNull()
    expect(row.querySelector('.c-icon-btn.danger')).not.toBeNull()
    expect(row.querySelector('lucide-icon[name="lock"]')).toBeNull()
    expect(row.querySelector('.logistics-item-meta')?.textContent).toContain('logistics_type_quantity')
    expect(row.querySelector('.logistics-item-meta')?.textContent).toContain('outdoor_field')
  })

  it('groups the phase by section in order and shows an empty state for an empty section', () => {
    const groups = component.sections()
    expect(groups.map((g) => g.section)[0]).toBe('infrastructure')
    expect(groups.find((g) => g.section === 'access')?.rows.map((r) => r.term.key)).toEqual([own.key])
    expect(host().querySelector('[data-section="space"] .logistics-empty')).not.toBeNull()
  })

  it('starts with every environment checked and shows no scope radios to an owner', () => {
    expect(component.draft().environments.length).toBe(4)
    expect(host().querySelectorAll('.logistics-add-envs input:checked').length).toBe(4)
    expect(host().querySelector('.logistics-add-scope')).toBeNull()
    expect(host().textContent).not.toContain('metadata_logistics_shared')
  })

  it('sends no environments when all four are checked', async () => {
    component.setText('  חדש  ')
    component.setSection('access')
    await component.onAdd()
    expect(store.add).toHaveBeenCalledOnceWith(
      'logisticsItem',
      'חדש',
      { phase: 'intake', section: 'access', answerType: 'status' } as never,
      { shared: false }
    )
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('metadata_logistics_added')
    expect(component.draft().text).toBe('')
    expect(component.draft().environments.length).toBe(4)
  })

  it('passes a partial environment list', async () => {
    component.setText('חדש')
    component.toggleEnvironment('client_home', false)
    await component.onAdd()
    const extras = store.add.calls.mostRecent().args[2] as { environments?: string[] }
    expect(extras.environments).toEqual(['professional_kitchen', 'outdoor_field', 'popup_venue'])
  })

  it('refuses none checked with the env_required error and no call', async () => {
    component.setText('חדש')
    for (const e of ALL_ENVS) component.toggleEnvironment(e, false)
    await component.onAdd()
    expect(component.error()).toBe('metadata_logistics_env_required')
    expect(store.add).not.toHaveBeenCalled()
  })

  it('refuses a duplicate of the shared key in the same phase', async () => {
    component.setText(` ${shared.key} `)
    await component.onAdd()
    expect(component.error()).toBe('metadata_logistics_duplicate')
    expect(store.add).not.toHaveBeenCalled()
  })

  it('the admin sees the scope radios and "everyone" adds shared', async () => {
    await setup(true)
    expect(host().querySelector('.logistics-add-scope')).not.toBeNull()
    component.setScope('everyone')
    component.setText('חדש')
    await component.onAdd()
    expect(store.add.calls.mostRecent().args[3]).toEqual({ shared: true })
  })

  it('the pencil loads the term and saving updates with environments []', async () => {
    await component.onEdit(own as never)
    expect(component.editing()).toBe(own as never)
    expect(component.draft().text).toBe(own.key)
    expect(component.draft().environments).toEqual(['outdoor_field'])
    component.toggleEnvironment('professional_kitchen', true)
    component.toggleEnvironment('client_home', true)
    component.toggleEnvironment('popup_venue', true)
    component.setText('שם חדש')
    await component.onSubmit()
    expect(store.update).toHaveBeenCalledOnceWith(
      own as never,
      {
        key: 'שם חדש',
        phase: 'intake',
        section: 'access',
        answerType: 'quantity',
        environments: []
      } as never
    )
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('metadata_logistics_updated')
    expect(component.editing()).toBeNull()
  })

  it('a pencil with a dirty form asks first: cancel keeps the draft', async () => {
    component.setText('טיוטה')
    ternary.and.resolveTo('cancel')
    await component.onEdit(own as never)
    expect(ternary).toHaveBeenCalled()
    expect(component.draft().text).toBe('טיוטה')
    expect(component.editing()).toBeNull()
  })

  it('a pencil with a dirty form: confirm drops the draft and loads the term', async () => {
    component.setText('טיוטה')
    ternary.and.resolveTo('confirm')
    await component.onEdit(own as never)
    expect(component.draft().text).toBe(own.key)
    expect(store.add).not.toHaveBeenCalled()
  })

  it('a pencil with a dirty form: save submits first, then loads', async () => {
    component.setText('טיוטה')
    ternary.and.resolveTo('save')
    await component.onEdit(own as never)
    expect(store.add).toHaveBeenCalled()
    expect(component.draft().text).toBe(own.key)
  })

  it('removes an own item by setting removedAt, never a delete', async () => {
    await component.onRemove(own as never)
    expect(confirmOpen.calls.mostRecent().args[0]).toBe('metadata_logistics_remove_confirm')
    const changes = store.update.calls.mostRecent().args[1] as { removedAt: number }
    expect(store.update.calls.mostRecent().args[0]).toBe(own as never)
    expect(typeof changes.removedAt).toBe('number')
  })

  it('does nothing when the confirm is cancelled', async () => {
    confirmOpen.and.resolveTo(false)
    await component.onRemove(own as never)
    expect(store.update).not.toHaveBeenCalled()
  })

  it('an owner hides a shared question for the business', async () => {
    canEditSettings = true
    await setup(false)
    expect(rowOf(shared.key).querySelector('.c-icon-btn.danger')).not.toBeNull()
    await component.onRemove(shared as never)
    expect(confirmOpen.calls.mostRecent().args[0]).toBe('metadata_logistics_hide_confirm')
    expect(business.updateHiddenLogisticsKeys).toHaveBeenCalledOnceWith([shared.key])
  })

  it('the admin choosing everyone sets removedAt on the master term; mine hides it; cancel does nothing', async () => {
    await setup(true)
    ternary.and.resolveTo('save')
    await component.onRemove(shared as never)
    expect(store.update.calls.mostRecent().args[0]).toBe(shared as never)
    ternary.and.resolveTo('confirm')
    await component.onRemove(shared as never)
    expect(business.updateHiddenLogisticsKeys).toHaveBeenCalledOnceWith([shared.key])
    ternary.and.resolveTo('cancel')
    await component.onRemove(shared as never)
    expect(store.update).toHaveBeenCalledTimes(1)
    expect(business.updateHiddenLogisticsKeys).toHaveBeenCalledTimes(1)
  })

  it('a hidden shared row is dimmed with restore, and restore drops the key', async () => {
    hiddenAt.set(new Map([[shared.key, 5]]))
    fixture.detectChanges()
    const row = rowOf(shared.key)
    expect(row.classList.contains('is-hidden')).toBeTrue()
    expect(row.textContent).toContain('metadata_logistics_hidden')
    expect(row.querySelector('lucide-icon[name="undo-2"]')).not.toBeNull()
    await component.onRestore(shared as never)
    expect(business.updateHiddenLogisticsKeys).toHaveBeenCalledOnceWith([])
  })

  it('re-adding the text of a removed own question updates it with removedAt 0', async () => {
    const gone: Term = { ...own, _id: 't3', key: 'הוסרה', removedAt: 5 }
    items.set([shared, own, gone])
    component.setText('הוסרה')
    await component.onAdd()
    expect(store.add).not.toHaveBeenCalled()
    expect(store.update.calls.mostRecent().args[0]).toBe(gone as never)
    expect((store.update.calls.mostRecent().args[1] as { removedAt: number }).removedAt).toBe(0)
  })

  it('adds an own section from the add option and selects it', async () => {
    await component.onAddSection('')
    expect(store.add).toHaveBeenCalledOnceWith('logisticsSection', 'סעיף שלי', {}, { shared: false })
    expect(component.draft().section).toBe('סעיף שלי')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalled()
  })

  it('shows the server error toast on a failed remove', async () => {
    store.update.and.rejectWith(new Error('boom'))
    await component.onRemove(own as never)
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('server_error')
  })
})
