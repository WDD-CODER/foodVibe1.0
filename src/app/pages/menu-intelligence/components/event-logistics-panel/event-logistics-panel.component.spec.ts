import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { WritableSignal, computed, signal } from '@angular/core'
import { CircleCheckBig, ClipboardCheck, EyeOff, LucideAngularModule, Undo2 } from 'lucide-angular'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { EventLogisticsPanelComponent } from './event-logistics-panel.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { LogisticsItemRegistryService, type LogisticsItemTerm } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import type { MenuEvent } from '@models/menu-event.model'
import type { EnvironmentType } from '@models/venue.model'

const term = (
  key: string,
  phase: 'intake' | 'site_visit',
  environments?: LogisticsItemTerm['environments']
): LogisticsItemTerm =>
  ({
    _id: key,
    userId: '__master__',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    kind: 'logisticsItem',
    key,
    sortOrder: 0,
    phase,
    section: 'space',
    answerType: 'status',
    environments
  }) as LogisticsItemTerm

describe('EventLogisticsPanelComponent', () => {
  let fixture: ComponentFixture<EventLogisticsPanelComponent>
  let el: HTMLElement
  let pipeline: jasmine.SpyObj<EventPipelineService>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  let canEdit: boolean
  let itemSignal: WritableSignal<LogisticsItemTerm[]>

  const event: MenuEvent = {
    _id: 'e1',
    name: 'אירוע',
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage: 'inquiry',
    logistics: { environmentType: 'professional_kitchen', resolvedItems: [] }
  }
  const items = [
    term('kitchen_on_site', 'intake'),
    term('parking', 'intake'),
    term('chillers', 'site_visit'),
    term('generator', 'site_visit', ['outdoor_field'])
  ]
  const store = signal<MenuEvent[]>([event])

  const header = () => el.querySelector<HTMLButtonElement>('.logistics-toggle')!
  const rows = () => el.querySelectorAll('.logistics-row')
  const toggleNeeded = (rowIndex: number) => {
    rows()[rowIndex].querySelector<HTMLInputElement>('.logistics-status input')!.click()
    fixture.detectChanges()
  }
  const answer = (itemKey: string, extra: Record<string, unknown> = {}) => ({
    itemKey,
    phase: 'intake' as const,
    section: 'space',
    status: 'needed' as const,
    at: 1,
    by: 'u',
    byName: 'U',
    ...extra
  })
  const storeWith = (siteLogistics: NonNullable<MenuEvent['siteLogistics']>, createdAt?: number) =>
    store.set([{ ...event, siteLogistics, ...(createdAt !== undefined && { createdAt }) } as MenuEvent])
  const openPanel = () => {
    header().click()
    fixture.detectChanges()
  }
  const create = (can = true) => {
    canEdit = can
    fixture = TestBed.createComponent(EventLogisticsPanelComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    fixture.detectChanges()
    el = fixture.nativeElement
  }

  beforeEach(async () => {
    canEdit = true
    store.set([event])
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['saveLogistics'])
    pipeline.saveLogistics.and.resolveTo({ ok: true, event })
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(false)
    itemSignal = signal(items)
    await TestBed.configureTestingModule({
      imports: [
        EventLogisticsPanelComponent,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, CircleCheckBig, ClipboardCheck, EyeOff, Undo2 })
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        { provide: EventPipelineService, useValue: pipeline },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: PermissionService, useValue: { can: () => canEdit } },
        {
          provide: LogisticsItemRegistryService,
          useValue: {
            items_: itemSignal.asReadonly(),
            allItems_: itemSignal.asReadonly(),
            sections_: () => ['infrastructure', 'space', 'service'],
            sectionLabel: (k: string) => `logistics_section_${k}`,
            loadSafely: () => Promise.resolve(),
            forEvent: (createdAt: number | undefined, phase: string, env: EnvironmentType | undefined) =>
              itemSignal().filter(
                (t) =>
                  t.phase === phase &&
                  (createdAt === undefined || t.createdAt <= createdAt) &&
                  (!t.environments?.length || !env || t.environments.includes(env))
              ),
            forPhase: (phase: string, env: EnvironmentType | undefined) =>
              computed(() =>
                itemSignal().filter(
                  (t) => t.phase === phase && (!t.environments?.length || !env || t.environments.includes(env))
                )
              )
          }
        }
      ]
    }).compileComponents()
  })

  it('starts closed with the open count in the header', () => {
    create()
    expect(header().getAttribute('aria-expanded')).toBe('false')
    expect(rows().length).toBe(0)
    expect(header().querySelector('.c-chip__count')?.textContent?.trim()).toBe('3')
  })

  it('renders the intake rows after a header click', () => {
    create()
    header().click()
    fixture.detectChanges()
    expect(header().getAttribute('aria-expanded')).toBe('true')
    expect(rows().length).toBe(2)
  })

  it('shows the outdoor-only item only for the outdoor environment', () => {
    create()
    header().click()
    fixture.detectChanges()
    ;(fixture.componentInstance as unknown as { selectPhase(p: string): void }).selectPhase('site_visit')
    fixture.detectChanges()
    expect(rows().length).toBe(1)
    ;(fixture.componentInstance as unknown as { envDraft_: { set(v: string): void } }).envDraft_.set('outdoor_field')
    fixture.detectChanges()
    expect(rows().length).toBe(2)
  })

  it('saves once after 600 ms with the chosen status', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    toggleNeeded(0)
    tick(599)
    expect(pipeline.saveLogistics).not.toHaveBeenCalled()
    tick(1)
    expect(pipeline.saveLogistics).toHaveBeenCalledTimes(1)
    const patch = pipeline.saveLogistics.calls.mostRecent().args[1]
    expect(patch.answers?.length).toBe(1)
    expect(patch.answers?.[0].status).toBe('needed')
    expect(patch.answers?.[0].payer).toBe('ours')
  }))

  it('sends two changes made within 600 ms in one call', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    toggleNeeded(0)
    tick(300)
    toggleNeeded(1)
    tick(600)
    expect(pipeline.saveLogistics).toHaveBeenCalledTimes(1)
    expect(pipeline.saveLogistics.calls.mostRecent().args[1].answers?.length).toBe(2)
  }))

  it('keeps the draft after a failed save and resends both on the next change', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    pipeline.saveLogistics.and.resolveTo({ ok: false, code: 'server_error' })
    toggleNeeded(0)
    tick(600)
    pipeline.saveLogistics.and.resolveTo({ ok: true, event })
    toggleNeeded(1)
    tick(600)
    expect(pipeline.saveLogistics).toHaveBeenCalledTimes(2)
    expect(pipeline.saveLogistics.calls.mostRecent().args[1].answers?.length).toBe(2)
  }))

  it('lowers the open count when a row leaves unchecked', fakeAsync(() => {
    create()
    header().click()
    fixture.detectChanges()
    toggleNeeded(0)
    expect(header().querySelector('.c-chip__count')?.textContent?.trim()).toBe('2')
    tick(600)
  }))

  it('disables every control and shows read-only when the user cannot edit', () => {
    create(false)
    header().click()
    fixture.detectChanges()
    expect(header().textContent).toContain('logistics_read_only')
    const controls = el.querySelectorAll<HTMLInputElement>('.logistics-body input')
    expect(controls.length).toBeGreaterThan(0)
    controls.forEach((c) => expect(c.disabled).toBe(true))
    expect(el.querySelector('.logistics-add')).toBeNull()
  })

  it('asks for confirmation when finishing a phase with open items', () => {
    create()
    header().click()
    fixture.detectChanges()
    const done = [...el.querySelectorAll<HTMLButtonElement>('.logistics-footer button')].find((b) =>
      b.textContent?.includes('logistics_phase_done')
    )!
    done.click()
    expect(confirm.open).toHaveBeenCalledTimes(1)
    expect(confirm.open.calls.mostRecent().args[0]).toContain('kitchen_on_site')
  })

  it('does not list an item created after the event', () => {
    itemSignal.set([...items, { ...term('late', 'intake'), createdAt: 100 }])
    storeWith({ answers: [] }, 50)
    create()
    openPanel()
    expect(rows().length).toBe(2)
    expect(el.textContent).not.toContain('late')
  })

  it('hides a row, sends hiddenKeys and drops its open count; restore removes the key', () => {
    create()
    openPanel()
    rows()[0].querySelector<HTMLButtonElement>('.logistics-hide')!.click()
    expect(pipeline.saveLogistics).toHaveBeenCalledWith('e1', { hiddenKeys: ['kitchen_on_site'] })
    storeWith({ answers: [], hiddenKeys: ['kitchen_on_site'] })
    fixture.detectChanges()
    expect(rows().length).toBe(1)
    expect(header().querySelector('.c-chip__count')?.textContent?.trim()).toBe('2')
    const hiddenChip = [...el.querySelectorAll<HTMLButtonElement>('.logistics-footer button')].find((b) =>
      b.textContent?.includes('logistics_hidden_count')
    )!
    expect(hiddenChip.textContent).toContain('1')
    hiddenChip.click()
    fixture.detectChanges()
    expect(rows().length).toBe(2)
    expect(el.querySelectorAll('.logistics-row.is-hidden').length).toBe(1)
    el.querySelector<HTMLButtonElement>('.logistics-show')!.click()
    expect(pipeline.saveLogistics).toHaveBeenCalledWith('e1', { hiddenKeys: [] })
  })

  it('a hidden row with an answer stays out of the open count and the answer remains', () => {
    storeWith({ answers: [answer('parking', { status: 'unchecked' })], hiddenKeys: ['parking'] })
    create()
    openPanel()
    expect(rows().length).toBe(1)
    expect(header().querySelector('.c-chip__count')?.textContent?.trim()).toBe('2')
  })

  it('one needed toggle, no unchecked chip, no show-to-client checkbox; on sends needed and ours', fakeAsync(() => {
    create()
    openPanel()
    expect(rows()[0].querySelectorAll('.logistics-status input').length).toBe(1)
    expect(rows()[0].textContent).not.toContain('logistics_status_unchecked')
    expect(rows()[0].textContent).not.toContain('logistics_show_to_client')
    toggleNeeded(0)
    const payer = rows()[0].querySelectorAll<HTMLInputElement>('.logistics-payer input')
    expect(payer.length).toBe(2)
    expect(payer[0].checked).toBe(true)
    expect(payer[1].checked).toBe(false)
    expect(rows()[0].querySelectorAll('input[type="checkbox"]').length).toBe(1)
    tick(600)
    const sent = pipeline.saveLogistics.calls.mostRecent().args[1].answers?.[0]
    expect(sent?.status).toBe('needed')
    expect(sent?.payer).toBe('ours')
  }))

  it('payer chef reads as ours, client as client, and the old client_provides status as client', () => {
    storeWith({
      answers: [answer('kitchen_on_site', { payer: 'chef' }), answer('parking', { payer: 'client' })]
    })
    create()
    openPanel()
    const radios = (i: number) => rows()[i].querySelectorAll<HTMLInputElement>('.logistics-payer input')
    expect(radios(0)[0].checked).toBe(true)
    expect(radios(1)[1].checked).toBe(true)
    storeWith({ answers: [answer('kitchen_on_site', { status: 'client_provides' })] })
    fixture.detectChanges()
    expect(rows()[0].querySelector<HTMLInputElement>('.logistics-status input')!.checked).toBe(true)
    expect(radios(0)[1].checked).toBe(true)
  })
})
