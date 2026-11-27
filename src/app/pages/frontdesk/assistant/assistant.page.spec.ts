import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { AssistantRunRow, AssistantRunView } from '@models/assistant-run.model'
import { AssistantPage } from './assistant.page'

const DICT: Record<string, string> = {
  asr_owner_only: 'הדף פתוח לבעל העסק בלבד',
  asr_empty: 'עדיין אין כאן מה להציג',
  asr_empty_filter: 'אין הודעות שמתאימות',
  asr_load_failed: 'לא הצלחנו לטעון את הרשימה',
  asr_run_load_failed: 'לא הצלחנו לטעון את הפרטים',
  asr_not_found: 'הרשומה לא נמצאה',
  asr_pick: 'בחרו הודעה מהרשימה',
  asr_text_hidden: 'הטקסט מוסתר',
  asr_no_text: '(בלי טקסט)',
  asr_outcome_answered: 'ענה לאורח',
  asr_fallback_mark: 'AI גיבוי',
  rq_test_tag: 'בדיקה',
  retry: 'נסה שוב'
}

const row = (id: string, over: Partial<AssistantRunRow> = {}): AssistantRunRow => ({
  _id: id,
  conversationId: 'c1',
  mode: 'turn',
  startedAt: Date.UTC(2026, 0, 5, 10, 0),
  ms: 6400,
  outcome: 'answered',
  fallbackUsed: false,
  text: 'שלום ' + id,
  ...over
})

const fullRun = (id: string): AssistantRunView => ({
  _id: id,
  businessId: 'b1',
  conversationId: 'c1',
  mode: 'turn',
  level: 1,
  startedAt: 1,
  endedAt: 2,
  ms: 1,
  expiresAt: '2026-12-20T12:00:00.000Z',
  trigger: { messageIds: [], text: '' },
  outcome: 'answered',
  fallbackUsed: false,
  steps: RUN_STEP_KEYS.map((key) => ({ key, status: 'ok', ms: 0 }))
})

