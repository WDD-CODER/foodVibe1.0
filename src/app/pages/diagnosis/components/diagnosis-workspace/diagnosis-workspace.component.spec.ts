import { Component, input, output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { FileText, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Diagnosis } from '@schemas/entities'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { DiagnosisService } from '../../services/diagnosis.service'
import { DiagInvoiceQueueComponent } from '../diag-invoice-queue/diag-invoice-queue.component'
import { DiagMenuComponent } from '../diag-menu/diag-menu.component'
import { DiagReportComponent } from '../diag-report/diag-report.component'
import { DiagnosisWorkspaceComponent } from './diagnosis-workspace.component'

@Component({ selector: 'app-diag-invoice-queue', standalone: true, template: '<i data-testid="stub-invoices"></i>' })
class QueueStub {
  readonly diagnosisId = input('')
  readonly invoiceIds = input<string[]>([])
  readonly locked = input(false)
  readonly invoiceIdsChange = output<string[]>()
}
@Component({ selector: 'app-diag-menu', standalone: true, template: '<i data-testid="stub-menu"></i>' })
class MenuStub {
  readonly diagnosis = input<Diagnosis | null>(null)
  readonly locked = input(false)
  readonly saved = output<Diagnosis>()
}
@Component({ selector: 'app-diag-report', standalone: true, template: '<i data-testid="stub-report"></i>' })
class ReportStub {
  readonly diagnosis = input<Diagnosis | null>(null)
  readonly volatility = input<unknown[]>([])
}

describe('DiagnosisWorkspaceComponent', () => {
  let fixture: ComponentFixture<DiagnosisWorkspaceComponent>
  let loadData: jasmine.Spy
  let setStatus: jasmine.Spy
  let navigate: jasmine.Spy
  let onSetErrorMsg: jasmine.Spy
  let query$: BehaviorSubject<ReturnType<typeof convertToParamMap>>
  const stored = (status: 'open' | 'done'): Diagnosis =>
    ({ _id: 'g1', name: 'Client', status, menu: [], invoiceIds: [] }) as unknown as Diagnosis
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)

  async function setup(load: () => Promise<unknown>, tab?: string): Promise<void> {
    loadData = jasmine.createSpy('loadData').and.callFake(load)
    setStatus = jasmine.createSpy('setStatus').and.resolveTo(stored('done'))
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    query$ = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}))
    TestBed.configureTestingModule({
      imports: [DiagnosisWorkspaceComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FileText })],
      providers: [
        { provide: DiagnosisService, useValue: { loadData, setStatus } },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: 'g1' })), queryParamMap: query$ }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: { onSetErrorMsg } }
      ]
    })
    TestBed.overrideComponent(DiagnosisWorkspaceComponent, {
      remove: { imports: [DiagInvoiceQueueComponent, DiagMenuComponent, DiagReportComponent] },
      add: { imports: [QueueStub, MenuStub, ReportStub] }
    })
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(DiagnosisWorkspaceComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('shows the name and the invoices tab by default; ?tab= picks another', async () => {
    await setup(async () => ({ diagnosis: stored('open'), volatility: [] }))
    expect(byId('diagnosis-title')!.textContent).toContain('Client')
    expect(byId('diagnosis-title')!.closest('app-page-header h1')).not.toBeNull()
    expect(byId('stub-invoices')).not.toBeNull()
    expect(byId('stub-menu')).toBeNull()
    query$.next(convertToParamMap({ tab: 'report' }))
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(byId('stub-report')).not.toBeNull()
    expect(byId('stub-invoices')).toBeNull()
  })

  it('a failed load goes back to the list with server_error', async () => {
    await setup(() => Promise.reject(new Error('404')))
    expect(onSetErrorMsg).toHaveBeenCalledWith('server_error')
    expect(navigate).toHaveBeenCalledWith(['/diagnosis'])
  })

  it('mark done sets the status and the reopen label shows', async () => {
    await setup(async () => ({ diagnosis: stored('open'), volatility: [] }))
    byId<HTMLButtonElement>('diagnosis-toggle-done')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(setStatus).toHaveBeenCalledWith('g1', 'done')
    expect(byId('diagnosis-toggle-done')!.textContent).toContain('diag_reopen')
  })

  it('has no unsaved changes while no child reports any', async () => {
    await setup(async () => ({ diagnosis: stored('open'), volatility: [] }))
    expect(fixture.componentInstance.hasRealChanges()).toBeFalse()
  })
})
