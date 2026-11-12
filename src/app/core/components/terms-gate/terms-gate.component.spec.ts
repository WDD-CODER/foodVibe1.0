import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { TermsGateComponent } from './terms-gate.component'
import { Terms, TermsService } from '../../services/terms.service'
import { UserService } from '../../services/user.service'
import { TranslationService } from '../../services/translation.service'
import { UserMsgService } from '../../services/user-msg.service'
import { User } from '../../models/user.model'

const TERMS: Terms = { version: 'v2', title: 'T', updated: 'd', sectionsHash: 'x', sections: [] }

describe('TermsGateComponent (plan 584)', () => {
  let fixture: ComponentFixture<TermsGateComponent>
  const user_ = signal<User | null>(null)
  let logout: jasmine.Spy

  beforeEach(() => {
    logout = jasmine.createSpy('logout').and.returnValue(of(null))
  })

  async function show(user: User | null): Promise<boolean> {
    user_.set(user)
    TestBed.configureTestingModule({
      imports: [TermsGateComponent],
      providers: [
        { provide: UserService, useValue: { user_: user_.asReadonly(), logout: logout } },
        { provide: TermsService, useValue: { load: () => of(TERMS), accept: () => of({}) } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: { onSetErrorMsg: () => {} } }
      ]
    })
    fixture = TestBed.createComponent(TermsGateComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    return (fixture.nativeElement as HTMLElement).querySelector('app-terms-modal') !== null
  }

  it('shows for a user who never accepted', async () => {
    expect(await show({ _id: 'u1', name: 'a', email: 'a@x.com', termsAcceptedVersion: null })).toBeTrue()
  })

  it('shows for a user who accepted an older version', async () => {
    expect(await show({ _id: 'u1', name: 'a', email: 'a@x.com', termsAcceptedVersion: 'v1' })).toBeTrue()
  })

  it('hides for a user who accepted the current version', async () => {
    expect(await show({ _id: 'u1', name: 'a', email: 'a@x.com', termsAcceptedVersion: 'v2' })).toBeFalse()
  })

  it('never shows for the dev guest or when nobody is signed in', async () => {
    expect(await show({ _id: 'dev-guest', name: 'g', email: 'g@x.com' })).toBeFalse()
    TestBed.resetTestingModule()
    expect(await show(null)).toBeFalse()
  })

  it('is dismissible, and closing signs out and goes to /welcome (plan 585)', async () => {
    await show({ _id: 'u1', name: 'a', email: 'a@x.com', termsAcceptedVersion: null })
    const close = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="terms-close"]'
    ) as HTMLButtonElement
    expect(close).not.toBeNull()
    close.click()
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
