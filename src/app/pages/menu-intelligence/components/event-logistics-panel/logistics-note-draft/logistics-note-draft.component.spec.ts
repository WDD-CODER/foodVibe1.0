import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule, Mic, Square } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { LogisticsNoteDraftComponent } from './logistics-note-draft.component'
import { EventPipelineService } from '@services/event-pipeline.service'
import { GeminiService } from '@services/gemini.service'
import { LoggingService } from '@services/logging.service'
import { LogisticsItemRegistryService } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { LogisticsExtractResponse } from '@schemas/logistics/extract.schema'
import type { MenuEvent } from '@models/menu-event.model'

const storedAnswer = {
  itemKey: 'generator',
  phase: 'site_visit' as const,
  section: 'infrastructure',
  status: 'needed' as const,
  payer: 'chef' as const,
  label: 'מחולל',
  text: 'old',
  showToClient: true,
  at: 1,
  by: 'u',
  byName: 'U'
}

const baseDraft = (over: Partial<LogisticsExtractResponse> = {}): LogisticsExtractResponse => ({
  draftId: 'd1',
  answers: [
    { itemKey: 'cooling', phase: 'site_visit', section: 'infrastructure', status: 'client_provides' },
    {
      itemKey: 'chillers',
      phase: 'site_visit',
      section: 'infrastructure',
      status: 'needed',
      quantity: 2,
      text: ' שניים '
    },
    { itemKey: 'parking', phase: 'site_visit', section: 'access', status: 'not_needed' }
  ],
  conflicts: [{ itemKey: 'generator', current: { status: 'needed' }, suggested: { status: 'not_needed' } }],
  adhoc: [{ label: 'שולחן', section: 'other', status: 'needed' }],
  unanswered: ['חניה לאורחים'],
  ...over
})

