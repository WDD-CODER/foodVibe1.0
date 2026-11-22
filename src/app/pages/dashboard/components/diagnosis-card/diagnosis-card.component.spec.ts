import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { By } from '@angular/platform-browser'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, Stethoscope, Plus } from 'lucide-angular'
import type { Diagnosis } from '@schemas/entities'
import type { ModuleKey } from '@schemas/modules-pure'
import { DiagnosisService } from 'src/app/pages/diagnosis/services/diagnosis.service'
import { LoggingService } from '@services/logging.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { DiagnosisCardComponent } from './diagnosis-card.component'

const diag = (id: string, name: string, status: 'open' | 'done', createdAt: number): Diagnosis =>
  ({ _id: id, name, status, createdAt }) as unknown as Diagnosis

const ROWS = [
  diag('d4', 'ד', 'done', Date.UTC(2026, 3, 4)),
  diag('d3', 'ג', 'open', Date.UTC(2026, 3, 3)),
  diag('d2', 'ב', 'open', Date.UTC(2026, 3, 2)),
  diag('d1', 'א', 'open', Date.UTC(2026, 3, 1))
]

describe('DiagnosisCardComponent', () => {
  let fixture: ComponentFixture<DiagnosisCardComponent>
  let list: jasmine.Spy
  const modulesOn = signal<ModuleKey[]>([])
  const acting = signal<'consultant' | 'platform' | null>(null)
  const homeModules = signal<string[]>([])

  const render = async (): Promise<void> => {
    fixture = TestBed.createComponent(DiagnosisCardComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const q = (testId: string) => fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))

  beforeEach(() => {
    modulesOn.set(['consultant_diag'])
    acting.set(null)
    homeModules.set([])
    list = jasmine.createSpy('list').and.resolveTo(ROWS)
    TestBed.configureTestingModule({
      imports: [DiagnosisCardComponent, LucideAngularModule.pick({ Stethoscope, Plus })],
      providers: [
        provideRouter([]),
        { provide: DiagnosisService, useValue: { list } },
        { provide: ModuleService, useValue: { has: (key: ModuleKey) => modulesOn().includes(key) } },
        { provide: UserService, useValue: { acting_: acting, homeModules_: homeModules } },
        { provide: LoggingService, useValue: { warn: jasmine.createSpy('warn') } },
        {
          provide: TranslationService,
          useValue: { translate: (key: string) => (key === 'diag_card_open_count' ? '{count} פתוחים' : key) }
        }
      ]
    })
  })

  it('is hidden and does not load without consultant_diag', async () => {
    modulesOn.set([])
    await render()
    expect(q('diagnosis-card')).toBeNull()
    expect(list).not.toHaveBeenCalled()
  })

  it('is shown and loads with consultant_diag', async () => {
    await render()
    expect(q('diagnosis-card')).not.toBeNull()
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('while acting, the home modules decide', async () => {
    modulesOn.set([])
    acting.set('consultant')
    homeModules.set(['consultant_diag'])
    await render()
    expect(q('diagnosis-card')).not.toBeNull()
  })

  it('lists the three newest with name and date, each opening /diagnosis/<id>', async () => {
    await render()
    const rows = fixture.debugElement.queryAll(By.css('[data-testid="diagnosis-card-row"]'))
    expect(rows.length).toBe(3)
    expect(rows[0].nativeElement.textContent).toContain('ד')
    expect(rows[0].nativeElement.textContent).toContain('04/04/2026')
    expect(rows[0].query(By.css('a')).nativeElement.getAttribute('href')).toBe('/diagnosis/d4')
    expect(rows[2].query(By.css('a')).nativeElement.getAttribute('href')).toBe('/diagnosis/d2')
    expect(q('diagnosis-card-count').nativeElement.textContent).toContain('3 פתוחים')
  })

  it('«יצירת אבחון» opens /diagnosis', async () => {
    await render()
    const create = q('diagnosis-card-create')
    expect(create.nativeElement.getAttribute('href')).toBe('/diagnosis')
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)
    create.nativeElement.click()
    expect(navigate).toHaveBeenCalled()
    expect(String(navigate.calls.mostRecent().args[0])).toBe('/diagnosis')
  })

  it('with no diagnosis shows the empty text and the create button', async () => {
    list.and.resolveTo([])
    await render()
    expect(fixture.nativeElement.textContent).toContain('diag_card_empty')
    expect(q('diagnosis-card-create')).not.toBeNull()
    expect(q('diagnosis-card-count')).toBeNull()
  })

  it('a failed load hides the card', async () => {
    list.and.rejectWith({ status: 500 })
    await render()
    expect(q('diagnosis-card')).toBeNull()
  })
})
