import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { GeminiService, type GeminiChainModel } from '@services/gemini.service'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import { AiModelManagerComponent } from './ai-model-manager.component'

const model = (name: string): GeminiChainModel => ({
  name,
  exhausted: false,
  resetAt: null,
  dailyBudget: null,
  used: 0,
  remaining: null,
  enabled: true,
  vision: true
})

describe('AiModelManagerComponent', () => {
  let fixture: ComponentFixture<AiModelManagerComponent>

  beforeEach(async () => {
    const gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['getModelChain'])
    gemini.getModelChain.and.returnValue(of([model('model-a'), model('model-b')]))
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [AiModelManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: GeminiService, useValue: gemini },
        { provide: UserService, useValue: { isAdmin_: signal(true) } },
        { provide: TranslationService, useValue: translation }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(AiModelManagerComponent)
    fixture.detectChanges()
  })

  const names = (): string[] =>
    fixture.debugElement
      .queryAll(By.css('.model-list:not(.model-list-removed) .model-name'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim() ?? '')

  it('the down arrow on the first model grip moves it to the second place (plan 742)', () => {
    expect(names()).toEqual(['model-a', 'model-b'])
    const grip = fixture.nativeElement.querySelector('.model-row .model-grip') as HTMLElement
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    fixture.detectChanges()
    expect(names()).toEqual(['model-b', 'model-a'])
  })
})