describe('LogisticsNoteDraftComponent', () => {
  let fixture: ComponentFixture<LogisticsNoteDraftComponent>
  let el: HTMLElement
  let gemini: jasmine.SpyObj<GeminiService>
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let done: number

  const comp = () =>
    fixture.componentInstance as unknown as {
      extract(n: { text: string; source: 'text'; fileId: null }): Promise<void>
      save(): Promise<void>
    }

  const open = async (draft: LogisticsExtractResponse) => {
    gemini.extractLogistics.and.resolveTo(draft)
    await comp().extract({ text: 'note', source: 'text', fileId: null })
    fixture.detectChanges()
  }
  const toggles = (group: number) =>
    el.querySelectorAll<HTMLInputElement>(`.note-draft-group:nth-of-type(${group}) .note-draft-row`)
  const savedAnswers = () => pipeline.saveLogistics.calls.mostRecent().args[1].answers!

  beforeEach(async () => {
    done = 0
    gemini = jasmine.createSpyObj<GeminiService>('GeminiService', [
      'extractLogistics',
      'confirmLogisticsDraft',
      'transcribeVoice'
    ])
    gemini.confirmLogisticsDraft.and.resolveTo()
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['saveLogistics'])
    pipeline.saveLogistics.and.resolveTo({ ok: true, event: {} as MenuEvent })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetErrorMsg',
      'onSetSuccessMsg',
      'onSetWarningMsg'
    ])
    const event = { _id: 'e1', siteLogistics: { answers: [storedAnswer] } } as unknown as MenuEvent
    await TestBed.configureTestingModule({
      imports: [LogisticsNoteDraftComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Mic, Square })],
      providers: [
        { provide: GeminiService, useValue: gemini },
        { provide: EventPipelineService, useValue: pipeline },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn']) },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: MenuEventDataService, useValue: { allMenuEvents_: signal([event]).asReadonly() } },
        {
          provide: LogisticsItemRegistryService,
          useValue: {
            allItems_: signal([
              { key: 'chillers', answerType: 'quantity', hint: 'hint' },
              { key: 'cooling', answerType: 'status' }
            ]).asReadonly(),
            sections_: () => ['infrastructure', 'other'],
            sectionLabel: (k: string) => k
          }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(LogisticsNoteDraftComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    fixture.componentRef.setInput('phase', 'site_visit')
    fixture.componentInstance.done.subscribe(() => done++)
    fixture.detectChanges()
    el = fixture.nativeElement
  })

  it('opens with a conflict not selected and everything else kept', async () => {
    await open(baseDraft())
    const replace = el.querySelector<HTMLInputElement>('.note-draft-group:nth-of-type(2) input[type=checkbox]')!
    expect(replace.checked).toBeFalse()
    expect(el.querySelector('.note-draft-open')?.textContent).toContain('חניה לאורחים')
    expect(toggles(1).length).toBe(3)
  })

  it('saves only kept lines; client_provides becomes needed + client; a dropped line is not sent', async () => {
    await open(baseDraft())
    const parking = el.querySelectorAll<HTMLInputElement>('.note-draft-group:first-of-type .note-draft-row')[2]
    parking.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()
    fixture.detectChanges()
    await comp().save()
    const answers = savedAnswers()
    expect(answers.map((a) => a.itemKey)).toEqual(['cooling', 'chillers', jasmine.stringMatching(/^adhoc:/)])
    expect(answers[0]).toEqual(jasmine.objectContaining({ status: 'needed', payer: 'client' }))
    expect(answers[1]).toEqual(
      jasmine.objectContaining({ status: 'needed', payer: 'ours', quantity: 2, text: 'שניים' })
    )
    expect(answers[2]).toEqual(jasmine.objectContaining({ label: 'שולחן', phase: 'site_visit', section: 'other' }))
    expect(answers.some((a) => a.itemKey === 'generator')).toBeFalse()
  })

  it('confirms the draft with the kept lines in the draft words and closes', async () => {
    await open(baseDraft())
    await comp().save()
    const [draftId, saved] = gemini.confirmLogisticsDraft.calls.mostRecent().args
    expect(draftId).toBe('d1')
    expect(saved[0]).toEqual({ itemKey: 'cooling', status: 'client_provides' })
    expect(saved.length).toBe(4)
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('logistics_draft_saved')
    expect(done).toBe(1)
  })

  it('makes no confirm call when draftId is null', async () => {
    await open(baseDraft({ draftId: null }))
    await comp().save()
    expect(pipeline.saveLogistics).toHaveBeenCalled()
    expect(gemini.confirmLogisticsDraft).not.toHaveBeenCalled()
  })

  it('a replaced conflict keeps the stored label, text and showToClient and takes the suggestion', async () => {
    await open(baseDraft({ answers: [], adhoc: [] }))
    el.querySelector<HTMLInputElement>('.note-draft-group:nth-of-type(1) input[type=checkbox]')!.click()
    fixture.detectChanges()
    await comp().save()
    expect(savedAnswers()).toEqual([
      jasmine.objectContaining({
        itemKey: 'generator',
        label: 'מחולל',
        text: 'old',
        showToClient: true,
        payer: 'chef',
        status: 'not_needed'
      })
    ])
  })

  it('a failed save keeps the draft on screen and shows no second toast', async () => {
    pipeline.saveLogistics.and.resolveTo({ ok: false, code: null })
    await open(baseDraft())
    await comp().save()
    expect(gemini.confirmLogisticsDraft).not.toHaveBeenCalled()
    expect(userMsg.onSetSuccessMsg).not.toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).not.toHaveBeenCalled()
    expect(done).toBe(0)
    expect(el.querySelector('.note-draft-group')).not.toBeNull()
  })

  it('shows the empty state and still lists the open questions for an empty draft', async () => {
    await open(baseDraft({ answers: [], conflicts: [], adhoc: [] }))
    expect(el.querySelector('app-empty-state')).not.toBeNull()
    expect(el.querySelector('.note-draft-open')).not.toBeNull()
    expect(
      el.querySelector<HTMLButtonElement>('.note-draft .c-chip-group .c-btn-primary')!.getAttribute('aria-disabled')
    ).toBe('true')
  })

  it('shows the 429 toast and keeps the text when extraction fails', async () => {
    gemini.extractLogistics.and.rejectWith({ status: 429, error: {} })
    await comp().extract({ text: 'note', source: 'text', fileId: null })
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('ai_daily_limit_reached_all')
    expect(el.querySelector('.note-draft-group')).toBeNull()
  })
})
