import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { SignedOutRedirectService } from './signed-out-redirect.service'
import { UserService } from './user.service'
import { User } from '../models/user.model'

describe('SignedOutRedirectService (plan 591)', () => {
  const user_ = signal<User | null>(null)
  let navigate: jasmine.Spy
  let url: string

  function start(initial: User | null, atUrl: string): void {
    url = atUrl
    user_.set(initial)
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { user_: user_.asReadonly() } },
        {
          provide: Router,
          useValue: {
            navigate: navigate,
            get url() {
              return url
            }
          }
        }
      ]
    })
    TestBed.inject(SignedOutRedirectService)
    TestBed.flushEffects()
  }

  const signedIn = { _id: 'u1', name: 'a' } as unknown as User

  it('goes to /welcome when the user becomes null on /recipe-book', () => {
    start(signedIn, '/recipe-book')
    user_.set(null)
    TestBed.flushEffects()
    expect(navigate).toHaveBeenCalledWith(['/welcome'])
  })

  it('stays on /welcome', () => {
    start(signedIn, '/welcome')
    user_.set(null)
    TestBed.flushEffects()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('stays on /cook/<id>', () => {
    start(signedIn, '/cook/abc')
    user_.set(null)
    TestBed.flushEffects()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('stays when never signed in on /cook/<id>', () => {
    start(null, '/cook/abc')
    TestBed.flushEffects()
    expect(navigate).not.toHaveBeenCalled()
  })
})
