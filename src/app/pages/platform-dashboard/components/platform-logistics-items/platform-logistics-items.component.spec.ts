import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { PlatformAdminService, type AdminTermRow } from '@services/platform-admin.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { PlatformLogisticsItemsComponent } from './platform-logistics-items.component'

function row(id: string, business: string, key: string, extra: Partial<AdminTermRow> = {}): AdminTermRow {
  return {
    id,
    businessId: business,
    businessName: `Biz ${business}`,
    key,
    phase: 'site_visit',
    section: 'space',
    answerType: 'status',
    environments: null,
    hint: null,
    createdAt: 100,
    ...extra
  }
}

describe('PlatformLogisticsItemsComponent', () => {
  let fixture: ComponentFixture<PlatformLogisticsItemsComponent>
  let rows_: ReturnType<typeof signal<AdminTermRow[]>>
  let loadTerms: jasmine.Spy
  let add: jasmine.Spy
  let confirmOpen: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>

  async function setup(rows: AdminTermRow[]): Promise<void> {
    rows_ = signal(rows)
    loadTerms = jasmine.createSpy('loadTerms').and.resolveTo()
    add = jasmine.createSpy('add').and.resolveTo({})
    confirmOpen = jasmine.createSpy('open').and.resolveTo(true)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    TestBed.configureTestingModule({
      imports: [PlatformLogisticsItemsComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: PlatformAdminService, useValue: { termRows_: rows_.asReadonly(), loadTerms } },
        { provide: TaxonomyStore, useValue: { add } },
        { provide: ConfirmModalService, useValue: { open: confirmOpen } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    fixture = TestBed.createComponent(PlatformLogisticsItemsComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement
  const promoteBtn = (i = 0): HTMLButtonElement =>
    el().querySelectorAll<HTMLButtonElement>('.logistics-group__promote')[i]

  it('groups same-key rows into one group of 2 businesses and puts it first', async () => {
    await setup([row('1', 'A', 'solo'), row('2', 'A', 'dup'), row('3', 'B', ' dup ', { createdAt: 50 })])
    const keys = Array.from(el().querySelectorAll('.logistics-group__key')).map((n) => n.textContent?.trim())
    expect(keys).toEqual(['dup', 'solo'])
    expect(el().querySelectorAll('.logistics-group')[0].querySelectorAll('.c-chip--tag').length).toBe(2)
    expect(el().querySelector('.logistics-group__count')?.textContent).toContain('2')
  })

  it('promote confirms, shares with the oldest row extras, then reloads', async () => {
    await setup([
      row('1', 'A', 'dup', { createdAt: 200 }),
      row('2', 'B', 'dup', { createdAt: 50, hint: 'h', environments: ['indoor'] })
    ])
    loadTerms.calls.reset()
    promoteBtn().click()
    await fixture.whenStable()
    expect(confirmOpen).toHaveBeenCalled()
    expect(add).toHaveBeenCalledWith(
      'logisticsItem',
      'dup',
      { phase: 'site_visit', section: 'space', answerType: 'status', environments: ['indoor'], hint: 'h' },
      { shared: true }
    )
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('platform_logistics_promoted')
    expect(loadTerms).toHaveBeenCalledWith('logisticsItem')
  })

  it('cancel calls nothing', async () => {
    await setup([row('1', 'A', 'dup')])
    confirmOpen.and.resolveTo(false)
    loadTerms.calls.reset()
    promoteBtn().click()
    await fixture.whenStable()
    expect(add).not.toHaveBeenCalled()
    expect(loadTerms).not.toHaveBeenCalled()
  })

  it('a 409 shows already-shared and reloads', async () => {
    await setup([row('1', 'A', 'dup')])
    add.and.rejectWith(new HttpErrorResponse({ status: 409 }))
    loadTerms.calls.reset()
    promoteBtn().click()
    await fixture.whenStable()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('platform_logistics_already_shared')
    expect(loadTerms).toHaveBeenCalled()
  })

  it('shows the empty state with no rows', async () => {
    await setup([])
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().querySelector('.logistics-group')).toBeNull()
  })
})
