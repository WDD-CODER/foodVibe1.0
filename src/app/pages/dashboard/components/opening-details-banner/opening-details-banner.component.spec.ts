import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { OpeningDetailsBannerComponent } from './opening-details-banner.component'

describe('OpeningDetailsBannerComponent', () => {
  let fixture: ComponentFixture<OpeningDetailsBannerComponent>
  let router: jasmine.SpyObj<Router>
  let updateBaseline: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  let logging: jasmine.SpyObj<LoggingService>

  function setup(): void {
    router = jasmine.createSpyObj('Router', ['navigate'])
    router.navigate.and.resolveTo(true)
    updateBaseline = jasmine.createSpy('updateBaseline').and.resolveTo()
    userMsg = jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg'])
    logging = jasmine.createSpyObj('LoggingService', ['error'])
    TestBed.configureTestingModule({
      imports: [OpeningDetailsBannerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: Router, useValue: router },
        { provide: BusinessService, useValue: { updateBaseline } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: logging },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    fixture = TestBed.createComponent(OpeningDetailsBannerComponent)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const button = (testId: string) => el().querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement

  it('shows the title, the text and both buttons', () => {
    setup()
    expect(el().textContent).toContain('opening_details_banner_title')
    expect(el().textContent).toContain('opening_details_banner_text')
    expect(button('opening-banner-open').textContent).toContain('opening_details_banner_action')
    expect(button('opening-banner-skip').textContent).toContain('skip')
  })

  it('the open button and the title row both open Settings on the opening details with first=1', () => {
    setup()
    button('opening-banner-open').click()
    button('opening-banner-main').click()
    expect(router.navigate).toHaveBeenCalledTimes(2)
    expect(router.navigate).toHaveBeenCalledWith(['/settings'], { queryParams: { tab: 'baseline', first: 1 } })
  })

  it('skip stores an empty baseline and does not navigate', async () => {
    setup()
    button('opening-banner-skip').click()
    await fixture.whenStable()
    expect(updateBaseline).toHaveBeenCalledOnceWith({})
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('skip failing logs the error and shows the save_failed toast', async () => {
    setup()
    updateBaseline.and.rejectWith({ status: 500 })
    button('opening-banner-skip').click()
    await fixture.whenStable()
    expect(logging.error).toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledOnceWith('save_failed')
  })

  it('skip is disabled while saving', async () => {
    setup()
    let release: () => void = () => undefined
    updateBaseline.and.returnValue(new Promise<void>((resolve) => (release = resolve)))
    button('opening-banner-skip').click()
    fixture.detectChanges()
    expect(button('opening-banner-skip').disabled).toBeTrue()
    release()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(button('opening-banner-skip').disabled).toBeFalse()
  })
})
