import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, Settings } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import type { AssistantSetup } from '@models/assistant-run.model'
import { SETTING_ROWS } from '../../assistant-settings.data'
import { SettingsTableComponent } from './settings-table.component'

const DICT: Record<string, string> = {
  asr_set_why_foodvibe: 'רק צוות FoodVibe משנה',
  asr_set_why_tables_off: 'שירות השולחנות לא פעיל',
  asr_set_fixed: 'קבוע במערכת',
  asr_set_change: 'לשנות',
  asr_set_level: 'רמת העוזר',
  asr_set_load_failed: 'לא הצלחנו לטעון את ההגדרות',
  asr_set_no_profile: 'עדיין לא הוגדרה העמדה',
  asr_set_go_settings: 'להגדרות העמדה',
  asr_val_filled: '{n} מתוך {total} מולאו',
  asr_val_none: '—',
  retry: 'נסה שוב'
}

const setup: AssistantSetup = {
  engine: {
    quietMs: 2000,
    maxWaitMs: 6000,
    dailyTurns: 300,
    turnLimit: 8,
    followUpMax: 3,
    historyWindow: 12,
    glueMax: 5,
    factsMaxChars: 6000,
    firstModelMs: 6000,
    turnBudgetMs: 35000
  },
  business: {
    level: 1,
    status: 'active',
    tone: 'warm',
    handoffTextSet: false,
    activeHoursSet: false,
    hoursSet: true,
    profileFieldsFilled: 3,
    profileFieldsTotal: 4,
    kindsOn: 1,
    knowledgeApproved: 2,
    knowledgePublic: 1,
    tablesOn: false,
    confirmMode: 'auto'
  }
}

