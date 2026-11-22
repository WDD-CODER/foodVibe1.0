import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { FloorPlanBody } from '@models/floor-plan.model'
import { JoinsListComponent } from './joins-list.component'

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
    { ...base, key: 'tab007', number: '7' }
  ],
  joins: [{ key: 'join01', tableKeys: ['tab008', 'tab007'], minSeats: 5, maxSeats: 8, online: true }]
}

describe('JoinsListComponent (plan 666)', () => {
  let fixture: ComponentFixture<JoinsListComponent>
  const el = (): HTMLElement => fixture.nativeElement
  const q = <T extends HTMLElement>(sel: string): T[] => Array.from(el().querySelectorAll<T>(sel))

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinsListComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } }]
    }).compileComponents()
    fixture = TestBed.createComponent(JoinsListComponent)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.detectChanges()
  })

  it('shows one row labelled "7 + 8"', () => {
    expect(q('[data-testid="join-row"]').length).toBe(1)
    expect(q('[data-testid="join-label"]')[0].textContent).toContain('7 + 8')
  })

  it('shows the empty line when there is no join', () => {
    fixture.componentRef.setInput('plan', { ...PLAN, joins: [] })
    fixture.detectChanges()
    expect(q('[data-testid="join-row"]').length).toBe(0)
    expect(q('[data-testid="joins-empty"]')[0].textContent).toContain('fp_joins_empty')
  })

  it('emits the key on a label press and on remove, and a patch on the online switch', () => {
    const pressed: string[] = []
    const removed: string[] = []
    const changes: unknown[] = []
    fixture.componentInstance.joinPressed.subscribe((k) => pressed.push(k))
    fixture.componentInstance.joinRemoved.subscribe((k) => removed.push(k))
    fixture.componentInstance.joinChange.subscribe((c) => changes.push(c))
    q<HTMLButtonElement>('[data-testid="join-label"]')[0].click()
    q<HTMLButtonElement>('[data-testid="join-remove"]')[0].click()
    const sw = q<HTMLInputElement>('[data-testid="join-online"]')[0]
    sw.checked = false
    sw.dispatchEvent(new Event('change'))
    expect(pressed).toEqual(['join01'])
    expect(removed).toEqual(['join01'])
    expect(changes).toEqual([{ key: 'join01', patch: { online: false } }])
  })

  it('marks the pressed join', () => {
    fixture.componentRef.setInput('markedKey', 'join01')
    fixture.detectChanges()
    expect(q('[data-testid="join-label"]')[0].getAttribute('aria-pressed')).toBe('true')
  })
})
