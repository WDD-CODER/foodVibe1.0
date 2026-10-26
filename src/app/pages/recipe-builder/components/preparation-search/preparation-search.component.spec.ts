import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { LucideAngularModule, Search, Plus, X, ChevronUp, ChevronDown } from 'lucide-angular'
import { PreparationSearchComponent } from './preparation-search.component'
import { PreparationRegistryService } from '@services/preparation-registry.service'
import { signal } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AddItemConfig, AddItemModalService } from '@services/add-item-modal.service'

describe('PreparationSearchComponent', () => {
  let component: PreparationSearchComponent
  let fixture: ComponentFixture<PreparationSearchComponent>
  /** The add window: saves the prefilled name as-is unless a test sets `windowResult`. */
  let addItemModal: jasmine.SpyObj<AddItemModalService>
  let windowResult: string | null | undefined

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement
  const field = (): HTMLTextAreaElement => root().querySelector('textarea')!
  const options = (): HTMLElement[] => Array.from(root().querySelectorAll('li[role="option"]'))

  function type(text: string): void {
    field().value = text
    field().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  function press(key: string): KeyboardEvent {
    const e = new KeyboardEvent('keydown', { key, cancelable: true })
    field().dispatchEvent(e)
    fixture.detectChanges()
    return e
  }

  /** Lets the add window's promise chain finish. */
  const settle = async (): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()
  }

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

    windowResult = undefined
    addItemModal = jasmine.createSpyObj('AddItemModalService', ['open'])
    addItemModal.open.and.callFake(async (cfg: AddItemConfig) =>
      windowResult === undefined ? (cfg.initialValue ?? null) : windowResult
    )

    await TestBed.configureTestingModule({
      imports: [
        PreparationSearchComponent,
        TranslatePipe,
        LucideAngularModule.pick({ Search, Plus, X, ChevronUp, ChevronDown })
      ],
      providers: [
        provideHttpClient(),
        { provide: PreparationRegistryService, useValue: prepRegistrySpy },
        { provide: AddItemModalService, useValue: addItemModal }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(PreparationSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should show the add option when the query has 2+ chars and no matches', () => {
    type('xyz')
    expect(options().length).toBe(1)
    expect(options()[0].textContent?.trim()).toBe('add "xyz"')
  })

  it('shows nothing for a single character', () => {
    type('ר')
    expect(options().length).toBe(0)
  })

  it('Enter selects the first match and asks for a new row', () => {
    const selected = jasmine.createSpy('selected')
    const newRow = jasmine.createSpy('newRow')
    component.preparationSelected.subscribe(selected)
    component.addNewRowRequested.subscribe(newRow)
    type('רוטב')
    press('Enter')
    expect(selected).toHaveBeenCalledWith({ name: 'רוטב עגבניות', category: 'מטבח' })
    expect(newRow).toHaveBeenCalled()
  })

  it('a click selects without asking for a new row', () => {
    const selected = jasmine.createSpy('selected')
    const newRow = jasmine.createSpy('newRow')
    component.preparationSelected.subscribe(selected)
    component.addNewRowRequested.subscribe(newRow)
    type('רוטב')
    options()[0].click()
    expect(selected).toHaveBeenCalled()
    expect(newRow).not.toHaveBeenCalled()
  })

  it('Enter on an unknown name opens the add window prefilled, then adds and asks for a new row (rule W)', async () => {
    const added = jasmine.createSpy('added')
    const newRow = jasmine.createSpy('newRow')
    component.preparationAdded.subscribe(added)
    component.addNewRowRequested.subscribe(newRow)
    type('בצל מטוגן')
    press('Enter')
    await settle()
    expect(addItemModal.open).toHaveBeenCalledWith(jasmine.objectContaining({ initialValue: 'בצל מטוגן' }))
    expect(added).toHaveBeenCalledWith({ name: 'בצל מטוגן', category: 'מטבח' })
    expect(newRow).toHaveBeenCalled()
  })

  it('cancelling the add window adds nothing', async () => {
    const added = jasmine.createSpy('added')
    component.preparationAdded.subscribe(added)
    windowResult = null
    type('בצל מטוגן')
    press('Enter')
    await settle()
    expect(added).not.toHaveBeenCalled()
  })

  it('Enter on an empty box does not open a new row and never types a line break', () => {
    const newRow = jasmine.createSpy('newRow')
    component.addNewRowRequested.subscribe(newRow)
    expect(press('Enter').defaultPrevented).toBeTrue()
    expect(newRow).not.toHaveBeenCalled()
  })

  describe('add option + keyboard (add-option rule)', () => {
    it('shows matches plus one add "<typed>" option for a new name, last', () => {
      type('רוטב')
      expect(options().length).toBe(2)
      expect(options()[1].classList).toContain('search-combobox__option--add')
      expect(options()[1].textContent?.trim()).toBe('add "רוטב"')
    })

    it('an exact name shows no add option', () => {
      type('רוטב עגבניות')
      expect(options().length).toBe(1)
    })

    it('arrows stop at the ends; Enter on the add option adds the typed name', async () => {
      const added = jasmine.createSpy('added')
      component.preparationAdded.subscribe(added)
      type('רוטב')
      press('ArrowUp')
      expect(options()[0].classList).toContain('is-highlighted')
      for (let i = 0; i < 4; i++) press('ArrowDown')
      expect(options()[1].classList).toContain('is-highlighted')
      press('Enter')
      await settle()
      expect(added).toHaveBeenCalledWith({ name: 'רוטב', category: 'מטבח' })
    })

    it('Escape closes the open list before clearing the text; Tab is not blocked', () => {
      type('רוטב')
      const tab = press('Tab')
      expect(tab.defaultPrevented).toBeFalse()
      expect(options().length).toBe(0)
      type('רוטב')
      press('Escape')
      expect(options().length).toBe(0)
      expect(component.searchQuery_()).toBe('רוטב')
      press('Escape')
      expect(component.searchQuery_()).toBe('')
    })
  })
})
