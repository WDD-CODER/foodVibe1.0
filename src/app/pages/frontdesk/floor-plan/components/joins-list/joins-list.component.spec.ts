import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ChevronDown, LucideAngularModule, Trash2 } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { FloorPlanBody } from '@models/floor-plan.model'
import { JoinsListComponent } from './joins-list.component'

const DICT: Record<string, string> = {
  fp_join_summary: '{min}–{max} סועדים',
  fp_join_online_short: 'באתר'
}

const base = {
  areaKey: 'areaa1',
  shape: 'square' as const,
  minSeats: 2,
  maxSeats: 4,
  x: 0,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
}

const PLAN: FloorPlanBody = {
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [
    { ...base, key: 'tab008', number: '8' },
    { ...base, key: 'tab007', number: '7' },
    { ...base, key: 'tab005', number: '5' },
    { ...base, key: 'tab006', number: '6' }
  ],
  joins: [
    { key: 'join01', tableKeys: ['tab008', 'tab007'], minSeats: 5, maxSeats: 8, online: true },
    { key: 'join02', tableKeys: ['tab005', 'tab006'], minSeats: 6, maxSeats: 8, online: false }
  ]
}

describe('JoinsListComponent (plan 666, 700)', () => {
  let fixture: ComponentFixture<JoinsListComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const q = <T extends HTMLElement>(sel: string): T[] => Array.from(el().querySelectorAll<T>(sel))

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinsListComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ChevronDown, Trash2 })],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => DICT[k ?? ''] ?? k ?? '' } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(JoinsListComponent)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.detectChanges()
  })

  it('shows a closed row per join: the tables, the seats and online, no counters', () => {
    expect(q('[data-testid="join-row"]').length).toBe(2)
    const rows = q('[data-testid="join-label"]')
    expect(rows[0].textContent).toContain('7 + 8')
    expect(rows[0].textContent).toContain('5–8 סועדים · באתר')
    expect(rows[1].textContent).toContain('5 + 6')
    expect(rows[1].textContent).toContain('6–8 סועדים')
    expect(rows[1].textContent).not.toContain('באתר')
    expect(rows[0].getAttribute('aria-expanded')).toBe('false')
    expect(q('[data-testid="join-min"]').length).toBe(0)
    expect(q('[data-testid="join-online"]').length).toBe(0)
  })

  it('shows the empty line when there is no join', () => {
    fixture.componentRef.setInput('plan', { ...PLAN, joins: [] })
    fixture.detectChanges()
    expect(q('[data-testid="join-row"]').length).toBe(0)
    expect(q('[data-testid="joins-empty"]')[0].textContent).toContain('fp_joins_empty')
  })

  it('pressing a row expands it, emits joinPressed, and only one row is open at a time', () => {
    const pressed: string[] = []
    fixture.componentInstance.joinPressed.subscribe((k) => pressed.push(k))
    q<HTMLButtonElement>('[data-testid="join-label"]')[0].click()
    fixture.detectChanges()
    expect(pressed).toEqual(['join01'])
    expect(q('[data-testid="join-label"]')[0].getAttribute('aria-expanded')).toBe('true')
    expect(q('[data-testid="join-min"]').length).toBe(1)
    expect(q('[data-testid="join-max"]').length).toBe(1)
    expect(q('[data-testid="join-online"]').length).toBe(1)
    q<HTMLButtonElement>('[data-testid="join-label"]')[1].click()
    fixture.detectChanges()
    expect(q('[data-testid="join-label"]')[0].getAttribute('aria-expanded')).toBe('false')
    expect(q('[data-testid="join-label"]')[1].getAttribute('aria-expanded')).toBe('true')
    expect(q('[data-testid="join-min"]').length).toBe(1)
  })

  it('emits the key on remove and a patch on the online switch of the open row', () => {
    const removed: string[] = []
    const changes: unknown[] = []
    fixture.componentInstance.joinRemoved.subscribe((k) => removed.push(k))
    fixture.componentInstance.joinChange.subscribe((c) => changes.push(c))
    q<HTMLButtonElement>('[data-testid="join-remove"]')[0].click()
    q<HTMLButtonElement>('[data-testid="join-label"]')[0].click()
    fixture.detectChanges()
    const sw = q<HTMLInputElement>('[data-testid="join-online"]')[0]
    sw.checked = false
    sw.dispatchEvent(new Event('change'))
    expect(removed).toEqual(['join01'])
    expect(changes).toEqual([{ key: 'join01', patch: { online: false } }])
  })

  it('marks the pressed join', () => {
    fixture.componentRef.setInput('markedKey', 'join01')
    fixture.detectChanges()
    expect(q('[data-testid="join-label"]')[0].classList).toContain('active')
  })
})
