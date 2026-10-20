import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule, X, ChevronUp, ChevronDown } from 'lucide-angular'
import { ChipSearchDropdownComponent } from './chip-search-dropdown.component'
import { TranslationService } from '@services/translation.service'

@Component({
  standalone: true,
  imports: [ChipSearchDropdownComponent],
  template: `
    <app-chip-search-dropdown class="first" [options]="opts" />
    <app-chip-search-dropdown class="second" [options]="opts" />
  `
})
class TwoDropdownsHostComponent {
  opts = ['apple', 'banana', 'cherry']
}

describe('ChipSearchDropdownComponent', () => {
  let fixture: ComponentFixture<TwoDropdownsHostComponent>
  let root: HTMLElement

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoDropdownsHostComponent, LucideAngularModule.pick({ X, ChevronUp, ChevronDown })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()

    fixture = TestBed.createComponent(TwoDropdownsHostComponent)
    fixture.detectChanges()
    root = fixture.nativeElement as HTMLElement
  })

  function input(sel: string): HTMLInputElement {
    return root.querySelector(`${sel} .csd-input`) as HTMLInputElement
  }

  it('gives each instance its own input id and name, with autocomplete off', () => {
    const a = input('.first')
    const b = input('.second')
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
    expect(a.name).not.toBe(b.name)
    expect(a.getAttribute('autocomplete')).toBe('off')
    expect(a.getAttribute('spellcheck')).toBe('false')
  })

  it('never repeats option ids across two open dropdowns', () => {
    input('.first').dispatchEvent(new Event('focus'))
    input('.second').dispatchEvent(new Event('focus'))
    fixture.detectChanges()
    const ids = Array.from(root.querySelectorAll('.dropdown-item[role="option"]')).map((el) => el.id)
    expect(ids.length).toBe(6)
    expect(new Set(ids).size).toBe(6)
  })

  it('shows the clear button only with a query; clearing keeps the full list open', () => {
    const el = input('.first')
    const clearBtn = (): HTMLButtonElement | null => root.querySelector('.first app-input-clear button.is-visible')
    expect(clearBtn()).toBeNull()

    el.dispatchEvent(new Event('focus'))
    el.value = 'ban'
    el.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(root.querySelectorAll('.first .dropdown-item[role="option"]').length).toBe(1)
    const btn = clearBtn()
    expect(btn).not.toBeNull()

    btn?.click()
    fixture.detectChanges()
    expect(el.value).toBe('')
    expect(clearBtn()).toBeNull()
    expect(root.querySelectorAll('.first .dropdown-item[role="option"]').length).toBe(3)
    expect(document.activeElement).toBe(el)
  })
})

