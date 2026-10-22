import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Business } from '@schemas/entities'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { StaffStagesManagerComponent } from './staff-stages-manager.component'

const ALL = [
  'inquiry',
  'quote_sent',
  'deposit_paid',
  'ordering',
  'execution',
  'post_production',
  'finished',
  'not_closed'
]

describe('StaffStagesManagerComponent (plan 477)', () => {
  let fixture: ComponentFixture<StaffStagesManagerComponent>
  let business: WritableSignal<Business | null>
  let businessService: { business_: WritableSignal<Business | null>; updateStaffVisibleStages: jasmine.Spy }
  let userMsg: jasmine.SpyObj<UserMsgService>
  let logging: jasmine.SpyObj<LoggingService>

  const base: Business = {
    _id: 'b1',
    name: 'b',
    ownerId: 'o1',
    createdAt: 1,
    internal: false,
    lastSyncedMasterVersion: 0
  }

  const boxes = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.c-chip--toggle input[type="checkbox"]'))
  const box = (stage: string): HTMLInputElement =>
    fixture.nativeElement.querySelector(`[data-testid="staff-stage-${stage}"] input`)
  const click = (stage: string) => {
    box(stage).click()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    business = signal<Business | null>(base)
    businessService = {
      business_: business,
      updateStaffVisibleStages: jasmine.createSpy('updateStaffVisibleStages').and.callFake(async (stages: string[]) => {
        business.update((b) => (b ? { ...b, staffVisibleStages: stages as Business['staffVisibleStages'] } : b))
      })
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['error', 'warn'])
    await TestBed.configureTestingModule({
      imports: [StaffStagesManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: BusinessService, useValue: businessService },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: logging },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(StaffStagesManagerComponent)
    fixture.detectChanges()
  })

  it('shows the eight stage chips in pipeline order, all ticked when no list is stored', () => {
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.c-chip--toggle span')).map((s) =>
      (s as HTMLElement).textContent?.trim()
    )
    expect(labels).toEqual(ALL.map((s) => `event_stage_${s}`))
    expect(boxes().every((b) => b.checked)).toBeTrue()
  })

  it('ticks the chips from the stored list', () => {
    business.set({ ...base, staffVisibleStages: ['ordering', 'execution'] })
    fixture.detectChanges()
    expect(
      boxes()
        .filter((b) => b.checked)
        .map((b) => b.closest('label')?.dataset['testid'])
    ).toEqual(['staff-stage-ordering', 'staff-stage-execution'])
  })

  it('an untick saves the whole new list in pipeline order', async () => {
    click('quote_sent')
    await fixture.whenStable()
    expect(businessService.updateStaffVisibleStages).toHaveBeenCalledWith(ALL.filter((s) => s !== 'quote_sent'))
  })

  it('a tick adds the stage to the stored list', async () => {
    business.set({ ...base, staffVisibleStages: ['execution'] })
    fixture.detectChanges()
    click('inquiry')
    await fixture.whenStable()
    expect(businessService.updateStaffVisibleStages).toHaveBeenCalledWith(['inquiry', 'execution'])
  })

  it('a failed save restores the chip and shows staff_stages_save_error', async () => {
    businessService.updateStaffVisibleStages.and.rejectWith(new Error('403'))
    click('inquiry')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(box('inquiry').checked).toBeTrue()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('staff_stages_save_error')
    expect(logging.error).toHaveBeenCalled()
  })
})
