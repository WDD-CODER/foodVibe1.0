import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop'
import { By } from '@angular/platform-browser'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { AiModelManagerComponent } from './ai-model-manager.component'
import { GeminiService, type GeminiChainModel } from '@services/gemini.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'

const model = (name: string, extra: Partial<GeminiChainModel> = {}): GeminiChainModel =>
  ({
    name,
    enabled: true,
    vision: true,
    used: 0,
    dailyBudget: null,
    remaining: null,
    exhausted: false,
    ...extra
  }) as GeminiChainModel

describe('AiModelManagerComponent (plan 714)', () => {
  let fixture: ComponentFixture<AiModelManagerComponent>
  let component: AiModelManagerComponent
  let isAdmin: ReturnType<typeof signal<boolean>>
  let chain: GeminiChainModel[]

  const host = () => fixture.nativeElement as HTMLElement
  const names = () => Array.from(host().querySelectorAll('.mm-model-row .model-name')).map((e) => e.textContent?.trim())

  async function setup(): Promise<void> {
    isAdmin = signal(true)
    chain = [model('model-a'), model('model-b'), model('model-c')]
    const gemini = jasmine.createSpyObj<GeminiService>('GeminiService', [
      'getModelChain',
      'saveModelChain',
      'resetModelChain'
    ])
    gemini.getModelChain.and.callFake(() => of(chain))

    await TestBed.configureTestingModule({
      imports: [AiModelManagerComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: GeminiService, useValue: gemini },
        { provide: UserService, useValue: { isAdmin_: isAdmin } },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(AiModelManagerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(setup)

  it('draws every model as a shared list row on a shared panel', () => {
    expect(host().querySelector('section.c-glass-panel .c-card-head')).not.toBeNull()
    expect(host().querySelectorAll('ol.c-list > li.c-list-row').length).toBe(3)
    expect(names()).toEqual(['model-a', 'model-b', 'model-c'])
  })

  it('shows the shared loader while the chain loads, and no rows', () => {
    component['isLoading_'].set(true)
    fixture.detectChanges()
    expect(host().querySelector('app-loader')).not.toBeNull()
    expect(host().querySelectorAll('.c-list-row').length).toBe(0)
  })

  it('shows a compact empty state when the user is not an admin', () => {
    isAdmin.set(false)
    fixture.detectChanges()
    expect(host().querySelector('app-empty-state .c-empty-state--compact')).not.toBeNull()
    expect(host().querySelectorAll('.c-list-row').length).toBe(0)
  })

  it('dragging still reorders: the drop handler is called and the rows follow the new order', () => {
    const onDrop = spyOn(
      component as unknown as { onDrop: (e: CdkDragDrop<GeminiChainModel[]>) => void },
      'onDrop'
    ).and.callThrough()
    const list = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList)
    const event = { previousIndex: 0, currentIndex: 2, item: { data: 'model-a' } } as CdkDragDrop<GeminiChainModel[]>

    list.dropped.emit(event)
    fixture.detectChanges()

    expect(onDrop).toHaveBeenCalledOnceWith(event)
    expect(names()).toEqual(['model-b', 'model-c', 'model-a'])
  })
})
