import { TestBed } from '@angular/core/testing'
import { AuthModalService } from '@services/auth-modal.service'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { AiProductModalService } from './ai-product-modal.service'

describe('AiProductModalService (plan 620)', () => {
  let hasAi: boolean
  let service: AiProductModalService

  beforeEach(() => {
    hasAi = true
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { isLoggedIn: () => true } },
        { provide: AuthModalService, useValue: { open: () => undefined } },
        { provide: ModuleService, useValue: { has: () => hasAi } }
      ]
    })
    service = TestBed.inject(AiProductModalService)
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
