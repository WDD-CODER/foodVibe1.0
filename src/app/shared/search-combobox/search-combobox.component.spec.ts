import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule, ChevronDown, ChevronUp, Search, X } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { SearchAddPick, SearchComboboxComponent, SearchPick } from './search-combobox.component'

interface Item {
  id: string
  name: string
  kind: string
}

const ITEMS: Item[] = [
  { id: '1', name: 'רוטב עגבניות', kind: 'a' },
  { id: '2', name: 'רוטב פסטו', kind: 'a' },
  { id: '3', name: 'סלט', kind: 'b' }
]

@Component({
  standalone: true,
  imports: [SearchComboboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-search-combobox
      [(query)]="query"
      [(open)]="open"
      [options]="items()"
      [labelOf]="label"
      [keyOf]="key"
      [addLabelKey]="addKey()"
      [addOnlyTyped]="addOnlyTyped()"
      [minChars]="minChars()"
      [maxResults]="maxResults()"
      [groupOf]="groupOf()"
      [emptyKey]="emptyKey()"
      [handleTab]="handleTab()"
      placeholder="search"
      (picked)="picks.push($event)"
      (addChosen)="adds.push($event)"
      (escaped)="escapes = escapes + 1"
      (tab)="tabs = tabs + 1"
      (unhandledKeydown)="unhandled.push($event.key)"
    >
      @if (richRows()) {
        <ng-template #optionTemplate let-item
          ><b class="rich">{{ item.name }}</b></ng-template
        >
      }
    </app-search-combobox>
  `
})
class HostComponent {
  readonly query = signal('')
  readonly open = signal(true)
  readonly items = signal<Item[]>(ITEMS)
  readonly addKey = signal<string | null>('add_new_thing')
  readonly addOnlyTyped = signal(false)
  readonly minChars = signal(0)
  readonly maxResults = signal<number | null>(null)
  readonly groupOf = signal<((item: Item) => string) | null>(null)
  readonly emptyKey = signal<string | null>(null)
  readonly handleTab = signal(false)
  readonly richRows = signal(false)
  readonly label = (item: Item): string => item.name
  readonly key = (item: Item): string => item.id
  picks: SearchPick<Item>[] = []
  adds: SearchAddPick[] = []
  unhandled: string[] = []
  escapes = 0
  tabs = 0
}

describe('SearchComboboxComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement
  const field = (): HTMLInputElement => root().querySelector('input')!
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll('li[role="option"]'))
  const rowTexts = (): string[] => rows().map((r) => r.textContent?.trim() ?? '')
  const highlighted = (): number => rows().findIndex((r) => r.classList.contains('is-highlighted'))

  function type(text: string): void {
    field().value = text
    field().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const e = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init })
    field().dispatchEvent(e)
    fixture.detectChanges()
    return e
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick({ ChevronDown, ChevronUp, Search, X })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('rule F — contains, prefix first', () => {
    it('shows every option with an empty search', () => {
      expect(rowTexts().slice(0, 3)).toEqual(['רוטב עגבניות', 'רוטב פסטו', 'סלט'])
    })

    it('filters by what is typed and puts prefix matches first', () => {
      host.items.set([...ITEMS, { id: '4', name: 'עם רוטב', kind: 'b' }])
      fixture.detectChanges()
      type('רוטב')
      expect(rowTexts().slice(0, 3)).toEqual(['רוטב עגבניות', 'רוטב פסטו', 'עם רוטב'])
    })

    it('caps the rows with maxResults', () => {
      host.maxResults.set(1)
      fixture.detectChanges()
      expect(rows().filter((r) => !r.classList.contains('search-combobox__option--add')).length).toBe(1)
    })

    it('stays hidden below minChars', () => {
      host.minChars.set(2)
      fixture.detectChanges()
      expect(rows().length).toBe(0)
      type('ר')
      expect(rows().length).toBe(0)
      type('רו')
      expect(rows().length).toBeGreaterThan(0)
    })
  })

  describe('rule X — an exact name hides the add row', () => {
    it('offers the generic add with an empty search, last', () => {
      expect(rows().at(-1)?.classList).toContain('search-combobox__option--add')
      expect(rows().at(-1)?.textContent?.trim()).toBe('add_new_thing')
    })

    it('offers add "<typed>" for a new name', () => {
      type('בצל')
      expect(rowTexts()).toEqual(['add "בצל"'])
    })

    it('shows no add row when the text names an option exactly (case and edge spaces ignored)', () => {
      type(' סלט ')
      expect(rowTexts()).toEqual(['סלט'])
    })

    it('a different letter is a new name again', () => {
      type('סלטים')
      expect(rowTexts()).toEqual(['add "סלטים"'])
    })

    it('addOnlyTyped has no generic add for an empty search', () => {
      host.addOnlyTyped.set(true)
      fixture.detectChanges()
      expect(rows().some((r) => r.classList.contains('search-combobox__option--add'))).toBeFalse()
      type('בצל')
      expect(rowTexts()).toEqual(['add "בצל"'])
    })

    it('addLabelKey null means no add option at all', () => {
      host.addKey.set(null)
      fixture.detectChanges()
      type('בצל')
      expect(rows().length).toBe(0)
    })
  })

  describe('rule K — keyboard', () => {
    it('highlights the first row on open and on every keystroke', () => {
      expect(highlighted()).toBe(0)
      press('ArrowDown')
      expect(highlighted()).toBe(1)
      type('רוטב')
      expect(highlighted()).toBe(0)
    })

    it('arrows stop at the ends and never wrap', () => {
      press('ArrowUp')
      expect(highlighted()).toBe(0)
      for (let i = 0; i < 8; i++) press('ArrowDown')
      expect(highlighted()).toBe(rows().length - 1)
      expect(rows().at(-1)?.classList).toContain('search-combobox__option--add')
    })

    it('scrolls the highlighted row into view when an arrow moves it', () => {
      const spy = spyOn(Element.prototype, 'scrollIntoView').and.callThrough()
      press('ArrowDown')
      fixture.detectChanges()
      expect(spy).toHaveBeenCalled()
      expect(spy.calls.mostRecent().object).toBe(rows()[highlighted()])
    })

    it('Enter picks the highlighted row and closes the list', () => {
      press('ArrowDown')
      const e = press('Enter')
      expect(host.picks.map((p) => [p.option.id, p.source])).toEqual([['2', 'keyboard']])
      expect(e.defaultPrevented).toBeTrue()
      expect(host.open()).toBeFalse()
      expect(rows().length).toBe(0)
    })

    it('a click picks with source pointer', () => {
      rows()[2].click()
      expect(host.picks.map((p) => [p.option.id, p.source])).toEqual([['3', 'pointer']])
    })

    it('Escape closes the list and reports it; focus and text stay', () => {
      type('רוטב')
      const e = press('Escape')
      expect(e.defaultPrevented).toBeTrue()
      expect(host.escapes).toBe(1)
      expect(host.open()).toBeFalse()
      expect(host.query()).toBe('רוטב')
    })

    it('Escape with the list closed goes to the page as an unhandled key', () => {
      press('Escape')
      host.escapes = 0
      press('Escape')
      expect(host.escapes).toBe(0)
      expect(host.unhandled).toContain('Escape')
    })

    it('Tab closes the list and is never blocked', () => {
      const e = press('Tab')
      expect(e.defaultPrevented).toBeFalse()
      expect(host.open()).toBeFalse()
    })

    it('with handleTab the page gets Tab and the default is blocked', () => {
      host.handleTab.set(true)
      fixture.detectChanges()
      const e = press('Tab')
      expect(e.defaultPrevented).toBeTrue()
      expect(host.tabs).toBe(1)
      expect(host.open()).toBeFalse()
    })

    it('an arrow reopens a closed list that has something to show', () => {
      type('רוטב')
      press('Escape')
      expect(rows().length).toBe(0)
      press('ArrowDown')
      expect(host.open()).toBeTrue()
      expect(highlighted()).toBe(0)
    })

    it('points aria-activedescendant at the highlighted row', () => {
      press('ArrowDown')
      expect(field().getAttribute('aria-activedescendant')).toBe(rows()[1].id)
      expect(field().getAttribute('aria-expanded')).toBe('true')
    })
  })

  describe('rule W — the add option never adds by itself', () => {
    it('Enter on the add row reports the typed name; nothing is picked', () => {
      type('בצל')
      press('Enter')
      expect(host.adds).toEqual([{ typed: 'בצל', source: 'keyboard' }])
      expect(host.picks).toEqual([])
    })

    it('the generic add reports an empty name', () => {
      rows().at(-1)?.click()
      expect(host.adds).toEqual([{ typed: '', source: 'pointer' }])
      expect(host.picks).toEqual([])
    })

    it('the typed text is left in the box for the page to use', () => {
      type('בצל')
      press('Enter')
      expect(host.query()).toBe('בצל')
    })
  })

  describe('layout of results', () => {
    it('groups rows under a header per group, in first-seen order, with keyboard order following the display', () => {
      host.groupOf.set((item) => item.kind)
      host.items.set([ITEMS[0], ITEMS[2], ITEMS[1]])
      fixture.detectChanges()
      expect(Array.from(root().querySelectorAll('.search-combobox__group')).map((h) => h.textContent?.trim())).toEqual([
        'a',
        'b'
      ])
      expect(rowTexts().slice(0, 3)).toEqual(['רוטב עגבניות', 'רוטב פסטו', 'סלט'])
      press('ArrowDown')
      press('Enter')
      expect(host.picks[0].option.id).toBe('2')
    })

    it('shows an option template for the rows', () => {
      host.richRows.set(true)
      fixture.detectChanges()
      expect(root().querySelectorAll('li[role="option"] b.rich').length).toBe(3)
    })

    it('shows the empty line when nothing matches and there is no add option', () => {
      host.addKey.set(null)
      host.emptyKey.set('no_results')
      fixture.detectChanges()
      type('zzz')
      expect(root().querySelector('.search-combobox__empty')?.textContent?.trim()).toBe('no_results')
    })
  })

  it('the clear button empties the box and keeps it focused', () => {
    type('רוטב')
    ;(root().querySelector('.input-clear-btn') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(host.query()).toBe('')
  })
})
