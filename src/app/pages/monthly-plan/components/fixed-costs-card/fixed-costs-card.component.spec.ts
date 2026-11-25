import { ComponentFixture, TestBed } from '@angular/core/testing'
import { defaultFixed, type FixedGroup } from '@schemas/month/month-rules'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { FixedCostsCardComponent } from './fixed-costs-card.component'

describe('FixedCostsCardComponent (plan 729)', () => {
  let fixture: ComponentFixture<FixedCostsCardComponent>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  let emitted: FixedGroup[]
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)

  function setup(group: FixedGroup = defaultFixed(), answer = true): void {
    confirm = jasmine.createSpyObj('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(answer)
    TestBed.configureTestingModule({
      imports: [FixedCostsCardComponent],
      providers: [
        { provide: ConfirmModalService, useValue: confirm },
        {
          provide: TranslationService,
          useValue: {
            translate: (k: string) => (k === 'mp_fixed_entered' ? 'הוזנו {{entered}} מתוך {{lines}} שורות' : k)
          }
        }
      ]
    })
    fixture = TestBed.createComponent(FixedCostsCardComponent)
    emitted = []
    fixture.componentInstance.groupChange.subscribe((g) => emitted.push(g))
    fixture.componentRef.setInput('group', group)
    fixture.detectChanges()
  }

  it('lists the eight starter lines, all not entered, with «הוזנו 0 מתוך 8 שורות»', () => {
    setup()
    expect(el().querySelectorAll('[data-testid^="fc-line-"]').length).toBe(8)
    expect(byId('fc-name-kashrut')!.textContent).toContain('mp_fixed_kashrut')
    expect(byId('fc-entered')!.textContent).toContain('הוזנו 0 מתוך 8 שורות')
  })

  it('typing an actual emits the group with that line changed; the count follows the group', () => {
    setup()
    const input = byId<HTMLInputElement>('fc-rent-actual')!
    input.value = '12000'
    input.dispatchEvent(new Event('input'))
    expect(emitted.at(-1)!.lines.find((l) => l.id === 'rent')!.actual).toBe(12000)
    fixture.componentRef.setInput('group', emitted.at(-1))
    fixture.detectChanges()
    expect(byId('fc-entered')!.textContent).toContain('הוזנו 1 מתוך 8 שורות')
  })

  it('«הוסף שורה» adds an own line with an empty name; at 40 lines it refuses with the limit text', () => {
    setup()
    byId<HTMLButtonElement>('fc-add')!.click()
    const added = emitted.at(-1)!.lines.at(-1)!
    expect(added.name).toBe('')
    expect(added.starterKey).toBeUndefined()
    expect(emitted.at(-1)!.lines.length).toBe(9)

    const full: FixedGroup = {
      ...defaultFixed(),
      lines: Array.from({ length: 40 }, (_, i) => ({ id: `l${i}`, name: `n${i}`, plan: null, actual: null }))
    }
    fixture.componentRef.setInput('group', full)
    fixture.detectChanges()
    emitted.length = 0
    byId<HTMLButtonElement>('fc-add')!.click()
    fixture.detectChanges()
    expect(emitted.length).toBe(0)
    expect(byId('fc-max')!.textContent).toContain('mp_fixed_max')
  })

  it('remove asks first: cancel keeps the line, confirm removes it', async () => {
    setup(defaultFixed(), false)
    byId<HTMLButtonElement>('fc-remove-rent')!.click()
    await fixture.whenStable()
    expect(confirm.open).toHaveBeenCalledWith('mp_fixed_remove_confirm', jasmine.anything())
    expect(emitted.length).toBe(0)

    confirm.open.and.resolveTo(true)
    byId<HTMLButtonElement>('fc-remove-rent')!.click()
    await fixture.whenStable()
    expect(emitted.at(-1)!.lines.length).toBe(7)
    expect(emitted.at(-1)!.lines.some((l) => l.id === 'rent')).toBeFalse()
  })

  it('switching to «סכום אחד» keeps the lines and shows two boxes and the note', () => {
    setup()
    byId<HTMLInputElement>('fc-mode-rough')!.click()
    expect(emitted.at(-1)!.mode).toBe('rough')
    expect(emitted.at(-1)!.lines.length).toBe(8)
    fixture.componentRef.setInput('group', emitted.at(-1))
    fixture.detectChanges()
    expect(byId('fc-rough-actual')).not.toBeNull()
    expect(byId('fc-rough-note')!.textContent).toContain('mp_fixed_rough_note')
    expect(byId('fc-line-rent')).toBeNull()
  })

  it('with no lines it shows the empty text', () => {
    setup({ ...defaultFixed(), lines: [] })
    expect(byId('fc-empty')!.textContent).toContain('mp_fixed_empty')
  })
})
