import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { ApproveTableDialogComponent, type ApproveChoice } from './approve-table-dialog.component'
import { BookingDataService } from '@services/booking-data.service'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { jerusalemEpoch } from '@schemas/front-desk/local-time'
import { ROOM, profileWith, tableKeyOf } from '@schemas/testing/table-engine-fixtures'
import type { FrontDeskRequest } from '@models/request.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const DATE = '2026-06-02'
const request = {
  _id: 'r1',
  kind: 'table',
  wanted: { date: DATE, time: '20:00', partySize: 2 }
} as unknown as FrontDeskRequest

describe('ApproveTableDialogComponent (plan 672)', () => {
  let fixture: ComponentFixture<ApproveTableDialogComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)

  function setup(owner: boolean, alternatives: { date: string; time: string }[]): jasmine.Spy {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [ApproveTableDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: BookingDataService,
          useValue: {
            dayBoard: () =>
              Promise.resolve({
                bookings: [
                  {
                    _id: 'b1',
                    kind: 'table',
                    status: 'seated',
                    startAt: jerusalemEpoch(DATE, '19:30'),
                    endAt: jerusalemEpoch(DATE, '21:00'),
                    tableKeys: [tableKeyOf(1)]
                  }
                ],
                holds: [],
                unassigned: [],
                now: jerusalemEpoch('2026-06-01', '10:00')
              })
          }
        },
        { provide: FloorPlanDataService, useValue: { plan_: signal(ROOM), ensureLoaded: () => Promise.resolve() } },
        { provide: FrontDeskProfileDataService, useValue: { profile_: signal(profileWith()) } },
        { provide: PermissionService, useValue: { isOwner_: signal(owner) } },
        { provide: TranslationService, useValue: translation }
      ]
    })
    fixture = TestBed.createComponent(ApproveTableDialogComponent)
    fixture.componentRef.setInput('request', request)
    fixture.componentRef.setInput('alternatives', alternatives)
    const chosen = jasmine.createSpy('chosen')
    fixture.componentInstance.chosen.subscribe((c: ApproveChoice) => chosen(c))
    fixture.detectChanges()
    tick()
    fixture.detectChanges()
    return chosen
  }

  it('a tap on an alternative chip asks to approve again with that date and time', fakeAsync(() => {
    const chosen = setup(false, [{ date: DATE, time: '21:00' }])
    expect(byId('att-asked')?.textContent).toContain('20:00')
    ;(byId('att-alt-21:00') as HTMLElement).click()
    expect(chosen).toHaveBeenCalledOnceWith({ date: DATE, time: '21:00' })
    flush()
  }))

  it('staff see the chips and no map', fakeAsync(() => {
    setup(false, [{ date: DATE, time: '21:00' }])
    expect(byId('att-tables')).toBeNull()
    flush()
  }))

  it('the owner sees the free tables and a tap on one asks to approve with its key', fakeAsync(() => {
    const chosen = setup(true, [])
    expect(byId('att-tables')).toBeTruthy()
    // Table 1 is taken by the seated booking; table 2 is free.
    ;(byId('floor-table-1') as HTMLElement).click()
    expect(chosen).not.toHaveBeenCalled()
    ;(byId('floor-table-2') as HTMLElement).click()
    expect(chosen).toHaveBeenCalledOnceWith({ tableKeys: [tableKeyOf(2)] })
    flush()
  }))

  it('with no alternative and no free table it says so', fakeAsync(() => {
    setup(false, [])
    expect(byId('att-none')?.textContent).toContain('rq_no_table_none')
    flush()
  }))
})
