import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, Settings } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { AssistantSetup } from '@models/assistant-run.model'
import { AssistantEngineService } from '../../assistant-engine.service'
import type { AdminAssistantSetup } from '../../assistant-engine.util'
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
  retry: 'נסה שוב',
  asr_set_why_fixed: 'חלק מהמנוע של FoodVibe',
  asr_who_foodvibe: 'FoodVibe',
  asr_engine_secs: '{n} שנ׳',
  asr_unit_seconds: 'שניות',
  asr_unit_turns: 'תשובות',
  asr_set_range: 'טווח:',
  asr_set_save: 'שמירה',
  asr_set_save_failed: 'לא הצלחנו לשמור',
  asr_set_out_of_range: 'הערך מחוץ לטווח',
  cancel: 'ביטול'
}

const ENGINE_ROWS = SETTING_ROWS.filter((row) => row.engineField)

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
  let errorMsg: jasmine.Spy

  const adminSetup: AdminAssistantSetup = {
    ...setup,
    editable: true,
    ranges: {
      quietMs: { min: 1000, max: 15000, unit: 'ms' },
      maxWaitMs: { min: 3000, max: 30000, unit: 'ms' },
      dailyTurns: { min: 1, max: 2000, unit: 'turns' },
      turnLimit: { min: 1, max: 50, unit: 'turns' },
      followUpMax: { min: 0, max: 10, unit: 'turns' },
      historyWindow: { min: 2, max: 40, unit: 'messages' },
      glueMax: { min: 1, max: 15, unit: 'messages' },
      factsMaxChars: { min: 1000, max: 20000, unit: 'chars' },
      firstModelMs: { min: 2000, max: 15000, unit: 'ms' },
      turnBudgetMs: { min: 10000, max: 60000, unit: 'ms' }
    }
  }

  beforeEach(() => {
    save = jasmine.createSpy('save').and.resolveTo('saved')
    errorMsg = jasmine.createSpy('onSetErrorMsg')
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
        { provide: AssistantEngineService, useValue: { save } },
        { provide: UserMsgService, useValue: { onSetErrorMsg: errorMsg } },
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

  it('gives a fixed setting a tag and no button; no code line shows, not even to the admin', async () => {
    await create()
    expect(byId('set-change-guard_words')).toBeNull()
    expect(byId('set-row-guard_words')!.textContent).toContain('קבוע במערכת')
    fixture.componentRef.setInput('isAdmin', true)
    fixture.detectChanges()
    expect(byId('set-code-guard_words')).toBeNull()
    expect(byId('set-row-guard_words')!.textContent).not.toContain('frontdesk-guard-words.js')
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

  describe('plan 760: the engine numbers', () => {
    const settle = async () => {
      await fixture.whenStable()
      fixture.detectChanges()
    }
    const press = (id: string) => {
      byId(id)!.click()
      fixture.detectChanges()
    }
    const box = (id: string) => byId(`set-input-${id}`) as HTMLInputElement
    const type = (id: string, text: string) => {
      box(id).value = text
      box(id).dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    const createAdmin = () => {
      setupSig.set(adminSetup)
      return create(true)
    }

    it('gives the platform admin a "change" button on each engine row, in place of the lock', async () => {
      await createAdmin()
      expect(ENGINE_ROWS.length).toBe(10)
      for (const row of ENGINE_ROWS) {
        expect(byId('set-change-' + row.id)!.textContent!.trim())
          .withContext(row.id)
          .toBe('לשנות')
        expect(byId('set-row-' + row.id)!.textContent)
          .withContext(row.id)
          .not.toContain('קבוע במערכת')
      }
      expect(byId('set-change-guard_words')).toBeNull()
      expect(byId('set-row-guard_words')!.textContent).toContain('קבוע במערכת')
      expect(el().querySelector('form')).toBeNull()
    })

    it('opens a number box in the row with its unit and range, a time in seconds', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      const editor = byId('set-editor-quiet_wait')!
      expect(byId('set-row-quiet_wait')!.contains(editor)).toBeTrue()
      expect(box('quiet_wait').value).toBe('2.0')
      expect(byId('set-unit')!.textContent!.trim()).toBe('שניות')
      expect(byId('set-range')!.textContent).toContain('1.0–15.0')
      expect(byId('set-save')!.textContent!.trim()).toBe('שמירה')
      expect(byId('set-change-quiet_wait')!.getAttribute('aria-expanded')).toBe('true')
      expect(navigate).not.toHaveBeenCalled()
      press('set-change-turn_limit')
      expect(byId('set-editor-quiet_wait')).toBeNull()
      expect(box('turn_limit').value).toBe('8')
    })

    it('saves the number and closes the box', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      type('quiet_wait', '4')
      press('set-save')
      await settle()
      expect(save).toHaveBeenCalledOnceWith('quietMs', 4000)
      expect(byId('set-editor-quiet_wait')).toBeNull()
      expect(errorMsg).not.toHaveBeenCalled()
    })

    it('does not send a value outside the range, and says why on the button', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      type('quiet_wait', '20')
      expect(byId('set-save')!.getAttribute('aria-disabled')).toBe('true')
      press('set-save')
      await settle()
      expect(save).not.toHaveBeenCalled()
      byId('set-save')!.dispatchEvent(new Event('mouseenter'))
      expect(document.querySelector('.c-tip')!.textContent).toContain('הערך מחוץ לטווח')
      byId('set-save')!.dispatchEvent(new Event('mouseleave'))
    })

    it('after a failed save shows an error, keeps the box and the old value', async () => {
      save.and.resolveTo('failed')
      await createAdmin()
      press('set-change-quiet_wait')
      type('quiet_wait', '4')
      press('set-save')
      await settle()
      expect(errorMsg).toHaveBeenCalledOnceWith('לא הצלחנו לשמור')
      expect(box('quiet_wait').value).toBe('4')
      expect(byId('set-value-quiet_wait')!.textContent!.trim()).toBe('2.0 שנ׳')
    })

    it('closes the box on cancel with nothing saved', async () => {
      await createAdmin()
      press('set-change-quiet_wait')
      type('quiet_wait', '4')
      press('set-cancel')
      expect(byId('set-editor-quiet_wait')).toBeNull()
      expect(save).not.toHaveBeenCalled()
    })

    it('keeps the rows locked for an owner, with the tooltip and no "change"', async () => {
      await create()
      for (const row of ENGINE_ROWS) {
        expect(byId('set-change-' + row.id))
          .withContext(row.id)
          .toBeNull()
        expect(byId('set-row-' + row.id)!.textContent)
          .withContext(row.id)
          .toContain('קבוע במערכת')
      }
      const lock = byId('set-row-quiet_wait')!.querySelector<HTMLElement>('.asr-set__who .c-chip')!
      expect(byId('set-row-quiet_wait')!.textContent).not.toContain('חלק מהמנוע')
      lock.dispatchEvent(new Event('mouseenter'))
      expect(document.querySelector('.c-tip')!.textContent).toContain('חלק מהמנוע של FoodVibe')
      lock.dispatchEvent(new Event('mouseleave'))
    })
  })
})
