import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { FileText, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { DiagnosisPage } from './diagnosis.page'
import { DiagnosisService } from './services/diagnosis.service'

describe('DiagnosisPage', () => {
  let fixture: ComponentFixture<DiagnosisPage>
  let create: jasmine.Spy
  let onSetErrorMsg: jasmine.Spy
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)

  async function setup(list: jasmine.Spy): Promise<void> {
    create = jasmine.createSpy('create').and.resolveTo({ _id: 'new1' })
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    TestBed.configureTestingModule({
      imports: [DiagnosisPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FileText })],
      providers: [
        provideRouter([]),
        { provide: DiagnosisService, useValue: { list, create } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: { onSetErrorMsg } }
      ]
    })
    fixture = TestBed.createComponent(DiagnosisPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('lists one row per diagnosis with its name, date and status', async () => {
    await setup(
      jasmine.createSpy('list').and.resolveTo([
        { _id: 'a', name: 'Alpha', createdAt: Date.UTC(2026, 10, 5, 12), status: 'open' },
        { _id: 'b', name: 'Beta', createdAt: Date.UTC(2026, 10, 6, 12), status: 'done' }
      ])
    )
    const rows = Array.from(el().querySelectorAll('[data-testid="diagnosis-row"]'))
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('Alpha')
    expect(rows[0].textContent).toContain('05/11/2026')
    expect(rows[0].textContent).toContain('diag_status_open')
    expect(rows[1].textContent).toContain('diag_status_done')
    expect(rows[0].getAttribute('href')).toBe('/diagnosis/a')
  })

  it('shows the empty state when there are none', async () => {
    await setup(jasmine.createSpy('list').and.resolveTo([]))
    expect(byId('diagnosis-empty')).not.toBeNull()
  })

  it('a failed load shows server_error', async () => {
    await setup(jasmine.createSpy('list').and.rejectWith(new Error('x')))
    expect(onSetErrorMsg).toHaveBeenCalledWith('server_error')
  })

  it('create is disabled while the name is empty, then creates and opens the workspace', async () => {
    await setup(jasmine.createSpy('list').and.resolveTo([]))
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    expect(byId<HTMLButtonElement>('diagnosis-create')!.getAttribute('aria-disabled')).toBe('true')
    const input = byId<HTMLInputElement>('diagnosis-name')!
    input.value = '  Client A '
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(byId<HTMLButtonElement>('diagnosis-create')!.getAttribute('aria-disabled')).toBeNull()
    byId<HTMLButtonElement>('diagnosis-create')!.click()
    await fixture.whenStable()
    expect(create).toHaveBeenCalledWith({ name: 'Client A', periodDays: 60 })
    expect(navigate).toHaveBeenCalledWith(['/diagnosis', 'new1'])
  })
})