describe('ChipSearchDropdownComponent — add option + keyboard (add-option rule)', () => {
  let fixture: ComponentFixture<ChipSearchDropdownComponent>
  let root: HTMLElement
  let el: HTMLInputElement
  let added: string[]
  let addedNew: string[]

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipSearchDropdownComponent, LucideAngularModule.pick({ X, ChevronUp, ChevronDown })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()

    fixture = TestBed.createComponent(ChipSearchDropdownComponent)
    fixture.componentRef.setInput('options', ['apple', 'banana'])
    fixture.componentRef.setInput('addNewLabelKey', 'add_new_category')
    fixture.componentRef.setInput('allowTypedAdd', true)
    fixture.componentRef.setInput('showAddNewAlways', true)
    added = []
    addedNew = []
    fixture.componentInstance.add.subscribe((v: string) => added.push(v))
    fixture.componentInstance.addNew.subscribe((v: string) => addedNew.push(v))
    fixture.detectChanges()
    root = fixture.nativeElement as HTMLElement
    el = root.querySelector('.csd-input') as HTMLInputElement
    el.dispatchEvent(new Event('focus'))
    fixture.detectChanges()
  })

  function press(key: string): KeyboardEvent {
    const e = new KeyboardEvent('keydown', { key, cancelable: true })
    el.dispatchEvent(e)
    fixture.detectChanges()
    return e
  }

  function highlighted(): Element | null {
    return root.querySelector('.dropdown-item--highlight')
  }

  it('opens with the first option highlighted and stops at the ends (no wrap)', () => {
    expect(highlighted()?.textContent?.trim()).toBe('apple')
    press('ArrowUp')
    expect(highlighted()?.textContent?.trim()).toBe('apple')
    for (let i = 0; i < 5; i++) press('ArrowDown')
    expect(highlighted()?.classList).toContain('dropdown-item--add-new')
    expect(el.getAttribute('aria-activedescendant')).toMatch(/-option-2$/)
  })

  it('never moves focus into the list (no roving tabindex)', () => {
    expect(root.querySelectorAll('.dropdown-item[tabindex]').length).toBe(0)
  })

  it('Enter picks the highlighted option', () => {
    press('ArrowDown')
    press('Enter')
    expect(added).toEqual(['banana'])
  })

  it('typed new name → add "<typed>", Enter on it emits the name', () => {
    el.value = 'cherry'
    el.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(root.querySelectorAll('.dropdown-item--add-new').length).toBe(1)
    expect(root.querySelector('.dropdown-item--add-new')?.textContent?.trim()).toBe('add "cherry"')
    press('Enter')
    expect(addedNew).toEqual(['cherry'])
  })

  it('nothing typed → generic label; Enter on it emits ""', () => {
    expect(root.querySelector('.dropdown-item--add-new')?.textContent?.trim()).toBe('add_new_category')
    press('ArrowDown')
    press('ArrowDown')
    press('Enter')
    expect(addedNew).toEqual([''])
  })

  it('Escape closes; Tab closes without preventing the browser move', () => {
    press('Escape')
    expect(root.querySelector('app-scrollable-dropdown')).toBeNull()
    press('ArrowDown')
    expect(root.querySelector('app-scrollable-dropdown')).not.toBeNull()
    const tab = press('Tab')
    expect(tab.defaultPrevented).toBeFalse()
    expect(root.querySelector('app-scrollable-dropdown')).toBeNull()
  })

  describe('add option (plan 416)', () => {
    let addFx: ComponentFixture<ChipSearchDropdownComponent>

    beforeEach(() => {
      addFx = TestBed.createComponent(ChipSearchDropdownComponent)
      addFx.componentRef.setInput('options', ['ביצים', 'בוטנים', 'בשר'])
      addFx.componentRef.setInput('addNewLabelKey', 'add_new_category')
      addFx.componentRef.setInput('allowTypedAdd', true)
      addFx.componentRef.setInput('showAddNewAlways', true)
      addFx.detectChanges()
    })

    function typeIn(text: string): void {
      const el = (addFx.nativeElement as HTMLElement).querySelector('.csd-input') as HTMLInputElement
      el.dispatchEvent(new Event('focus'))
      el.value = text
      el.dispatchEvent(new Event('input'))
      addFx.detectChanges()
    }

    function addRows(): number {
      return (addFx.nativeElement as HTMLElement).querySelectorAll('.dropdown-item--add-new').length
    }

    it('shows no add option for an exact existing name, even with showAddNewAlways (rule X)', () => {
      typeIn('בשר')
      expect(addRows()).toBe(0)
      typeIn('בשר ')
      expect(addRows()).toBe(0)
    })

    it('shows the add option for a partial or different name', () => {
      typeIn('ב')
      expect(addRows()).toBe(1)
      typeIn('בשר בקר')
      expect(addRows()).toBe(1)
    })

    it('Enter on the add option emits addNew with the typed name and closes the list', () => {
      const added: string[] = []
      addFx.componentInstance.addNew.subscribe((v: string) => added.push(v))
      typeIn('ב')
      const el = (addFx.nativeElement as HTMLElement).querySelector('.csd-input') as HTMLInputElement
      for (let i = 0; i < 5; i++) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
      addFx.detectChanges()
      expect(added).toEqual(['ב'])
      expect((addFx.nativeElement as HTMLElement).querySelector('app-scrollable-dropdown')).toBeNull()
    })
  })
})
