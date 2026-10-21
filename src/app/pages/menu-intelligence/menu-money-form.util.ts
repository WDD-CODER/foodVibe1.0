import {
  FormBuilder,
  Validators,
  type AbstractControl,
  type FormControl,
  type FormGroup,
  type ValidationErrors
} from '@angular/forms'
import type { MenuEvent } from '@models/menu-event.model'

/** Plan 445: the money part of the menu form (owner-only fields; plan 427 decides who may save them). */
export interface MoneyFormValue {
  pricePerGuest: number | null
  extraCostAmount: number | null
  extraCostNote: string
  profitTargetPct: number | null
  safetyMarginPct: number | null
}

export type MoneyForm = FormGroup<{ [K in keyof MoneyFormValue]: FormControl<MoneyFormValue[K]> }>

/** A percentage of 100 or more cannot be a profit target or a margin (the price formula divides by 100 − target). */
export function targetTooHigh(control: AbstractControl): ValidationErrors | null {
  const value = control.value
  return typeof value === 'number' && value >= 100 ? { targetTooHigh: true } : null
}

export function createMoneyGroup(fb: FormBuilder): MoneyForm {
  return fb.group({
    pricePerGuest: fb.control<number | null>(null, Validators.min(0)),
    extraCostAmount: fb.control<number | null>(null, Validators.min(0)),
    extraCostNote: fb.control('', Validators.maxLength(200)),
    profitTargetPct: fb.control<number | null>(null, [Validators.min(0), targetTooHigh]),
    safetyMarginPct: fb.control<number | null>(null, [Validators.min(0), targetTooHigh])
  }) as MoneyForm
}

/** The form values of a stored event (missing fields stay empty). */
export function moneyFormFromEvent(
  event: Pick<MenuEvent, 'pricePerGuest' | 'extraCosts' | 'targetsOverride'>
): MoneyFormValue {
  return {
    pricePerGuest: event.pricePerGuest ?? null,
    extraCostAmount: event.extraCosts?.amount ?? null,
    extraCostNote: event.extraCosts?.note ?? '',
    profitTargetPct: event.targetsOverride?.profitTargetPct ?? null,
    safetyMarginPct: event.targetsOverride?.safetyMarginPct ?? null
  }
}

function filled(value: unknown): value is number {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

/** The event fields of the form; an empty input leaves its key out (an empty price is not 0). */
export function moneyFieldsFromForm(
  raw: Partial<MoneyFormValue> | null | undefined
): Pick<MenuEvent, 'pricePerGuest' | 'extraCosts' | 'targetsOverride'> {
  const form = raw ?? {}
  const note = (form.extraCostNote ?? '').trim()
  const hasExtra = filled(form.extraCostAmount) || note !== ''
  const hasTarget = filled(form.profitTargetPct)
  const hasMargin = filled(form.safetyMarginPct)
  return {
    ...(filled(form.pricePerGuest) && { pricePerGuest: Number(form.pricePerGuest) }),
    ...(hasExtra && {
      extraCosts: { amount: filled(form.extraCostAmount) ? Number(form.extraCostAmount) : 0, ...(note && { note }) }
    }),
    ...((hasTarget || hasMargin) && {
      targetsOverride: {
        ...(hasTarget && { profitTargetPct: Number(form.profitTargetPct) }),
        ...(hasMargin && { safetyMarginPct: Number(form.safetyMarginPct) })
      }
    })
  }
}
