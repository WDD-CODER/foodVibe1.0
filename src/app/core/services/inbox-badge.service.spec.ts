import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ConversationDataService } from './conversation-data.service'
import { InboxBadgeService } from './inbox-badge.service'
import { ModuleService } from './module.service'
import { UserService } from './user.service'
import type { ConversationRow } from '@models/conversation.model'

const row = (id: string, over: Partial<ConversationRow>): ConversationRow =>
  ({ _id: id, status: 'human', unread: 1, ...over }) as unknown as ConversationRow

describe('InboxBadgeService (plan 677)', () => {
  const rows = signal<ConversationRow[]>([])
  const loggedIn = signal(true)
  let list: jasmine.Spy

  function setup() {
    list = jasmine.createSpy('list').and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        { provide: ConversationDataService, useValue: { conversations_: rows, list } },
        { provide: UserService, useValue: { isLoggedIn: () => loggedIn() } },
        { provide: ModuleService, useValue: { has: () => true } }
      ]
    })
    return TestBed.inject(InboxBadgeService)
  }

  beforeEach(() => {
    rows.set([])
    loggedIn.set(true)
  })

  it('counts human, unread, non-test conversations', () => {
    rows.set([
      row('a', {}),
      row('b', { status: 'bot' }),
      row('c', { unread: 0 }),
      row('d', { test: true }),
      row('e', { unread: 4 })
    ])
    expect(setup().pendingCount_()).toBe(2)
  })

  it('is 0 when signed out', () => {
    rows.set([row('a', {})])
    loggedIn.set(false)
    expect(setup().pendingCount_()).toBe(0)
  })

  it('loads once on creation; refresh() inside 60 s does nothing and refresh(true) reloads', async () => {
    const service = setup()
    TestBed.flushEffects()
    expect(list).toHaveBeenCalledTimes(1)
    await service.refresh()
    expect(list).toHaveBeenCalledTimes(1)
    await service.refresh(true)
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('refresh does nothing while signed out', async () => {
    loggedIn.set(false)
    const service = setup()
    await service.refresh(true)
    expect(list).not.toHaveBeenCalled()
  })
})
