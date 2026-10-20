import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ApplicationRef, WritableSignal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { FormGroup } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RecipeBuilderPage } from './recipe-builder.page'
import { AiRecipeDraftService } from '@services/ai-recipe-draft.service'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

/** Private members the leave-guard specs reach into. */
interface RecipeBuilderInternals {
  recipeForm_: FormGroup
  recipeRating_: WritableSignal<number>
  initialRecipeSnapshot_: string | null
}

describe('RecipeBuilderComponent', () => {
  let component: RecipeBuilderPage
  let fixture: ComponentFixture<RecipeBuilderPage>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeBuilderPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              paramMap: { get: () => null },
              queryParams: {}
            }
          }
        }
      ]
    }).compileComponents()
  })

  /** Creates the page and lets ngOnInit + afterNextRender capture the baseline snapshot. */
  async function createPage(): Promise<RecipeBuilderInternals> {
    fixture = TestBed.createComponent(RecipeBuilderPage)
    component = fixture.componentInstance
    fixture.detectChanges()
    await fixture.whenStable()
    TestBed.inject(ApplicationRef).tick()
    await fixture.whenStable()
    return component as unknown as RecipeBuilderInternals
  }

  it('should create', async () => {
    await createPage()
    expect(component).toBeTruthy()
  })

  describe('hasRealChanges() on a new recipe', () => {
    it('captures a baseline snapshot for a new recipe', async () => {
      const page = await createPage()
      expect(page.initialRecipeSnapshot_).not.toBeNull()
    })

    it('is false for a blank new recipe', async () => {
      await createPage()
      expect(component.hasRealChanges()).toBeFalse()
    })

    it('is true after a label-only change', async () => {
      const page = await createPage()
      page.recipeForm_.get('labels')?.setValue(['vegan'])
      expect(component.hasRealChanges()).toBeTrue()
    })

    it('is true after a course-only change', async () => {
      const page = await createPage()
      page.recipeForm_.get('course')?.setValue('main')
      expect(component.hasRealChanges()).toBeTrue()
    })

    it('is true after a rating-only change', async () => {
      const page = await createPage()
      page.recipeRating_.set(4)
      expect(component.hasRealChanges()).toBeTrue()
    })

    it('is true after typing a free-text ingredient name', async () => {
      await createPage()
      const row = component.ingredientsArray.at(0) as FormGroup
      row.get('nameHebrew')?.setValue('מלח ים')
      expect(component.hasRealChanges()).toBeTrue()
    })

    it('is true after an AI draft is applied, before saving', async () => {
      TestBed.inject(AiRecipeDraftService).set({
        nameHebrew: 'טיוטה',
        recipe_type: 'preparation',
        yield_amount: 1,
        yield_unit: 'gram',
        ingredients: [],
        steps: []
      })
      await createPage()
      expect(component.hasRealChanges()).toBeTrue()
    })
  })
})
