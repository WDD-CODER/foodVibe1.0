import { Component } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { LucideAngularModule, ChevronDown, ChevronUp, X } from 'lucide-angular'
import { CustomSelectComponent } from './custom-select.component'
import { TranslationService } from '@services/translation.service'

describe('CustomSelectComponent', () => {
  let component: CustomSelectComponent
  let fixture: ComponentFixture<CustomSelectComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSelectComponent, LucideAngularModule.pick({ ChevronDown, ChevronUp, X })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()

    fixture = TestBed.createComponent(CustomSelectComponent)
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

  it('should show selected label when value is set', () => {
    component.writeValue('b')
    fixture.detectChanges()
    const label = fixture.nativeElement.querySelector('.custom-select-label')
    expect(label?.textContent?.trim()).toBe('Option B')
  })

  it('should emit valueChange when option is selected', () => {
    let emitted: string | undefined
    component.valueChange.subscribe((v: string) => {
      emitted = v
    })
    component.writeValue('')
    fixture.detectChanges()
    ;(component as unknown as { select: (v: string) => void }).select('a')
    expect(emitted).toBe('a')
  })

  describe('add option + keyboard (add-option rule)', () => {
    let input: HTMLInputElement
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement

    function type(text: string): void {
      input.value = text
      input.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }

    function press(key: string): KeyboardEvent {
      const e = new KeyboardEvent('keydown', { key, cancelable: true })
      input.dispatchEvent(e)
      fixture.detectChanges()
      return e
    }

    function addRowText(): string {
      return root().querySelector('.custom-select-option--add-new .add-option-row__text')?.textContent?.trim() ?? ''
    }

    function highlighted(): Element | null {
      return root().querySelector('.custom-select-option.highlighted')
    }

    beforeEach(() => {
      fixture.componentRef.setInput('options', [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
        { value: '__add_new__', label: 'x' }
      ])
      fixture.componentRef.setInput('typeToFilter', true)
      fixture.componentRef.setInput('addNewValue', '__add_new__')
      fixture.componentRef.setInput('addNewLabelKey', 'add_new_category')
      fixture.componentRef.setInput('allowTypedAdd', true)
      fixture.detectChanges()
      input = root().querySelector('input.custom-select-input') as HTMLInputElement
      input.dispatchEvent(new Event('focus'))
      fixture.detectChanges()
    })

    it('shows one add option with the generic key when nothing is typed', () => {
      expect(root().querySelectorAll('.custom-select-option--add-new').length).toBe(1)
      expect(addRowText()).toBe('add_new_category')
    })

    it('shows add "<typed>" for a new name and no add option for an exact match (rule X)', () => {
      type('Cherry')
      expect(addRowText()).toBe('add "Cherry"')
      type(' apple ')
      expect(root().querySelectorAll('.custom-select-option--add-new').length).toBe(0)
      type('apple pie')
      expect(addRowText()).toBe('add "apple pie"')
    })

    it('filters by contains, prefix matches first (rule F)', () => {
      type('an')
      const labels = Array.from(
        root().querySelectorAll('.custom-select-option:not(.custom-select-option--add-new)')
      ).map((el) => el.textContent?.trim())
      expect(labels).toEqual(['Banana'])
    })

    it('highlights the first option, stops at the ends, and points aria-activedescendant at it', () => {
      expect(highlighted()?.textContent?.trim()).toBe('Apple')
      press('ArrowUp')
      expect(highlighted()?.textContent?.trim()).toBe('Apple')
      for (let i = 0; i < 5; i++) press('ArrowDown')
      expect(highlighted()?.classList).toContain('custom-select-option--add-new')
      expect(input.getAttribute('aria-activedescendant')).toMatch(/-opt-2$/)
    })

    it('Enter on the add option emits the typed name, then the sentinel', () => {
      const chosen: string[] = []
      const values: string[] = []
      component.addNewChosen.subscribe((v: string) => chosen.push(v))
      component.valueChange.subscribe((v: string) => values.push(v))
      type('Cherry')
      press('Enter')
      expect(chosen).toEqual(['Cherry'])
      expect(values).toEqual(['__add_new__'])
    })

    it('without allowTypedAdd the add option stays generic and emits ""', () => {
      fixture.componentRef.setInput('allowTypedAdd', false)
      const chosen: string[] = []
      component.addNewChosen.subscribe((v: string) => chosen.push(v))
      type('Cherry')
      expect(addRowText()).toBe('add_new_category')
      press('Enter')
      expect(chosen).toEqual([''])
    })

    it('Escape closes the list; Tab closes without blocking the browser focus move', () => {
      press('Escape')
      expect(root().querySelector('app-scrollable-dropdown')).toBeNull()
      press('ArrowDown')
      expect(root().querySelector('app-scrollable-dropdown')).not.toBeNull()
      const tab = press('Tab')
      expect(tab.defaultPrevented).toBeFalse()
      expect(root().querySelector('app-scrollable-dropdown')).toBeNull()
    })
  })

  describe('button mode inside a page that moves focus on keys (rule K)', () => {
    @Component({
      standalone: true,
      imports: [CustomSelectComponent],
      template: '<app-custom-select [options]="opts" (keydown)="pageKeys.push($any($event).key)" />'
    })
    class PageHostComponent {
      opts = [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' }
      ]
      pageKeys: string[] = []
    }

    it('arrows and Enter drive the list, never the page handler; Tab still reaches the page', () => {
      const host = TestBed.createComponent(PageHostComponent)
      host.detectChanges()
      const trigger = (host.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement
      const press = (key: string): void => {
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
        host.detectChanges()
      }
      press('ArrowDown')
      press('ArrowDown')
      press('Enter')
      expect(host.componentInstance.pageKeys).toEqual([])
      press('Tab')
      expect(host.componentInstance.pageKeys).toEqual(['Tab'])
    })
  })

  describe('slow mouse click on an option (plan 459 A1)', () => {
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement
    let trigger: HTMLElement

    beforeEach(() => {
      fixture.componentRef.setInput('options', [
        { value: 'a', label: 'Apple' },
        { value: 'b', label: 'Banana' },
        { value: '__add_new__', label: 'x' }
      ])
      fixture.componentRef.setInput('addNewValue', '__add_new__')
      fixture.componentRef.setInput('allowTypedAdd', true)
      fixture.detectChanges()
      trigger = root().querySelector('button.custom-select-trigger') as HTMLElement
      trigger.click()
      fixture.detectChanges()
    })

    function option(i: number): HTMLElement {
      return root().querySelectorAll('.custom-select-option')[i] as HTMLElement
    }

    it('mousedown on an option is default-prevented so focus stays on the trigger', () => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      option(0).dispatchEvent(e)
      expect(e.defaultPrevented).toBeTrue()
    })

    it('a long press keeps the list open and the later click selects', fakeAsync(() => {
      const values: string[] = []
      component.valueChange.subscribe((v: string) => values.push(v))
      option(1).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      tick(500)
      fixture.detectChanges()
      expect(root().querySelector('app-scrollable-dropdown')).not.toBeNull()
      option(1).click()
      fixture.detectChanges()
      expect(values).toEqual(['b'])
    }))

    it('the add option is also protected and still emits the typed name, then the sentinel', fakeAsync(() => {
      const chosen: string[] = []
      const values: string[] = []
      component.addNewChosen.subscribe((v: string) => chosen.push(v))
      component.valueChange.subscribe((v: string) => values.push(v))
      const add = root().querySelector('.custom-select-option--add-new') as HTMLElement
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      add.dispatchEvent(e)
      expect(e.defaultPrevented).toBeTrue()
      tick(500)
      add.click()
      expect(values).toEqual(['__add_new__'])
      expect(chosen.length).toBe(1)
    }))
  })

  describe('Space in a type-to-filter box (plan 459 A3)', () => {
    it('types a space: not default-prevented and nothing is picked', () => {
      fixture.componentRef.setInput('typeToFilter', true)
      fixture.detectChanges()
      const input = (fixture.nativeElement as HTMLElement).querySelector(
        'input.custom-select-input'
      ) as HTMLInputElement
      input.dispatchEvent(new Event('focus'))
      fixture.detectChanges()
      const values: string[] = []
      component.valueChange.subscribe((v: string) => values.push(v))
      const e = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true })
      input.dispatchEvent(e)
      fixture.detectChanges()
      expect(e.defaultPrevented).toBeFalse()
      expect(values).toEqual([])
    })
  })
})
