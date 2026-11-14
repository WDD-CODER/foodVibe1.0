import { signal, WritableSignal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { FrontDeskBadgeService } from './front-desk-badge.service'
import { RequestDataService } from './request-data.service'
import { UserService } from './user.service'
import type { FrontDeskRequest } from '../models/request.model'

const req = (status: string, test = false) => ({ _id: status + test, status, test }) as unknown as FrontDeskRequest

describe('FrontDeskBadgeService', () => {
  let items_: WritableSignal<FrontDeskRequest[]>
  let loggedIn: boolean
  let requests: { all_: WritableSignal<FrontDeskRequest[]>; ensureLoaded: jasmine.Spy; reloadFromStorage: jasmine.Spy }

  beforeEach(() => {
    items_ = signal([
      req('new'),
      req('qualified'),
      req('needs_info'),
      req('approved'),
      req('new', true),
      req('declined')
    ])
    loggedIn = true
    requests = {
      all_: items_,
      ensureLoaded: jasmine.createSpy('ensureLoaded').and.resolveTo(),
      reloadFromStorage: jasmine.createSpy('reloadFromStorage').and.resolveTo()
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: RequestDataService, useValue: requests },
        { provide: UserService, useValue: { isLoggedIn: () => loggedIn } }
      ]
    })
  })

  it('counts the waiting, non-test requests', () => {
    expect(TestBed.inject(FrontDeskBadgeService).waitingCount_()).toBe(3)
  })

  it('refresh(true) reloads, and a second plain refresh inside 60 s does not', async () => {
    const svc = TestBed.inject(FrontDeskBadgeService)
    await svc.refresh(true)
    await svc.refresh()
    expect(requests.reloadFromStorage).toHaveBeenCalledTimes(1)
  })

  it('does nothing while signed out', async () => {
    loggedIn = false
    await TestBed.inject(FrontDeskBadgeService).refresh(true)
    expect(requests.reloadFromStorage).not.toHaveBeenCalled()
  })
})
