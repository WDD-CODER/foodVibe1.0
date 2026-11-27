import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, Settings } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { AssistantEngineSettingsService } from '../../assistant-engine-settings.service'
import type { EditableSetup } from '../../assistant-engine-settings.service'
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
  asr_set_why_fixed: 'חלק מהמנוע',
  asr_engine_val_seconds: '{n} שנ׳',
  asr_set_range: 'טווח:',
  asr_set_out_of_range: 'המספר צריך להיות בתוך הטווח',
  asr_unit_ms: 'שנ׳',
  asr_unit_replies: 'תשובות',
  fd_save: 'שמירה',
  cancel: 'ביטול',
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
  let save: jasmine.Spy

  beforeEach(() => {
    setupSig = signal<AssistantSetup | null>(setup)
    loaded = signal(true)
    failed = signal(false)
    tables = signal(true)
    loadSetup = jasmine.createSpy('loadSetup').and.resolveTo()
    save = jasmine.createSpy('save').and.resolveTo(true)
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
        { provide: AssistantEngineSettingsService, useValue: { save } },
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

  describe('plan 760: the engine numbers', () => {
    const engineRows = SETTING_ROWS.filter((r) => r.value === 'engine')
    const adminSetup: EditableSetup = {
      ...setup,
      editable: true,
      limits: {
        quietMs: { min: 1000, max: 10000, unit: 'ms' },
        maxWaitMs: { min: 3000, max: 30000, unit: 'ms' },
        dailyTurns: { min: 1, max: 2000, unit: 'daily' },
        turnLimit: { min: 1, max: 50, unit: 'replies' },
        followUpMax: { min: 0, max: 10, unit: 'replies' },
        historyWindow: { min: 2, max: 40, unit: 'messages' },
        glueMax: { min: 1, max: 10, unit: 'messages' },
        factsMaxChars: { min: 1000, max: 20000, unit: 'chars' },
        firstModelMs: { min: 2000, max: 14000, unit: 'ms' },
        turnBudgetMs: { min: 10000, max: 60000, unit: 'ms' }
      }
    }
    const input = (id: string) => byId('set-input-' + id) as HTMLInputElement
    const press = (id: string) => {
      byId(id)!.click()
      fixture.detectChanges()
    }
    const type = (id: string, text: string) => {
      input(id).value = text
      input(id).dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    async function createAdmin() {
      setupSig.set(adminSetup)
      await create(true)
    }

    it('gives the platform admin "change" on each engine row, and no lock', async () => {
      await createAdmin()
      expect(engineRows.length).toBe(10)
      for (const row of engineRows) {
        expect(byId('set-change-' + row.id))
          .withContext(row.id)
          .not.toBeNull()
        expect(byId('set-row-' + row.id)!.textContent)
          .withContext(row.id)
          .not.toContain('קבוע במערכת')
      }
      expect(byId('set-change-guard_words')).toBeNull()
      expect(byId('set-value-quiet_wait')!.textContent!.trim()).toBe('2.0 שנ׳')
    })

    it('opens a number box in the row with its unit and range', async () => {
      await createAdmin()
      expect(byId('set-edit-quiet_wait')).toBeNull()
      press('set-change-quiet_wait')
      expect(input('quiet_wait').value).toBe('2.0')
      expect(input('quiet_wait').min).toBe('1.0')
      expect(input('quiet_wait').max).toBe('10.0')
      const text = byId('set-edit-quiet_wait')!.textContent!.replace(/\s+/g, ' ')
      expect(text).toContain('טווח: 1.0–10.0 שנ׳')
      expect(byId('set-save-quiet_wait')!.textContent!.trim()).toBe('שמירה')
      expect(byId('set-cancel-quiet_wait')!.textContent!.trim()).toBe('ביטול')
      press('set-change-turn_limit')
      expect(byId('set-edit-quiet_wait')).toBeNull()
      expect(input('turn_limit').value).toBe('8')
      expect(byId('set-edit-turn_limit')!.textContent).toContain('תשובות')
    })

    it('saves the typed seconds as milliseconds and closes the box', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      type('quiet_wait', '4')
      press('set-save-quiet_wait')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(save).toHaveBeenCalledOnceWith('quietMs', 4000)
      expect(byId('set-edit-quiet_wait')).toBeNull()
    })

    it('keeps the box open and the old value when the save fails', async () => {
      save.and.resolveTo(false)
      await createAdmin()
      press('set-change-turn_limit')
      type('turn_limit', '9')
      press('set-save-turn_limit')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(save).toHaveBeenCalledOnceWith('turnLimit', 9)
      expect(byId('set-edit-turn_limit')).not.toBeNull()
      expect(byId('set-value-turn_limit')!.textContent).toContain('asr_engine_val_turnLimit')
    })

    it('does not save a number outside the range, or an empty box', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      for (const text of ['0.5', '11', '']) {
        type('quiet_wait', text)
        expect(byId('set-save-quiet_wait')!.getAttribute('aria-disabled')).withContext(text).toBe('true')
        press('set-save-quiet_wait')
      }
      expect(save).not.toHaveBeenCalled()
    })

    it('closes the box on cancel without saving', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      press('set-cancel-quiet_wait')
      expect(byId('set-edit-quiet_wait')).toBeNull()
      expect(save).not.toHaveBeenCalled()
    })

    it('keeps the rows locked for an owner, with the same tooltip', async () => {
      await create()
      for (const row of engineRows) {
        expect(byId('set-change-' + row.id))
          .withContext(row.id)
          .toBeNull()
        expect(byId('set-row-' + row.id)!.textContent)
          .withContext(row.id)
          .toContain('קבוע במערכת')
      }
      const chip = byId('set-row-quiet_wait')!.querySelector<HTMLElement>('.asr-set__who [tabindex="0"]')!
      chip.dispatchEvent(new Event('focusin'))
      fixture.detectChanges()
      const tipId = chip.getAttribute('aria-describedby')!
      expect(document.getElementById(tipId)!.textContent).toContain('חלק מהמנוע')
      chip.dispatchEvent(new Event('focusout'))
    })
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
