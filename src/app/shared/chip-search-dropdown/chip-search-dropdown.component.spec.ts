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
