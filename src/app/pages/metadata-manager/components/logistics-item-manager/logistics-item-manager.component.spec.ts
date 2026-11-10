import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule, ListChecks } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { LogisticsItemManagerComponent } from './logistics-item-manager.component'
import { TaxonomyStore, TermInUseError } from '@services/taxonomy-store.service'
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
}

describe('LogisticsItemManagerComponent', () => {
  let fixture: ComponentFixture<LogisticsItemManagerComponent>
  let component: LogisticsItemManagerComponent
  let store: jasmine.SpyObj<TaxonomyStore>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let confirmOpen: jasmine.Spy

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

  beforeEach(async () => {
    store = jasmine.createSpyObj<TaxonomyStore>('TaxonomyStore', ['terms', 'isShared', 'add', 'remove', 'loadSafely'], {
      isAdmin_: signal(false)
    })
    store.terms.and.callFake(((kind: string) => signal(kind === 'logisticsItem' ? [shared, own] : [])) as never)
    store.isShared.and.callFake(((t: Term) => t.userId === '__master__') as never)
    store.add.and.returnValue(Promise.resolve({} as never))
    store.remove.and.returnValue(Promise.resolve())
    confirmOpen = jasmine.createSpy('open').and.resolveTo(true)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetSuccessMsg',
      'onSetErrorMsg',
      'onSetWarningMsg'
    ])

    await TestBed.configureTestingModule({
      imports: [LogisticsItemManagerComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ListChecks })],
      providers: [
        { provide: TaxonomyStore, useValue: store },
        { provide: ConfirmModalService, useValue: { open: confirmOpen } },
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
  })

  it('shows the shared item as a locked tag with no remove control', () => {
    const row = rowOf(shared.key)
    expect(row.querySelector('.c-chip--tag lucide-icon[name="lock"]')).not.toBeNull()
    expect(row.querySelector('.c-chip__remove')).toBeNull()
    expect(row.querySelector('.c-chip--tag')?.getAttribute('title')).toBe('taxonomy_shared_admin_only')
  })

  it('shows the own item as a removable chip with its type and environment', () => {
    const row = rowOf(own.key)
    expect(row.querySelector('.c-chip--removable .c-chip__remove')).not.toBeNull()
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

  it('hides the shared toggle from a non-admin', () => {
    expect(host().querySelector('.logistics-add-shared')).toBeNull()
  })

  it('adds an own item with phase, section and type and no environments', async () => {
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
    expect(component.draft().section).toBe('access')
  })

  it('passes the checked environments', async () => {
    component.setText('חדש')
    component.toggleEnvironment('client_home', true)
    component.toggleEnvironment('outdoor_field', true)
    await component.onAdd()
    const extras = store.add.calls.mostRecent().args[2] as { environments?: string[] }
    expect(extras.environments).toEqual(['outdoor_field', 'client_home'])
    expect(component.draft().environments).toEqual([])
  })

  it('refuses a duplicate of the shared key in the same phase', async () => {
    component.setText(` ${shared.key} `)
    await component.onAdd()
    expect(component.error()).toBe('metadata_logistics_duplicate')
    expect(store.add).not.toHaveBeenCalled()
  })

  it('removes an own item after the confirm', async () => {
    await component.onRemove(own as never)
    expect(confirmOpen).toHaveBeenCalled()
    expect(confirmOpen.calls.mostRecent().args[0]).toBe('metadata_logistics_remove_confirm')
    expect(store.remove).toHaveBeenCalledOnceWith(own as never)
  })

  it('does nothing when the confirm is cancelled', async () => {
    confirmOpen.and.resolveTo(false)
    await component.onRemove(own as never)
    expect(store.remove).not.toHaveBeenCalled()
  })

  it('shows the in-use toast when the server refuses the delete', async () => {
    store.remove.and.returnValue(Promise.reject(new TermInUseError([])))
    await component.onRemove(own as never)
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('metadata_logistics_in_use')
  })

  it('shows the server error toast on any other remove failure', async () => {
    store.remove.and.returnValue(Promise.reject(new Error('boom')))
    await component.onRemove(own as never)
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('server_error')
  })
})
