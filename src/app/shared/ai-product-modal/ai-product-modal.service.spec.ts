import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { AiProductModalService } from './ai-product-modal.service'

describe('AiProductModalService (plan 620)', () => {
  const aiOn = signal(true)
  let service: AiProductModalService

  beforeEach(() => {
    aiOn.set(true)
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { isLoggedIn: () => true } },
        { provide: AuthModalService, useValue: { open: () => {} } },
        { provide: ModuleService, useValue: { has: () => aiOn() } }
      ]
    })
    service = TestBed.inject(AiProductModalService)
  })

  it('opens when the business has ai_create', () => {
    service.open('create')
    expect(service.isOpen()).toBeTrue()
  })

  it('opens nothing without ai_create', () => {
    aiOn.set(false)
    service.open('create')
    expect(service.isOpen()).toBeFalse()
  })
})
