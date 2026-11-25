import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { AiDraftEditorComponent } from './ai-draft-editor.component'

describe('AiDraftEditorComponent', () => {
  let fixture: ComponentFixture<AiDraftEditorComponent>

  const draft: AiRecipeDraft = {
    nameHebrew: 'test',
    recipe_type: 'preparation',
    yield_amount: 100,
    yield_unit: 'gram',
    ingredients: [
      { name: 'first', amount: 1, unit: 'gram' },
      { name: 'second', amount: 2, unit: 'gram' }
    ],
    steps: ['step one', 'step two']
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDraftEditorComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()
    fixture = TestBed.createComponent(AiDraftEditorComponent)
    fixture.componentRef.setInput('draft', draft)
    fixture.detectChanges()
  })

  const names = (selector: string): string[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLInputElement | HTMLTextAreaElement>
    ).map((el) => el.value)

  function pressDownOnFirstGrip(rowSelector: string): void {
    const grip = fixture.nativeElement.querySelector(`${rowSelector} .editor-drag-handle`) as HTMLElement
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    fixture.detectChanges()
  }

  it('the down arrow on the first ingredient grip moves it to the second place (plan 742)', () => {
    pressDownOnFirstGrip('.editor-ing-row')
    expect(names('.editor-ing-row .editor-ing-name-cell input')).toEqual(['second', 'first'])
  })

  it('the down arrow on the first step grip moves it to the second place (plan 742)', () => {
    pressDownOnFirstGrip('.editor-step-row')
    expect(names('.editor-step-row textarea')).toEqual(['step two', 'step one'])
  })
})
