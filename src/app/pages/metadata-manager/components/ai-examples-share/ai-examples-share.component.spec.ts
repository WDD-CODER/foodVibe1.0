import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Business } from '@schemas/entities'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { AiExamplesShareComponent } from './ai-examples-share.component'

describe('AiExamplesShareComponent (plan 600)', () => {
  let fixture: ComponentFixture<AiExamplesShareComponent>
  let business: WritableSignal<Business | null>
  let businessService: { business_: WritableSignal<Business | null>; updateShareAiExamples: jasmine.Spy }
  let userMsg: jasmine.SpyObj<UserMsgService>

  const base: Business = {
    _id: 'b1',
    name: 'b',
    ownerId: 'o1',
    createdAt: 1,
    internal: false,
    lastSyncedMasterVersion: 0
  }

  const box = (): HTMLInputElement => fixture.nativeElement.querySelector('.c-chip--toggle input')
  const click = () => {
    box().click()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    business = signal<Business | null>(base)
    businessService = {
      business_: business,
      updateShareAiExamples: jasmine.createSpy('updateShareAiExamples').and.callFake(async (share: boolean) => {
        business.update((b) => (b ? { ...b, shareAiExamples: share } : b))
      })
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    await TestBed.configureTestingModule({
      imports: [AiExamplesShareComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: businessService },
        { provide: UserMsgService, useValue: userMsg },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error', 'warn'])
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(AiExamplesShareComponent)
    fixture.detectChanges()
  })

  it('is unticked when the business never chose', () => {
    expect(box().checked).toBeFalse()
  })

  it('ticks from the stored choice', () => {
    business.set({ ...base, shareAiExamples: true })
    fixture.detectChanges()
    expect(box().checked).toBeTrue()
  })

  it('a tick saves true, an untick saves false', async () => {
    click()
    await fixture.whenStable()
    expect(businessService.updateShareAiExamples).toHaveBeenCalledWith(true)
    fixture.detectChanges()
    click()
    await fixture.whenStable()
    expect(businessService.updateShareAiExamples).toHaveBeenCalledWith(false)
  })

  it('a refused save flips the chip back and shows metadata_ai_share_error', async () => {
    businessService.updateShareAiExamples.and.rejectWith(new Error('403'))
    click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(box().checked).toBeFalse()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('metadata_ai_share_error')
  })
})
