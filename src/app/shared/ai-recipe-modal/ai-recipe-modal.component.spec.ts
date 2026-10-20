import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter, Router } from '@angular/router'
import { signal } from '@angular/core'
import { ComponentFixture } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { of, throwError } from 'rxjs'
import { GeminiService } from '@services/gemini.service'
import { GeminiShotsService } from '@services/gemini-shots.service'
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service'
import type { ParsedResult } from '@models/parsed-result.model'
import { AiRecipeModalComponent } from './ai-recipe-modal.component'
import { AiRecipeModalService, type AiModalInputMode } from './ai-recipe-modal.service'

type Internals = {
  inputMode_: () => string
  prompt_: { set: (v: string) => void }
  draft_: () => AiRecipeDraft | null
  errorKey_: () => string
  status_: () => string
  onParsePasted: () => Promise<void>
  onDraftApproved: (d: AiRecipeDraft) => void
}

describe('AiRecipeModalComponent paste tab (plan 439)', () => {
  const isOpen_ = signal(false)
  const initialInputMode_ = signal<AiModalInputMode>('text')
  let gemini: jasmine.SpyObj<GeminiService>
  let shots: jasmine.SpyObj<GeminiShotsService>
  let fixture: ComponentFixture<AiRecipeModalComponent>
  let component: AiRecipeModalComponent

  const parsed: ParsedResult = {
    type: 'recipe',
    confidence: 0.9,
    data: {
      nameHebrew: 'רוטב',
      serving_portions: 2,
      labels: [],
      ingredients: [{ nameHebrew: 'עגבניות', amount_net: 2, unit: 'kg' }],
      steps: [{ order: 1, instruction: 'מבשלים' }]
    }
  }

  beforeEach(() => {
    spyOn(window, 'fetch').and.rejectWith(new Error('offline'))
    isOpen_.set(false)
    initialInputMode_.set('text')
    gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['parseText', 'offerModelSwitch'])
    gemini.offerModelSwitch.and.returnValue(false)
    shots = jasmine.createSpyObj<GeminiShotsService>('GeminiShotsService', ['saveShot', 'computeWarnings'])
    shots.saveShot.and.returnValue(of({ saved: true, warnings: [] }))
    shots.computeWarnings.and.returnValue([])
    TestBed.configureTestingModule({
      imports: [AiRecipeModalComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: GeminiService, useValue: gemini },
        { provide: GeminiShotsService, useValue: shots },
        {
          provide: AiRecipeModalService,
          useValue: { isOpen: isOpen_, initialInputMode: initialInputMode_, mode: signal('create'), close: () => {} }
        }
      ]
    })
    fixture = TestBed.createComponent(AiRecipeModalComponent)
    component = fixture.componentInstance
  })

  const internals = () => component as unknown as Internals

  it('opens on the paste tab when asked to', () => {
    initialInputMode_.set('paste')
    isOpen_.set(true)
    fixture.detectChanges()
    expect(internals().inputMode_()).toBe('paste')
  })

  it('turns a parsed recipe into an editable draft', async () => {
    gemini.parseText.and.returnValue(of(parsed))
    internals().prompt_.set('רוטב\n2 ק"ג עגבניות\nמבשלים')
    await internals().onParsePasted()
    expect(gemini.parseText).toHaveBeenCalledWith('רוטב\n2 ק"ג עגבניות\nמבשלים')
    expect(internals().draft_()?.nameHebrew).toBe('רוטב')
    expect(internals().draft_()?.ingredients).toEqual([{ name: 'עגבניות', amount: 2, unit: 'kg' }])
  })

  it('shows "not recognized" and opens no draft when nothing was found', async () => {
    gemini.parseText.and.returnValue(
      of({
        type: 'recipe',
        confidence: 0,
        data: { nameHebrew: '', serving_portions: null, labels: [], ingredients: [], steps: [] }
      })
    )
    internals().prompt_.set('שלום מה נשמע')
    await internals().onParsePasted()
    expect(internals().draft_()).toBeNull()
    expect(internals().errorKey_()).toBe('paste_recipe_not_recognized')
    expect(internals().status_()).toBe('error')
  })

  it('uses the normal error message when the server call fails', async () => {
    gemini.parseText.and.returnValue(throwError(() => new Error('boom')))
    internals().prompt_.set('x')
    await internals().onParsePasted()
    expect(internals().draft_()).toBeNull()
    expect(internals().errorKey_()).toBe('ai_recipe_error')
  })

  it('does not save a pasted recipe as a few-shot example when approved', async () => {
    gemini.parseText.and.returnValue(of(parsed))
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    const draftService = TestBed.inject(AiRecipeDraftService)
    initialInputMode_.set('paste')
    isOpen_.set(true)
    fixture.detectChanges()
    internals().prompt_.set('רוטב')
    await internals().onParsePasted()
    internals().onDraftApproved(internals().draft_()!)
    expect(shots.saveShot).not.toHaveBeenCalled()
    expect(draftService.draft()?.nameHebrew).toBe('רוטב')
  })
})
