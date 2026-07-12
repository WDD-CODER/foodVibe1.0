import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RecipeBuilderPage } from './recipe-builder.page'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

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

    fixture = TestBed.createComponent(RecipeBuilderPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
