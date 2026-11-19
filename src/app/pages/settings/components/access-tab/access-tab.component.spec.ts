import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AccessGrant, AccessService } from '@services/access.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { AccessTabComponent } from './access-tab.component'

describe('AccessTabComponent (plan 632)', () => {
  let fixture: ComponentFixture<AccessTabComponent>
  let grants_: ReturnType<typeof signal<AccessGrant[]>>
  let loading_: ReturnType<typeof signal<boolean>>
  let loadGrants: jasmine.Spy
  let removeGrant: jasmine.Spy
  let confirm: jasmine.SpyObj<ConfirmModalService>

  function setup(grants: AccessGrant[], loading = false): void {
    grants_ = signal(grants)
    loading_ = signal(loading)
    loadGrants = jasmine.createSpy('loadGrants').and.resolveTo()
    removeGrant = jasmine.createSpy('removeGrant').and.resolveTo(true)
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [AccessTabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: AccessService,
          useValue: { grants_: grants_.asReadonly(), grantsLoading_: loading_.asReadonly(), loadGrants, removeGrant }
        },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: TranslationService, useValue: { translate: (key: string) => key + ' {name}' } }
      ]
    })
    fixture = TestBed.createComponent(AccessTabComponent)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement

  it('loads the grants on open and shows the loader while it runs', () => {
    setup([], true)
    expect(loadGrants).toHaveBeenCalledTimes(1)
    expect(el().querySelector('app-loader')).not.toBeNull()
    expect(el().querySelector('app-empty-state')).toBeNull()
  })

  it('shows the empty state when no consultant has access', () => {
    setup([])
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().querySelector('[data-testid="access-row"]')).toBeNull()
  })

  it('lists a row per grant with the name, the date and a remove button', () => {
    setup([{ _id: 'g1', name: 'cons', grantedAt: new Date(2026, 10, 5).getTime() }])
    const row = el().querySelector('[data-testid="access-row"]') as HTMLElement
    expect(row.textContent).toContain('cons')
    expect(row.textContent).toContain('05/11/2026')
    expect(row.querySelector('[data-testid="access-remove"]')).not.toBeNull()
    expect(el().querySelector('app-empty-state')).toBeNull()
  })

  it('remove asks with the name in the question and then removes', async () => {
    setup([{ _id: 'g1', name: 'cons', grantedAt: 1 }])
    ;(el().querySelector('[data-testid="access-remove"]') as HTMLButtonElement).click()
    await fixture.whenStable()
    expect(confirm.open).toHaveBeenCalledWith('access_remove_confirm cons', { variant: 'danger', title: 'remove' })
    expect(removeGrant).toHaveBeenCalledOnceWith('g1')
  })

  it('declining the question removes nothing', async () => {
    setup([{ _id: 'g1', name: 'cons', grantedAt: 1 }])
    confirm.open.and.resolveTo(false)
    ;(el().querySelector('[data-testid="access-remove"]') as HTMLButtonElement).click()
    await fixture.whenStable()
    expect(removeGrant).not.toHaveBeenCalled()
  })
})
