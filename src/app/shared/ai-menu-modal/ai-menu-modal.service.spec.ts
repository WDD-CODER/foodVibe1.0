import { TestBed } from '@angular/core/testing'
import { AuthModalService } from '@services/auth-modal.service'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { AiMenuModalService } from './ai-menu-modal.service'

describe('AiMenuModalService (plan 620)', () => {
  let hasAi: boolean
  let service: AiMenuModalService

  beforeEach(() => {
    hasAi = true
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { isLoggedIn: () => true } },
        { provide: AuthModalService, useValue: { open: () => undefined } },
        { provide: ModuleService, useValue: { has: () => hasAi } }
      ]
    })
    service = TestBed.inject(AiMenuModalService)
  })

  it('opens with ai_create', () => {
    service.open('create')
    expect(service.isOpen()).toBeTrue()
  })

  it('returns without opening when ai_create is off', () => {
    hasAi = false
    service.open('create')
    expect(service.isOpen()).toBeFalse()
  })
})
