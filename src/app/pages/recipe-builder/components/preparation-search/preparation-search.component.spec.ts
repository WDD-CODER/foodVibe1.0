import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { LucideAngularModule, Search, Plus } from 'lucide-angular'
import { PreparationSearchComponent } from './preparation-search.component'
import { PreparationRegistryService } from '@services/preparation-registry.service'
import { signal } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

describe('PreparationSearchComponent', () => {
  let component: PreparationSearchComponent
  let fixture: ComponentFixture<PreparationSearchComponent>

  beforeEach(async () => {
    const prepRegistrySpy = jasmine.createSpyObj('PreparationRegistryService', [
      'registerCategory',
      'registerPreparation'
    ])
    prepRegistrySpy.preparationCategories_ = signal<string[]>(['מטבח'])
    prepRegistrySpy.allPreparations_ = signal([{ name: 'רוטב עגבניות', category: 'מטבח' }])

    await TestBed.configureTestingModule({
      imports: [
        PreparationSearchComponent,
        TranslatePipe,
        LucideAngularModule.pick({ Search, Plus })
      ],
      providers: [
        provideHttpClient(),
        { provide: PreparationRegistryService, useValue: prepRegistrySpy }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(PreparationSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should show add option when query has 2+ chars and no matches', () => {
    component['searchQuery_'].set('xyz')
    fixture.detectChanges()
    expect(component['showAddOption_']()).toBe(true)
  })
})
