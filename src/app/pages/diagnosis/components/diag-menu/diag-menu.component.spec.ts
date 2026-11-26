import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Diagnosis } from '@schemas/entities'
import { DishDataService } from '@services/dish-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { DiagnosisService } from '../../services/diagnosis.service'
import { DiagMenuComponent } from './diag-menu.component'

const DISHES = [
  { _id: 'd1', nameHebrew: 'פסטה', recipeType: 'dish' },
  { _id: 'd2', nameHebrew: 'סלט', recipeType: 'dish' },
  { _id: 'd3', nameHebrew: 'סלט', recipeType: 'dish' },
  { _id: 'r1', nameHebrew: 'רוטב', recipeType: 'preparation' }
]

const diagnosis = (extra: Partial<Diagnosis> = {}): Diagnosis =>
  ({
    _id: 'g1',
    name: 'G',
    periodDays: 60,
    menu: [],
    pricesIncludeVat: true,
    vatPct: 18,
    invoiceIds: [],
    status: 'open',
    ...extra
  }) as unknown as Diagnosis

describe('DiagMenuComponent', () => {
  let fixture: ComponentFixture<DiagMenuComponent>
  let readMenu: jasmine.Spy
  let saveMenu: jasmine.Spy
  let onSetErrorMsg: jasmine.Spy
  let onSetSuccessMsg: jasmine.Spy
  let reloadFromStorage: jasmine.Spy
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const all = (id: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`))

  async function setup(initial: Diagnosis = diagnosis()): Promise<void> {
    readMenu = jasmine.createSpy('readMenu')
    saveMenu = jasmine
      .createSpy('saveMenu')
      .and.callFake(async (_id: string, body: { menu: unknown[] }) => ({ ...initial, menu: body.menu }))
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    onSetSuccessMsg = jasmine.createSpy('onSetSuccessMsg')
    reloadFromStorage = jasmine.createSpy('reloadFromStorage').and.resolveTo()
    TestBed.configureTestingModule({
      imports: [DiagMenuComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: DiagnosisService, useValue: { readMenu, saveMenu } },
        { provide: DishDataService, useValue: { allDishes_: signal(DISHES), reloadFromStorage } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: { onSetErrorMsg, onSetSuccessMsg } }
      ]
    })
    fixture = TestBed.createComponent(DiagMenuComponent)
    fixture.componentRef.setInput('diagnosis', initial)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function paste(text = 'x'): Promise<void> {
    const box = byId<HTMLTextAreaElement>('diag-menu-text')!
    box.value = text
    box.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    byId<HTMLButtonElement>('diag-menu-read')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const saveBtn = () => byId<HTMLButtonElement>('diag-menu-save')!

  it('shows the stored menu rows on open', async () => {
    await setup(diagnosis({ menu: [{ name: 'פסטה', sellPrice: 40, dishId: 'd1' }] }))
    expect(all('diag-menu-row').length).toBe(1)
    expect(byId<HTMLInputElement>('diag-menu-name')!.value).toBe('פסטה')
    expect(byId('diag-menu-linked')!.textContent).toContain('פסטה')
  })

  it('rows come from the read; a null price shows the missing tag and blocks the save', async () => {
    await setup()
    readMenu.and.resolveTo({
      items: [
        { name: 'המבורגר', sellPrice: 50 },
        { name: 'צ׳יפס', sellPrice: null }
      ],
      draftId: 'dr1'
    })
    await paste()
    expect(all('diag-menu-row').length).toBe(2)
    expect(all('diag-menu-no-price').length).toBe(1)
    expect(saveBtn().getAttribute('aria-disabled')).toBe('true')
    saveBtn().click()
    expect(saveMenu).not.toHaveBeenCalled()
    const prices = all('diag-menu-price') as HTMLInputElement[]
    prices[1].value = '12'
    prices[1].dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(saveBtn().getAttribute('aria-disabled')).toBeNull()
  })

  it('a name equal to exactly one dish is linked by code; an ambiguous or unknown name is not', async () => {
    await setup()
    readMenu.and.resolveTo({
      items: [
        { name: 'פסטה', sellPrice: 40 },
        { name: 'סלט', sellPrice: 30 },
        { name: 'שייק', sellPrice: 20 }
      ],
      draftId: 'dr1'
    })
    await paste()
    expect(all('diag-menu-linked').length).toBe(1)
    expect(all('diag-menu-linked')[0].textContent).toContain('פסטה')
  })

  it('save sends the draft id once, the VAT switch and the percent', async () => {
    await setup()
    readMenu.and.resolveTo({ items: [{ name: 'פסטה', sellPrice: 40 }], draftId: 'dr1' })
    await paste()
    saveBtn().click()
    await fixture.whenStable()
    expect(saveMenu).toHaveBeenCalledWith('g1', {
      menu: [{ name: 'פסטה', sellPrice: 40, dishId: 'd1' }],
      draftId: 'dr1',
      pricesIncludeVat: true,
      vatPct: 18
    })
    expect(onSetSuccessMsg).toHaveBeenCalledWith('diag_menu_saved')
    byId<HTMLButtonElement>('diag-menu-add')!.click()
    fixture.detectChanges()
    const name = all('diag-menu-name')[1] as HTMLInputElement
    name.value = 'x'
    name.dispatchEvent(new Event('input'))
    const price = all('diag-menu-price')[1] as HTMLInputElement
    price.value = '1'
    price.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    saveBtn().click()
    await fixture.whenStable()
    expect(saveMenu.calls.mostRecent().args[1].draftId).toBeUndefined()
  })

  it('the percent is hidden while the switch is off, and the switch counts as an unsaved edit', async () => {
    await setup(diagnosis({ menu: [{ name: 'a', sellPrice: 1 }] }))
    expect(byId('diag-vat-pct')).not.toBeNull()
    expect(fixture.componentInstance.hasRealChanges()).toBeFalse()
    const sw = byId<HTMLInputElement>('diag-vat-switch')!
    sw.click()
    fixture.detectChanges()
    expect(byId('diag-vat-pct')).toBeNull()
    expect(fixture.componentInstance.hasRealChanges()).toBeTrue()
    saveBtn().click()
    await fixture.whenStable()
    expect(saveMenu.calls.mostRecent().args[1].pricesIncludeVat).toBeFalse()
  })

  it('maps read failures: monthly cap, other 429, other failure, empty answer', async () => {
    await setup()
    readMenu.and.rejectWith(new HttpErrorResponse({ status: 429, error: { error: 'ai_monthly_cap_reached' } }))
    await paste('t')
    expect(byId('diag-menu-error')!.textContent).toContain('ai_monthly_cap_reached')
    readMenu.and.rejectWith(new HttpErrorResponse({ status: 429, error: {} }))
    await paste('t')
    expect(byId('diag-menu-error')!.textContent).toContain('ai_daily_limit_reached_all')
    readMenu.and.rejectWith(new HttpErrorResponse({ status: 500 }))
    await paste('t')
    expect(byId('diag-menu-error')!.textContent).toContain('diag_menu_read_failed')
    expect(byId<HTMLTextAreaElement>('diag-menu-text')!.value).toBe('t')
    readMenu.and.resolveTo({ items: [], draftId: 'dr' })
    await paste('t')
    expect(byId('diag-menu-error')!.textContent).toContain('diag_menu_nothing_found')
  })

  it('a failed save keeps the rows and shows server_error; UNKNOWN_DISH reloads the dishes', async () => {
    await setup(diagnosis({ menu: [{ name: 'a', sellPrice: 1 }] }))
    saveMenu.and.rejectWith(new HttpErrorResponse({ status: 400, error: { error: 'UNKNOWN_DISH' } }))
    byId<HTMLButtonElement>('diag-menu-add')!.click()
    fixture.detectChanges()
    const name = all('diag-menu-name')[1] as HTMLInputElement
    name.value = 'b'
    name.dispatchEvent(new Event('input'))
    const price = all('diag-menu-price')[1] as HTMLInputElement
    price.value = '2'
    price.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    saveBtn().click()
    await fixture.whenStable()
    expect(onSetErrorMsg).toHaveBeenCalledWith('server_error')
    expect(reloadFromStorage).toHaveBeenCalled()
    expect(all('diag-menu-row').length).toBe(2)
  })
})