describe('AssistantPage (plan 752)', () => {
  let fixture: ComponentFixture<AssistantPage>
  let owner: WritableSignal<boolean>
  let admin: WritableSignal<boolean>
  let runs: WritableSignal<AssistantRunRow[]>
  let loaded: WritableSignal<boolean>
  let listFailed: WritableSignal<boolean>
  let more: WritableSignal<boolean>
  let openRun: WritableSignal<AssistantRunView | null>
  let runLoading: WritableSignal<boolean>
  let runFailed: WritableSignal<'not_found' | 'failed' | null>
  let data: Record<string, jasmine.Spy | WritableSignal<unknown>>
  let list: jasmine.Spy
  let open: jasmine.Spy

  async function create(options: { id?: string; query?: Record<string, string> } = {}) {
    const params = convertToParamMap(options.id ? { id: options.id } : {})
    const route = {
      paramMap: new BehaviorSubject(params),
      snapshot: { paramMap: params, queryParamMap: convertToParamMap(options.query ?? {}) }
    }
    await TestBed.configureTestingModule({
      imports: [AssistantPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AssistantRunDataService, useValue: data },
        { provide: PermissionService, useValue: { isOwner_: owner } },
        { provide: UserService, useValue: { isPlatformAdmin_: admin } },
        { provide: TranslationService, useValue: { translate: (k: string) => DICT[k] ?? k } }
      ]
    }).compileComponents()
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(AssistantPage)
    await settle()
  }

  beforeEach(() => {
    owner = signal(true)
    admin = signal(false)
    runs = signal<AssistantRunRow[]>([])
    loaded = signal(true)
    listFailed = signal(false)
    more = signal(false)
    openRun = signal<AssistantRunView | null>(null)
    runLoading = signal(false)
    runFailed = signal<'not_found' | 'failed' | null>(null)
    list = jasmine.createSpy('list').and.resolveTo()
    open = jasmine.createSpy('open').and.resolveTo()
    data = {
      runs_: runs,
      more_: more,
      listLoaded_: loaded,
      listFailed_: listFailed,
      loadingMore_: signal(false),
      run_: openRun,
      runLoading_: runLoading,
      runFailed_: runFailed,
      list,
      loadMore: jasmine.createSpy('loadMore').and.resolveTo(),
      open,
      closeRun: jasmine.createSpy('closeRun')
    }
  })

  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const rowEls = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="asr-row"]'))
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('shows staff only the owner-only message, with no list and no call', async () => {
    owner.set(false)
    await create({ id: 'r1' })
    expect(el().textContent).toContain('הדף פתוח לבעל העסק בלבד')
    expect(byId('asr-list')).toBeNull()
    expect(byId('asr-refresh')).toBeNull()
    expect(list).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('lets a platform admin in', async () => {
    owner.set(false)
    admin.set(true)
    await create()
    expect(byId('asr-list')).not.toBeNull()
  })

  it('shows the tab and the loader before the first answer', async () => {
    loaded.set(false)
    await create()
    expect(byId('asr-tab-runs')!.getAttribute('aria-selected')).toBe('true')
    expect(byId('asr-list')!.querySelector('app-loader')).not.toBeNull()
    expect(list).toHaveBeenCalledOnceWith({ filter: 'all', test: false })
  })

  it('says the list is empty, and under a filter that nothing matches', async () => {
    await create()
    expect(byId('asr-list')!.textContent).toContain('עדיין אין כאן מה להציג')
    byId<HTMLInputElement>('asr-filter-handover')!.click()
    await settle()
    expect(byId('asr-list')!.textContent).toContain('אין הודעות שמתאימות')
  })

  it('shows a failed list with a retry that reads it again', async () => {
    listFailed.set(true)
    await create()
    expect(byId('asr-list')!.textContent).toContain('לא הצלחנו לטעון את הרשימה')
    list.calls.reset()
    const retry = Array.from(byId('asr-list')!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('נסה שוב')
    )
    retry!.click()
    expect(list).toHaveBeenCalledOnceWith({ filter: 'all', test: false })
  })

  it('draws each row with its text, duration, result, test tag and fallback mark', async () => {
    runs.set([
      row('a'),
      row('b', { fallbackUsed: true, test: true }),
      row('c', { text: '', textHidden: true }),
      row('d', { text: '' })
    ])
    await create()
    const [a, b, c, d] = rowEls()
    expect(a.textContent).toContain('שלום a')
    expect(a.textContent).toContain('ענה לאורח')
    expect(a.textContent).toContain('6.4')
    expect(a.querySelector('[data-testid="asr-fallback"]')).toBeNull()
    expect(a.querySelector('[data-testid="asr-test-tag"]')).toBeNull()
    expect(a.querySelector('a')!.getAttribute('href')).toBe('/frontdesk/assistant/runs/a')
    expect(b.querySelector('[data-testid="asr-fallback"]')!.textContent).toContain('AI גיבוי')
    expect(b.querySelector('[data-testid="asr-test-tag"]')!.textContent).toContain('בדיקה')
    expect(c.textContent).toContain('הטקסט מוסתר')
    expect(d.textContent).toContain('(בלי טקסט)')
  })

  it('reads the list again when a filter chip or the test switch is pressed', async () => {
    await create()
    list.calls.reset()
    byId<HTMLInputElement>('asr-filter-fallback')!.click()
    await settle()
    expect(list).toHaveBeenCalledWith({ filter: 'fallback', test: false })
    byId<HTMLInputElement>('asr-scope-test')!.click()
    await settle()
    expect(list).toHaveBeenCalledWith({ filter: 'fallback', test: true })
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: { filter: 'fallback', scope: 'test' } })
    )
  })

  it('starts with the test switch on for ?scope=test', async () => {
    await create({ query: { scope: 'test' } })
    expect(byId<HTMLInputElement>('asr-scope-test')!.checked).toBeTrue()
    expect(list).toHaveBeenCalledOnceWith({ filter: 'all', test: true })
  })

  it('offers "load more" only when there are older runs', async () => {
    runs.set([row('a')])
    await create()
    expect(byId('asr-more')).toBeNull()
    more.set(true)
    await settle()
    byId('asr-more')!.click()
    expect(data['loadMore']).toHaveBeenCalled()
  })

  it('without an id asks to pick a run', async () => {
    await create()
    expect(byId('asr-detail')!.textContent).toContain('בחרו הודעה מהרשימה')
    expect(open).not.toHaveBeenCalled()
  })

  it('with an id opens the run and shows it', async () => {
    runs.set([row('r1')])
    openRun.set(fullRun('r1'))
    await create({ id: 'r1' })
    expect(open).toHaveBeenCalledOnceWith('r1')
    expect(byId('asr-detail')!.querySelector('app-run-detail')).not.toBeNull()
    expect(rowEls()[0].classList).toContain('is-selected')
    expect(el().querySelector('[data-testid="assistant-page"]')!.classList).toContain('asr--open')
  })

  it('shows a loader while the run opens, and a missing or failed run in words', async () => {
    runLoading.set(true)
    await create({ id: 'r1' })
    expect(byId('asr-detail')!.querySelector('app-loader')).not.toBeNull()
    runLoading.set(false)
    runFailed.set('not_found')
    await settle()
    expect(byId('asr-detail')!.textContent).toContain('הרשומה לא נמצאה')
    runFailed.set('failed')
    await settle()
    expect(byId('asr-detail')!.textContent).toContain('לא הצלחנו לטעון את הפרטים')
    open.calls.reset()
    byId('asr-detail')!.querySelector('button')!.click()
    expect(open).toHaveBeenCalledOnceWith('r1')
  })
})
