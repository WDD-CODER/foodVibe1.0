import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { LucideAngularModule, Search, Plus, X, ChevronUp, ChevronDown } from 'lucide-angular'
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
    const preps = signal([{ name: 'רוטב עגבניות', category: 'מטבח' }])
    prepRegistrySpy.allPreparations_ = preps
    prepRegistrySpy.registerPreparation.and.callFake(async (name: string, category: string) => {
      preps.update((list) => [...list, { name, category }])
    })

    await TestBed.configureTestingModule({
      imports: [
        PreparationSearchComponent,
        TranslatePipe,
        LucideAngularModule.pick({ Search, Plus, X, ChevronUp, ChevronDown })
      ],
      providers: [provideHttpClient(), { provide: PreparationRegistryService, useValue: prepRegistrySpy }]
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

  it('Enter selects the first match and asks for a new row', async () => {
    const selected = jasmine.createSpy('selected')
    const newRow = jasmine.createSpy('newRow')
    component.preparationSelected.subscribe(selected)
    component.addNewRowRequested.subscribe(newRow)
    component['searchQuery_'].set('רוטב')
    await component['onEnter'](new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(selected).toHaveBeenCalledWith({ name: 'רוטב עגבניות', category: 'מטבח' })
    expect(newRow).toHaveBeenCalled()
  })

  it('Enter adds an unknown name and asks for a new row', async () => {
    const added = jasmine.createSpy('added')
    const newRow = jasmine.createSpy('newRow')
    component.preparationAdded.subscribe(added)
    component.addNewRowRequested.subscribe(newRow)
    component['searchQuery_'].set('בצל מטוגן')
    await component['onEnter'](new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(added).toHaveBeenCalledWith({ name: 'בצל מטוגן', category: 'מטבח' })
    expect(newRow).toHaveBeenCalled()
  })

  it('Enter on an empty box does not open a new row', async () => {
    const newRow = jasmine.createSpy('newRow')
    component.addNewRowRequested.subscribe(newRow)
    await component['onEnter'](new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(newRow).not.toHaveBeenCalled()
  })

  describe('add option + keyboard (add-option rule)', () => {
    const key = (k: string): KeyboardEvent => new KeyboardEvent('keydown', { key: k, cancelable: true })

    function type(text: string): void {
      component['onQueryInput'](text)
      fixture.detectChanges()
    }

    it('shows matches plus one add "<typed>" option for a new name, last', () => {
      type('רוטב')
      const root = fixture.nativeElement as HTMLElement
      const items = root.querySelectorAll('li[role="option"]')
      expect(items.length).toBe(2)
      expect(items[1].classList).toContain('result-item--add')
      expect(items[1].textContent?.trim()).toBe('add "רוטב"')
    })

    it('an exact name shows no add option', () => {
      type('רוטב עגבניות')
      expect(component['showAddOption_']()).toBeFalse()
    })

    it('arrows stop at the ends; Enter on the add option adds the typed name', async () => {
      const added = jasmine.createSpy('added')
      component.preparationAdded.subscribe(added)
      type('רוטב')
      component['onSearchKeydown'](key('ArrowUp'))
      expect(component['highlightedIndex_']()).toBe(0)
      for (let i = 0; i < 4; i++) component['onSearchKeydown'](key('ArrowDown'))
      expect(component['highlightedIndex_']()).toBe(1)
      await component['onEnter'](key('Enter'))
      expect(added).toHaveBeenCalledWith({ name: 'רוטב', category: 'מטבח' })
    })

    it('Escape closes the open list before clearing the text; Tab is not blocked', () => {
      type('רוטב')
      const tab = key('Tab')
      component['onSearchKeydown'](tab)
      expect(tab.defaultPrevented).toBeFalse()
      expect(component['listOpen_']()).toBeFalse()
      type('רוטב')
      component['onSearchKeydown'](key('Escape'))
      expect(component['listOpen_']()).toBeFalse()
      expect(component['searchQuery_']()).toBe('רוטב')
    })
  })
})
