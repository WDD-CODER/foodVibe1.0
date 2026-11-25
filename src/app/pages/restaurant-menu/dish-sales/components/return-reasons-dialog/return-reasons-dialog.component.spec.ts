import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, forwardRef, input, output, signal } from '@angular/core'
import { NG_VALUE_ACCESSOR } from '@angular/forms'
import { ReturnReasonsDialogComponent } from './return-reasons-dialog.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { DishReturnReasonLine } from '@models/dish-sales-month.model'

@Component({ selector: 'app-modal-shell', standalone: true, template: '<ng-content />' })
class ShellStub {
  readonly size = input('sm')
  readonly hasChanges = input(false)
  readonly dismissed = output<void>()
}

@Component({
  selector: 'app-counter',
  standalone: true,
  template: '<button class="plus" (click)="valueChange.emit(value() + 1)"></button>'
})
class CounterStub {
  readonly value = input.required<number>()
  readonly min = input(0)
  readonly valueChange = output<number>()
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  template: '',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectStub), multi: true }]
})
class SelectStub {
  readonly options = input<{ value: string; label: string }[]>([])
  readonly addNewValue = input('')
  readonly addNewLabelKey = input('')
  readonly placeholder = input('')
  readonly typeToFilter = input(false)
  readonly allowTypedAdd = input(false)
  readonly addNewChosen = output<string>()
  writeValue(): void {
    /* no-op */
  }
  registerOnChange(): void {
    /* no-op */
  }
  registerOnTouched(): void {
    /* no-op */
  }
}

describe('ReturnReasonsDialogComponent (plan 726)', () => {
  let fixture: ComponentFixture<ReturnReasonsDialogComponent>
  let confirmed: DishReturnReasonLine[][]
  let own_: ReturnType<typeof signal<{ key: string }[]>>
  let taxonomy: { terms: () => typeof own_; add: jasmine.Spy; errorMessage: jasmine.Spy }
  let userMsg: jasmine.SpyObj<UserMsgService>

  const el = (): HTMLElement => fixture.nativeElement
  const rowOf = (key: string) => el().querySelector(`[data-testid="return-reason-${key}"]`) as HTMLElement
  const plus = (key: string) => (rowOf(key).querySelector('.plus') as HTMLButtonElement).click()
  const ok = () => el().querySelector('[data-testid="return-reasons-ok"]') as HTMLButtonElement
  const given = () => el().querySelector('[data-testid="return-reasons-given"]') as HTMLElement
  const flush = async () => {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(returned: number, reasons: DishReturnReasonLine[] = []): Promise<void> {
    own_ = signal<{ key: string }[]>([])
    taxonomy = {
      terms: () => own_,
      add: jasmine.createSpy('add').and.callFake(async (_k: string, key: string) => {
        own_.update((l) => [...l, { key }])
        return { key }
      }),
      errorMessage: jasmine.createSpy('errorMessage').and.returnValue(null)
    }
    userMsg = jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    TestBed.configureTestingModule({
      imports: [ReturnReasonsDialogComponent],
      providers: [
        { provide: TaxonomyStore, useValue: taxonomy },
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'return_reasons_given' ? '{{given}}/{{returned}}' : k) }
        },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    TestBed.overrideComponent(ReturnReasonsDialogComponent, {
      remove: { imports: [ModalShellComponent, CounterComponent, CustomSelectComponent] },
      add: { imports: [ShellStub, CounterStub, SelectStub] }
    })
    fixture = TestBed.createComponent(ReturnReasonsDialogComponent)
    fixture.componentRef.setInput('dishName', 'שניצל')
    fixture.componentRef.setInput('returned', returned)
    fixture.componentRef.setInput('reasons', reasons)
    confirmed = []
    fixture.componentInstance.confirmed.subscribe((l) => confirmed.push(l))
    fixture.detectChanges()
    await flush()
  }

  it("lists the six built-in reasons and the business's own", async () => {
    await setup(3)
    for (const k of ['guest_returned', 'kitchen_mistake', 'staff_meal', 'comp', 'expired', 'other']) {
      expect(rowOf(k)).withContext(k).not.toBeNull()
    }
    own_.set([{ key: 'מנה קרה' }])
    await flush()
    expect(rowOf('מנה קרה')).not.toBeNull()
  })

  it('opens with the reasons the row holds', async () => {
    await setup(3, [{ reason: 'guest_returned', count: 2 }])
    expect(given().textContent).toContain('2/3')
  })

  it('giving more than returned shows the line in red and blocks the confirm', async () => {
    await setup(3, [{ reason: 'guest_returned', count: 3 }])
    expect(ok().disabled).toBeFalse()
    plus('kitchen_mistake')
    await flush()
    expect(given().textContent).toContain('4/3')
    expect(given().classList).toContain('rr-dialog__given--over')
    expect(ok().disabled).toBeTrue()
  })

  it('«אחר» with a count needs a note before the confirm works', async () => {
    await setup(3)
    plus('other')
    await flush()
    expect(el().querySelector('[data-testid="return-reason-note-required"]')).not.toBeNull()
    expect(ok().disabled).toBeTrue()
    const note = el().querySelector('[data-testid="return-reason-note"]') as HTMLInputElement
    note.value = 'התקררה'
    note.dispatchEvent(new Event('input'))
    await flush()
    expect(ok().disabled).toBeFalse()
    ok().click()
    expect(confirmed).toEqual([[{ reason: 'other', count: 1, note: 'התקררה' }]])
  })

  it('confirm returns only the reasons with a count', async () => {
    await setup(3)
    plus('guest_returned')
    await flush()
    plus('guest_returned')
    await flush()
    plus('comp')
    await flush()
    ok().click()
    expect(confirmed).toEqual([
      [
        { reason: 'guest_returned', count: 2 },
        { reason: 'comp', count: 1 }
      ]
    ])
  })

  it('adding a new reason saves the term, then selects it with one return', async () => {
    await setup(3)
    await fixture.componentInstance['onAddTyped']('מנה קרה')
    await flush()
    expect(taxonomy.add).toHaveBeenCalledOnceWith('dishReturnReason', 'מנה קרה', {})
    expect(given().textContent).toContain('1/3')
    ok().click()
    expect(confirmed).toEqual([[{ reason: 'מנה קרה', count: 1 }]])
  })

  it("a failed add shows the store's message and selects nothing", async () => {
    await setup(3)
    taxonomy.add.and.rejectWith(new Error('x'))
    taxonomy.errorMessage.and.returnValue('taxonomy error')
    await fixture.componentInstance['onAddTyped']('מנה קרה')
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('taxonomy error')
    expect(given().textContent).toContain('0/3')
  })
})
