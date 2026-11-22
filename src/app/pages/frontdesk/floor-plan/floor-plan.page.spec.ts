import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { Directionality } from '@angular/cdk/bidi'
import { AlertTriangle, LayoutGrid, LucideAngularModule } from 'lucide-angular'
import { FloorPlanPage } from './floor-plan.page'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { FloorPlan } from '@models/floor-plan.model'

const DICT: Record<string, string> = {
  fd_opt_inside: 'בפנים',
  fd_opt_outside: 'בחוץ',
  fd_opt_bar: 'בר',
  fp_table_label: 'שולחן {number}, {min}–{max} מקומות'
}

type Internals = {
  hasRealChanges: () => boolean
  draft_: WritableSignal<{
    areas: { name: string; order: number; key: string }[]
    tables: { number: string; shape: string; minSeats: number; maxSeats: number; key: string }[]
  } | null>
  selectedKey_: () => string | null
  addTable: (p: { id: string; labelKey: string; shape: 'square'; minSeats: number; maxSeats: number }) => void
  save: () => Promise<boolean>
  saveAndWait: () => Promise<boolean>
}

const SAVED: FloorPlan = {
  _id: 'fp1',
  businessId: 'b1',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [],
  joins: []
} as unknown as FloorPlan

describe('FloorPlanPage (plan 665)', () => {
  let fixture: ComponentFixture<FloorPlanPage>
  let plan_: WritableSignal<FloorPlan | null>
  let failed_: WritableSignal<boolean>
  let service: { load: jasmine.Spy; save: jasmine.Spy }
  let userMsg: jasmine.SpyObj<UserMsgService>
  let profileAreas: string[] | undefined

  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const preset4 = { id: 'p4', labelKey: 'fp_preset_4', shape: 'square' as const, minSeats: 2, maxSeats: 4 }

  async function setup(
    opts: { saved?: FloorPlan | null; owner?: boolean; areas?: string[]; saveOk?: boolean; loadFails?: boolean } = {}
  ) {
    plan_ = signal(opts.saved ?? null)
    failed_ = signal(opts.loadFails ?? false)
    profileAreas = opts.areas
    service = {
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      save: jasmine
        .createSpy('save')
        .and.callFake(async () => (opts.saveOk === false ? { ok: false, code: 'X' } : { ok: true, plan: SAVED }))
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [FloorPlanPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, LayoutGrid, AlertTriangle })],
      providers: [
        provideRouter([]),
        { provide: FloorPlanDataService, useValue: { ...service, plan_, loadFailed_: failed_ } },
        {
          provide: FrontDeskProfileDataService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            profile_: signal(
              profileAreas ? { requestKinds: { table: { rules: { areas: profileAreas } } } } : { requestKinds: {} }
            )
          }
        },
        { provide: PermissionService, useValue: { can: () => opts.owner !== false } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => DICT[k ?? ''] ?? k ?? '' } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info']) },
        { provide: Directionality, useValue: { value: 'rtl', change: { subscribe: () => ({ unsubscribe() {} }) } } }
      ]
    })
    fixture = TestBed.createComponent(FloorPlanPage)
    await settle()
  }

  it('starts from three default areas and no table when nothing was saved', async () => {
    await setup()
    expect(
      cmp()
        .draft_()!
        .areas.map((a) => a.name)
    ).toEqual(['בפנים', 'בחוץ', 'בר'])
    expect(cmp().draft_()!.tables.length).toBe(0)
    expect(cmp().hasRealChanges()).toBeFalse()
  })

  it('starts from the profile areas when it lists some', async () => {
    await setup({ areas: ['מרפסת', 'אולם'] })
    expect(
      cmp()
        .draft_()!
        .areas.map((a) => a.name)
    ).toEqual(['מרפסת', 'אולם'])
  })

  it('adds a square table numbered 1 with seats 2-4 and selects it', async () => {
    await setup()
    const button = el().querySelector('[data-testid="fp-preset-p4"]') as HTMLButtonElement
    button.click()
    await settle()
    const table = cmp().draft_()!.tables[0]
    expect(table.number).toBe('1')
    expect(table.shape).toBe('square')
    expect([table.minSeats, table.maxSeats]).toEqual([2, 4])
    expect(cmp().selectedKey_()).toBe(table.key)
    expect(el().querySelector('[data-testid="floor-table-1"]')).not.toBeNull()
  })

  it('tracks changes: false after load, true after an add, false after a successful save', async () => {
    await setup()
    expect(cmp().hasRealChanges()).toBeFalse()
    cmp().addTable(preset4)
    expect(cmp().hasRealChanges()).toBeTrue()
    expect(await cmp().save()).toBeTrue()
    expect(service.save).toHaveBeenCalledTimes(1)
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('fp_saved')
    expect(cmp().hasRealChanges()).toBeFalse()
  })

  it('keeps the draft and shows fp_save_failed when the save fails', async () => {
    await setup({ saveOk: false })
    cmp().addTable(preset4)
    expect(await cmp().saveAndWait()).toBeFalse()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('fp_save_failed')
    expect(cmp().draft_()!.tables.length).toBe(1)
    expect(cmp().hasRealChanges()).toBeTrue()
  })

  it('shows the retry state when the read fails', async () => {
    await setup({ loadFails: true })
    expect(el().querySelector('[data-testid="fp-load-failed"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="floor-grid"]')).toBeNull()
  })

  it('shows no preset row and no save button to a member without editFrontDesk', async () => {
    await setup({ owner: false, saved: SAVED })
    expect(el().querySelector('[data-testid="fp-preset-p4"]')).toBeNull()
    expect(el().querySelector('[data-testid="fp-save"]')).toBeNull()
    expect(el().querySelector('[data-testid="fp-read-only-note"]')).not.toBeNull()
  })
})
