import { Component, computed, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import type { User } from '@models/user.model'
import { SettingsPage } from './settings.page'
import { TeamTabComponent } from './components/team-tab/team-tab.component'

@Component({ selector: 'app-team-tab', standalone: true, template: '<p data-testid="team-stub"></p>' })
class TeamTabStub {}

const STAFF: User = { _id: 's1', name: 'cook', email: 's@x', businessId: 'b1', businessRole: 'staff' }
const OWNER: User = { _id: 'o1', name: 'owner', email: 'o@x', businessId: 'b1', businessRole: 'owner' }

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>
  let router: jasmine.SpyObj<Router>
  const user_ = signal<User | null>(null)

  function setup(user: User, query: Record<string, string> = {}): void {
    user_.set(user)
    router = jasmine.createSpyObj('Router', ['navigate'])
    router.navigate.and.returnValue(Promise.resolve(true))
    TestBed.configureTestingModule({
      imports: [SettingsPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParams: of(query), snapshot: { queryParams: query } } }
      ]
    }).overrideComponent(SettingsPage, { remove: { imports: [TeamTabComponent] }, add: { imports: [TeamTabStub] } })
    fixture = TestBed.createComponent(SettingsPage)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement

  it('staff: the owner-only empty state and no tabs', () => {
    setup(STAFF)
    expect(el().querySelector('[data-testid="settings-owner-only"]')).not.toBeNull()
    expect(el().querySelectorAll('[role="tab"]').length).toBe(0)
    expect(el().querySelector('[data-testid="team-stub"]')).toBeNull()
  })

  it('owner: the Team tab is active by default', () => {
    setup(OWNER)
    const tab = el().querySelector('[data-testid="settings-tab-team"]')!
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(el().querySelector('[data-testid="team-stub"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="settings-owner-only"]')).toBeNull()
  })

  it('owner: an unknown ?tab= falls back to the first visible tab', () => {
    setup(OWNER, { tab: 'nope' })
    expect(el().querySelector('[data-testid="settings-tab-team"]')!.getAttribute('aria-selected')).toBe('true')
  })

  it('owner: clicking a tab writes ?tab= with replaceUrl', () => {
    setup(OWNER)
    ;(el().querySelector('[data-testid="settings-tab-team"]') as HTMLButtonElement).click()
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: { tab: 'team' }, replaceUrl: true })
    )
  })
})