describe('SettingsTableComponent (plan 756)', () => {
  let fixture: ComponentFixture<SettingsTableComponent>
  let setupSig: WritableSignal<AssistantSetup | null>
  let loaded: WritableSignal<boolean>
  let failed: WritableSignal<boolean>
  let tables: WritableSignal<boolean>
  let loadSetup: jasmine.Spy
  let navigate: jasmine.Spy

  beforeEach(() => {
    setupSig = signal<AssistantSetup | null>(setup)
    loaded = signal(true)
    failed = signal(false)
    tables = signal(true)
    loadSetup = jasmine.createSpy('loadSetup').and.resolveTo()
  })

  async function create(isAdmin = false) {
    await TestBed.configureTestingModule({
      imports: [SettingsTableComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Settings })],
      providers: [
        provideRouter([]),
        {
          provide: AssistantRunDataService,
          useValue: { setup_: setupSig, setupLoaded_: loaded, setupFailed_: failed, loadSetup }
        },
        { provide: ModuleService, useValue: { has: () => tables() } },
        { provide: TranslationService, useValue: { translate: (k: string) => DICT[k] ?? k } }
      ]
    }).compileComponents()
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(SettingsTableComponent)
    fixture.componentRef.setInput('isAdmin', isAdmin)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const reasonOf = (id: string) => el().querySelector(`#set-why-${id}`)?.textContent?.trim()

  it('reads the setup and shows the 26 rows with their values', async () => {
    await create()
    expect(loadSetup).toHaveBeenCalledOnceWith()
    const rows = Array.from(el().querySelectorAll('[data-testid^="set-row-"]'))
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual(SETTING_ROWS.map((r) => 'set-row-' + r.id))
    expect(byId('set-value-profile_facts')!.textContent!.trim()).toBe('3 מתוך 4 מולאו')
    expect(byId('set-value-monthly_cap')!.textContent!.trim()).toBe('—')
    expect(byId('set-change-level')!.getAttribute('aria-label')).toBe('לשנות: רמת העוזר')
  })

  it('blocks a FoodVibe setting for the owner and says why', async () => {
    await create()
    const button = byId('set-change-ai_models')!
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.getAttribute('aria-describedby')).toContain('set-why-ai_models')
    expect(reasonOf('ai_models')).toBe('רק צוות FoodVibe משנה')
    button.click()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('lets the platform admin open the same screen', async () => {
    await create(true)
    const button = byId('set-change-ai_models')!
    expect(button.getAttribute('aria-disabled')).toBeNull()
    button.click()
    expect(navigate).toHaveBeenCalledOnceWith(['/dashboard'], { queryParams: { tab: 'metadata' } })
  })

  it('opens the screen that owns a setting', async () => {
    await create()
    byId('set-change-level')!.click()
    expect(navigate).toHaveBeenCalledOnceWith(['/frontdesk/settings'], { queryParams: undefined })
  })

  it('blocks the table settings without the tables module', async () => {
    tables.set(false)
    await create()
    const button = byId('set-change-floor_plan')!
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(reasonOf('floor_plan')).toBe('שירות השולחנות לא פעיל')
    button.click()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('gives a fixed setting a tag and no button; the code shows to the admin only', async () => {
    await create()
    expect(byId('set-change-guard_words')).toBeNull()
    expect(byId('set-row-guard_words')!.textContent).toContain('קבוע במערכת')
    expect(byId('set-code-guard_words')).toBeNull()
    fixture.componentRef.setInput('isAdmin', true)
    fixture.detectChanges()
    expect(byId('set-code-guard_words')!.textContent).toContain('frontdesk-guard-words.js')
  })

  it('keeps every row on the same columns, with each cell on one line', async () => {
    await create(true)
    const shownCells = (parent: Element) =>
      Array.from(parent.children).filter((c) => getComputedStyle(c).display !== 'none')
    const edges = (cells: Element[]) => cells.map((c) => Math.round(c.getBoundingClientRect().left))
    const first = edges(shownCells(byId('set-row-hours')!))
    expect(first.length).toBeGreaterThanOrEqual(3)
    expect(new Set(first).size).toBe(first.length)
    expect(edges(shownCells(byId('set-row-ai_models')!))).toEqual(first)
    expect(edges(shownCells(byId('set-row-guard_words')!))).toEqual(
      first.slice(0, shownCells(byId('set-row-guard_words')!).length)
    )
    const head = el().querySelector('.asr-set__head')!
    if (getComputedStyle(head).display !== 'none') expect(edges(shownCells(head))).toEqual(first)
    for (const line of Array.from(el().querySelectorAll('.asr-set__line'))) {
      expect(getComputedStyle(line).whiteSpace).toBe('nowrap')
    }
  })

  it('draws a blocked button as off', async () => {
    await create()
    const blocked = getComputedStyle(byId('set-change-ai_models')!)
    expect(blocked.opacity).toBe('0.45')
    expect(blocked.cursor).toBe('not-allowed')
    expect(blocked.pointerEvents).not.toBe('none')
    expect(getComputedStyle(byId('set-change-level')!).opacity).toBe('1')
  })

  it('shows a loader until the setup is here', async () => {
    loaded.set(false)
    setupSig.set(null)
    await create()
    expect(el().querySelector('app-loader')).not.toBeNull()
    expect(byId('set-row-hours')).toBeNull()
  })

  it('shows a failed read with a retry', async () => {
    loaded.set(false)
    failed.set(true)
    setupSig.set(null)
    await create()
    expect(el().querySelector('app-loader')).toBeNull()
    expect(byId('set-failed')!.textContent).toContain('לא הצלחנו לטעון את ההגדרות')
    byId('set-failed')!.querySelector('button')!.click()
    expect(loadSetup).toHaveBeenCalledWith(true)
  })

  it('without a front desk profile offers the settings page', async () => {
    setupSig.set({ ...setup, business: null })
    await create()
    expect(byId('set-row-hours')).toBeNull()
    expect(byId('set-no-profile')!.textContent).toContain('עדיין לא הוגדרה העמדה')
    byId('set-no-profile')!.querySelector('button')!.click()
    expect(navigate).toHaveBeenCalledOnceWith(['/frontdesk/settings'])
  })
})
