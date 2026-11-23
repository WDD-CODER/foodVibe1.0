import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, type WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { Directionality } from '@angular/cdk/bidi'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  LayoutGrid,
  LucideAngularModule,
  Plus,
  Trash2,
  X
} from 'lucide-angular'
import { By } from '@angular/platform-browser'
import { FloorPlanPage } from './floor-plan.page'
import { FloorMapComponent } from 'src/app/shared/floor-map/floor-map.component'
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
    opts: {
      saved?: FloorPlan | null
      owner?: boolean
      areas?: string[]
      saveOk?: boolean
      loadFails?: boolean
      saveAnswer?: unknown
    } = {}
  ) {
    plan_ = signal(opts.saved ?? null)
    failed_ = signal(opts.loadFails ?? false)
    profileAreas = opts.areas
    service = {
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      save: jasmine
        .createSpy('save')
        .and.callFake(
          async () => opts.saveAnswer ?? (opts.saveOk === false ? { ok: false, code: 'X' } : { ok: true, plan: SAVED })
        )
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetSuccessMsg',
      'onSetErrorMsg',
      'onSetSuccessMsgWithUndo'
    ])
    TestBed.configureTestingModule({
      imports: [
        FloorPlanPage,
        LucideAngularModule.pick({
          ...TEST_LUCIDE_ICONS,
          LayoutGrid,
          AlertTriangle,
          ChevronDown,
          ChevronUp,
          Copy,
          Plus,
          Trash2,
          X
        })
      ],
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

  describe('editing (plan 684)', () => {
    const TWO: FloorPlan = {
      ...SAVED,
      tables: [
        {
          key: 'tab001',
          number: '1',
          areaKey: 'areaa1',
          shape: 'square',
          minSeats: 2,
          maxSeats: 4,
          x: 0,
          y: 0,
          w: 3,
          h: 3,
          turned: false,
          active: true,
          online: true
        },
        {
          key: 'tab002',
          number: '2',
          areaKey: 'areaa1',
          shape: 'square',
          minSeats: 2,
          maxSeats: 4,
          x: 5,
          y: 0,
          w: 3,
          h: 3,
          turned: false,
          active: true,
          online: true
        }
      ],
      joins: [{ key: 'join01', tableKeys: ['tab001', 'tab002'], minSeats: 2, maxSeats: 8, online: true }]
    } as unknown as FloorPlan
    const click = async (testId: string) => {
      ;(el().querySelector(`[data-testid="${testId}"]`) as HTMLElement).click()
      await settle()
    }
    type Full = { draft_: () => { tables: { key: string }[]; joins: { key: string }[] } }
    const draft = () => (cmp() as unknown as Full).draft_()

    describe('zones and joined tables (plan 699)', () => {
      const map = (): FloorMapComponent =>
        fixture.debugElement.query(By.directive(FloorMapComponent)).componentInstance as FloorMapComponent
      const ZONED = {
        ...TWO,
        areas: [
          { key: 'areaa1', name: 'בפנים', order: 0, color: 0 },
          { key: 'areab2', name: 'בחוץ', order: 1, color: 1, zone: { x: 12, y: 8, w: 8, h: 6 } }
        ]
      } as unknown as FloorPlan

      it('gives the map every joined table key and coloured tables', async () => {
        await setup({ saved: TWO })
        expect([...map().joinedKeys()].sort()).toEqual(['tab001', 'tab002'])
        expect(map().colorTables()).toBeTrue()
        expect(el().querySelector('[data-testid="floor-table-1"]')?.classList).toContain('is-joined')
      })

      it('no longer passes dimOtherThanArea when an area chip is chosen', async () => {
        await setup({ saved: ZONED })
        ;(cmp() as unknown as { selectArea: (k: string | null) => void }).selectArea('areab2')
        await settle()
        expect(map().dimOtherThanArea()).toBeNull()
        expect(el().querySelector('.is-dimmed')).toBeNull()
      })

      it('a table moved into another area zone takes that area and the join across areas drops with an undo', async () => {
        await setup({ saved: ZONED })
        map().tableMoved.emit({ key: 'tab002', x: 13, y: 9 })
        await settle()
        const moved = (cmp() as unknown as { draft_: () => FloorPlan }).draft_().tables.find((t) => t.key === 'tab002')
        expect([moved?.x, moved?.y, moved?.areaKey]).toEqual([13, 9, 'areab2'])
        expect(draft().joins).toEqual([])
        expect(userMsg.onSetSuccessMsgWithUndo).toHaveBeenCalledWith('fp_join_dropped', jasmine.any(Function))
      })

      it('a table moved outside every zone keeps its area', async () => {
        await setup({ saved: ZONED })
        map().tableMoved.emit({ key: 'tab002', x: 6, y: 4 })
        await settle()
        const moved = (cmp() as unknown as { draft_: () => FloorPlan }).draft_().tables.find((t) => t.key === 'tab002')
        expect([moved?.x, moved?.y, moved?.areaKey]).toEqual([6, 4, 'areaa1'])
        expect(draft().joins.length).toBe(1)
      })
    })

    it('shows the room panel with no selection and the table panel after a tap', async () => {
      await setup({ saved: TWO })
      expect(el().querySelector('[data-testid="room-panel"]')).not.toBeNull()
      await click('floor-table-1')
      expect(el().querySelector('[data-testid="table-panel"]')).not.toBeNull()
      expect(el().querySelector('[data-testid="room-panel"]')).toBeNull()
    })

    it('removing a table and pressing the undo brings back the table and its joins', async () => {
      await setup({ saved: TWO })
      await click('floor-table-1')
      await click('tp-remove')
      expect(draft().tables.map((t) => t.key)).toEqual(['tab002'])
      expect(draft().joins).toEqual([])
      expect(userMsg.onSetSuccessMsgWithUndo).toHaveBeenCalledWith('fp_table_removed', jasmine.any(Function))
      userMsg.onSetSuccessMsgWithUndo.calls.mostRecent().args[1]()
      await settle()
      expect(
        draft()
          .tables.map((t) => t.key)
          .sort()
      ).toEqual(['tab001', 'tab002'])
      expect(draft().joins.map((j) => j.key)).toEqual(['join01'])
    })

    it('duplicates the selected table and selects the copy', async () => {
      await setup({ saved: TWO })
      await click('floor-table-1')
      await click('tp-duplicate')
      expect(draft().tables.length).toBe(3)
      expect(el().querySelector('[data-testid="floor-table-3"]')).not.toBeNull()
    })

    it('Escape clears the selection', async () => {
      await setup({ saved: TWO })
      await click('floor-table-1')
      expect(cmp().selectedKey_()).toBe('tab001')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await settle()
      expect(cmp().selectedKey_()).toBeNull()
    })

    it('keeps the draft and shows the in-use notice on 409 TABLE_IN_USE, and restores the tables', async () => {
      await setup({
        saved: TWO,
        saveAnswer: {
          ok: false,
          code: 'TABLE_IN_USE',
          bookings: [
            { _id: 'b1', date: '2026-12-01', time: '19:00', partySize: 2, tableKeys: ['tab001'] },
            { _id: 'b2', date: '2026-12-02', time: '19:00', partySize: 2, tableKeys: ['tab001'] }
          ]
        }
      })
      await click('floor-table-1')
      await click('tp-remove')
      expect(await cmp().save()).toBeFalse()
      await settle()
      const notice = el().querySelector('[data-testid="fp-in-use"]') as HTMLElement
      expect(notice.getAttribute('role')).toBe('alert')
      expect(notice.textContent).toContain('fp_in_use_title')
      expect(notice.textContent).toContain('fp_in_use_row')
      expect(draft().tables.length).toBe(1)
      await click('fp-in-use-restore')
      expect(el().querySelector('[data-testid="fp-in-use"]')).toBeNull()
      expect(
        draft()
          .tables.map((t) => t.key)
          .sort()
      ).toEqual(['tab001', 'tab002'])
      expect(draft().joins.length).toBe(1)
    })

    describe('joins and arrows (plan 666)', () => {
      const THREE: FloorPlan = {
        ...TWO,
        joins: []
      } as unknown as FloorPlan
      const picked = () => (cmp() as unknown as { picked_: () => string[] }).picked_()

      it('multi-select: a tap picks a table, a second removes it, no table panel opens', async () => {
        await setup({ saved: THREE })
        await click('fp-multi')
        await click('floor-table-1')
        expect(picked()).toEqual(['tab001'])
        expect(el().querySelector('[data-testid="table-panel"]')).toBeNull()
        await click('floor-table-1')
        expect(picked()).toEqual([])
        expect((el().querySelector('[data-testid="fp-preset-p4"]') as HTMLButtonElement).disabled).toBeTrue()
      })

      it('"חיבור השולחנות" adds one join and leaves multi-select', async () => {
        await setup({ saved: THREE })
        await click('fp-multi')
        expect((el().querySelector('[data-testid="fp-join-action"]') as HTMLButtonElement).disabled).toBeTrue()
        await click('floor-table-1')
        await click('floor-table-2')
        await click('fp-join-action')
        expect(draft().joins.length).toBe(1)
        expect(el().querySelector('[data-testid="fp-join-bar"]')).toBeNull()
        expect(picked()).toEqual([])
        expect(el().querySelector('[data-testid="join-label"]')?.textContent).toContain('1 + 2')
      })

      it('removing a join and pressing undo brings it back', async () => {
        await setup({ saved: TWO })
        await click('join-remove')
        expect(draft().joins).toEqual([])
        expect(userMsg.onSetSuccessMsgWithUndo).toHaveBeenCalledWith('fp_join_removed', jasmine.any(Function))
        userMsg.onSetSuccessMsgWithUndo.calls.mostRecent().args[1]()
        await settle()
        expect(draft().joins.map((j) => j.key)).toEqual(['join01'])
      })

      it('the arrow that points down moves the selected table one cell', async () => {
        await setup({ saved: THREE })
        await click('floor-table-1')
        expect(cmp().hasRealChanges()).toBeFalse()
        await click('tp-move-down')
        expect(el().querySelector('[data-testid="floor-table-1"]')?.getAttribute('data-y')).toBe('1')
        expect(cmp().hasRealChanges()).toBeTrue()
      })

      it('opens the room panel from the button and the sheet close clears it', async () => {
        await setup({ saved: THREE })
        await click('fp-room-open')
        expect(el().querySelector('[data-testid="fp-panel"]')?.classList).toContain('floor-plan__panel--open')
        await click('fp-sheet-close')
        expect(el().querySelector('[data-testid="fp-panel"]')?.classList).not.toContain('floor-plan__panel--open')
      })
    })

    it('shows no panel to staff', async () => {
      await setup({ saved: TWO, owner: false })
      await click('floor-table-1')
      expect(el().querySelector('.floor-plan__panel')).toBeNull()
    })
  })

  it('shows no preset row and no save button to a member without editFrontDesk', async () => {
    await setup({ owner: false, saved: SAVED })
    expect(el().querySelector('[data-testid="fp-preset-p4"]')).toBeNull()
    expect(el().querySelector('[data-testid="fp-save"]')).toBeNull()
    expect(el().querySelector('[data-testid="fp-read-only-note"]')).not.toBeNull()
  })
})
