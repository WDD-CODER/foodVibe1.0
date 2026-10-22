import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { LucideAngularModule, ChevronDown, ChevronUp, X } from 'lucide-angular'
import { CustomMultiSelectComponent } from './custom-multi-select.component'
import { TranslationService } from '@services/translation.service'

describe('CustomMultiSelectComponent', () => {
  let component: CustomMultiSelectComponent
  let fixture: ComponentFixture<CustomMultiSelectComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomMultiSelectComponent, LucideAngularModule.pick({ ChevronDown, ChevronUp, X })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()

    fixture = TestBed.createComponent(CustomMultiSelectComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' }
    ])
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should show chips when value is set', () => {
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' }
    ])
    component.writeValue(['a', 'b'])
    fixture.detectChanges()
    const chips = fixture.nativeElement.querySelectorAll('button.c-chip--removable')
    expect(chips.length).toBe(2)
  })

  it('should emit valueChange when option is added', () => {
    let emitted: string[] | undefined
    component.valueChange.subscribe((v: string[]) => {
      emitted = v
    })
    component.writeValue([])
    fixture.detectChanges()
    ;(component as unknown as { addOption: (v: string) => void }).addOption('a')
    expect(emitted).toEqual(['a'])
  })

  describe('add option + keyboard (add-option rule)', () => {
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement
    let search: HTMLInputElement

    function press(key: string): KeyboardEvent {
      const e = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true })
      search.dispatchEvent(e)
      fixture.detectChanges()
      return e
    }

    function addOption(): Element | null {
      return root().querySelector('.custom-select-option--add-new')
    }

    beforeEach(async () => {
      fixture.componentRef.setInput('options', [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
        { value: '__add_label__', label: 'create_new_label' }
      ])
      fixture.componentRef.setInput('addNewValue', '__add_label__')
      fixture.componentRef.setInput('addNewLabelKey', 'add_new_label')
      fixture.componentRef.setInput('allowTypedAdd', true)
      fixture.componentRef.setInput('searchable', true)
      fixture.detectChanges()
      ;(root().querySelector('button.custom-multi-select-trigger') as HTMLButtonElement).click()
      fixture.detectChanges()
      await fixture.whenStable()
      search = root().querySelector('.custom-multi-select-search-input') as HTMLInputElement
    })

    it('renders exactly one add option, last, with the generic label', () => {
      const adds = root().querySelectorAll('.custom-select-option--add-new')
      expect(adds.length).toBe(1)
      const all = root().querySelectorAll('.custom-select-option')
      expect(all[all.length - 1]).toBe(adds[0])
      expect(adds[0].textContent?.trim()).toBe('add_new_label')
    })

    it('an exact existing name shows no add option (rule X)', () => {
      search.value = 'banana'
      search.dispatchEvent(new Event('input'))
      fixture.detectChanges()
      expect(addOption()).toBeNull()
    })

    it('typing a new name labels the add option with it and Enter emits it', () => {
      const chosen: string[] = []
      component.addNewChosen.subscribe((v: string) => chosen.push(v))
      search.value = 'Cherry'
      search.dispatchEvent(new Event('input'))
      fixture.detectChanges()
      expect(root().querySelectorAll('.custom-select-option--add-new').length).toBe(1)
      expect(addOption()?.textContent?.trim()).toBe('add "Cherry"')
      press('Enter')
      expect(chosen).toEqual(['Cherry'])
    })

    it('arrows stop at the ends (no wrap); Space in the search box does not select', () => {
      press('ArrowUp')
      expect(root().querySelector('.highlighted')?.textContent?.trim()).toBe('Apple')
      for (let i = 0; i < 6; i++) press('ArrowDown')
      expect(root().querySelector('.highlighted')?.classList).toContain('custom-select-option--add-new')
      const space = press(' ')
      expect(space.defaultPrevented).toBeFalse()
    })
  })

  describe('slow mouse click on an option (plan 459 A1)', () => {
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement

    beforeEach(() => {
      fixture.componentRef.setInput('options', [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
        { value: '__add_label__', label: 'create_new_label' }
      ])
      fixture.componentRef.setInput('addNewValue', '__add_label__')
      fixture.detectChanges()
      ;(root().querySelector('button.custom-multi-select-trigger') as HTMLButtonElement).click()
      fixture.detectChanges()
    })

    it('mousedown on an option and on the add option is default-prevented', () => {
      for (const el of Array.from(root().querySelectorAll('.custom-select-option'))) {
        const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        el.dispatchEvent(e)
        expect(e.defaultPrevented).toBeTrue()
      }
    })

    it('a long press keeps the list open and the later click adds the value', fakeAsync(() => {
      const values: string[][] = []
      component.valueChange.subscribe((v: string[]) => values.push(v))
      const opt = root().querySelectorAll('.custom-select-option')[1] as HTMLElement
      opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      tick(500)
      fixture.detectChanges()
      expect(root().querySelector('app-scrollable-dropdown')).not.toBeNull()
      opt.click()
      expect(values).toEqual([['b']])
    }))
  })
})
