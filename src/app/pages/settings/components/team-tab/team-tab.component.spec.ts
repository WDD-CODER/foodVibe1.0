import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { TeamMember, TeamService } from '../../services/team.service'
import { TeamTabComponent } from './team-tab.component'

const TEAM: TeamMember[] = [
  { _id: 'o1', name: 'owner', businessRole: 'owner', createdAt: 1, lastActiveAt: null },
  { _id: 's1', name: 'cook1', businessRole: 'staff', createdAt: 2, lastActiveAt: null }
]

describe('TeamTabComponent', () => {
  let fixture: ComponentFixture<TeamTabComponent>
  let team: jasmine.SpyObj<TeamService> & { teamList_: ReturnType<typeof signal<TeamMember[]>> }
  let confirm: jasmine.SpyObj<ConfirmModalService>

  beforeEach(() => {
    team = Object.assign(jasmine.createSpyObj<TeamService>('TeamService', ['loadTeam', 'addStaff', 'removeStaff']), {
      teamList_: signal<TeamMember[]>(TEAM)
    })
    team.loadTeam.and.resolveTo()
    team.addStaff.and.resolveTo({ ok: true })
    team.removeStaff.and.resolveTo(true)
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [TeamTabComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: TeamService, useValue: team },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    fixture = TestBed.createComponent(TeamTabComponent)
    fixture.detectChanges()
  })

  const el = () => fixture.nativeElement as HTMLElement

  it('loads the team and lists every member, with last login "—"', () => {
    expect(team.loadTeam).toHaveBeenCalled()
    const rows = el().querySelectorAll('[data-testid="team-row"]')
    expect(rows.length).toBe(2)
    expect(rows[1].textContent).toContain('cook1')
    expect(rows[1].textContent).toContain('—')
  })

  it('only staff rows have a remove button', () => {
    const rows = el().querySelectorAll('[data-testid="team-row"]')
    expect(rows[0].querySelector('[data-testid="team-remove"]')).toBeNull()
    expect(rows[1].querySelector('[data-testid="team-remove"]')).not.toBeNull()
  })

  it('remove asks for confirmation and then removes', async () => {
    ;(el().querySelector('[data-testid="team-remove"]') as HTMLButtonElement).click()
    await fixture.whenStable()
    expect(confirm.open).toHaveBeenCalled()
    expect(team.removeStaff).toHaveBeenCalledWith('s1')
  })

  it('remove does nothing when the owner cancels', async () => {
    confirm.open.and.resolveTo(false)
    await fixture.componentInstance.removeMember(TEAM[1])
    expect(team.removeStaff).not.toHaveBeenCalled()
  })

  it('a too short username shows the sign-up error key and sends nothing', async () => {
    const cmp = fixture.componentInstance
    cmp['name_'].set('ab')
    cmp['password_'].set('abcdefg1')
    await cmp.addMember()
    expect(cmp['errorKey_']()).toBe('username_too_short')
    expect(team.addStaff).not.toHaveBeenCalled()
  })

  it('a valid username and password are sent and the form closes', async () => {
    const cmp = fixture.componentInstance
    cmp.openForm()
    cmp['name_'].set('cook2')
    cmp['password_'].set('abcdefg1')
    await cmp.addMember()
    expect(team.addStaff).toHaveBeenCalledWith('cook2', 'abcdefg1')
    expect(cmp['formOpen_']()).toBeFalse()
  })

  it('a taken username keeps the form open with the error', async () => {
    team.addStaff.and.resolveTo({ ok: false, errorKey: 'username_taken' })
    const cmp = fixture.componentInstance
    cmp.openForm()
    cmp['name_'].set('cook1')
    cmp['password_'].set('abcdefg1')
    await cmp.addMember()
    expect(cmp['errorKey_']()).toBe('username_taken')
    expect(cmp['formOpen_']()).toBeTrue()
  })
})
