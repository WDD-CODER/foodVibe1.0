import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PermissionService } from '@services/permission.service'
import type { Product } from '@models/product.model'

/**
 * Plan 428: locks the money fields of the product form for a staff member, and the whole form on a
 * product another member created. A child component because `product-form.component.ts` is growth-frozen.
 * The server (plan 427) is still the one that refuses; this only stops the user hitting that refusal.
 */
@Component({
  selector: 'app-product-price-lock',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './product-price-lock.component.html',
  styleUrl: './product-price-lock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductPriceLockComponent implements OnInit {
  // 1. INJECTED
  private readonly route = inject(ActivatedRoute)
  private readonly permission = inject(PermissionService)
  private readonly destroyRef = inject(DestroyRef)

  // 2. INPUTS
  readonly form = input.required<FormGroup>()

  // 4. SIGNALS & CONSTANTS
  /** The product being edited (route data of `/inventory/edit/:id`); undefined when adding a new one. */
  private readonly product = this.route.snapshot?.data?.['product'] as Product | undefined | null

  // 5. COMPUTED
  /** Staff on a product another member created: the whole form is read-only. */
  readonly viewOnly = computed(
    () =>
      this.permission.isStaff_() &&
      !!this.product &&
      !this.permission.can('edit', { type: 'products', doc: this.product })
  )
  /** Staff: prices are the owner's job. */
  readonly pricesLocked = computed(
    () => this.permission.isStaff_() && !this.permission.can('editMoney', { type: 'products' })
  )

  ngOnInit(): void {
    const form = this.form()
    if (this.viewOnly()) this.lockWholeForm(form)
    else if (this.pricesLocked()) this.lockPrices(form)
  }

  // 6. METHODS
  private lockWholeForm(form: FormGroup): void {
    form.disable({ emitEvent: false })
    const rows = form.get('purchaseOptions') as FormArray | null
    // A row added later starts enabled: disable it again.
    rows?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      rows.controls.filter((row) => row.enabled).forEach((row) => row.disable({ emitEvent: false }))
    })
  }

  private lockPrices(form: FormGroup): void {
    const locked = new WeakSet<AbstractControl>()
    const lock = (control: AbstractControl | null): void => {
      if (!control || locked.has(control)) return
      locked.add(control)
      const loaded: unknown = control.value
      control.disable({ emitEvent: false })
      // The form's own price suggestion would otherwise change a money field and the save would be refused.
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
        if (value !== loaded) control.setValue(loaded, { emitEvent: false })
      })
    }
    const lockRow = (row: AbstractControl): void => {
      lock(row.get('priceOverride'))
      lock(row.get('show_special_price_'))
    }

    lock(form.get('buy_price_global_'))
    const rows = form.get('purchaseOptions') as FormArray | null
    rows?.controls.forEach(lockRow)
    rows?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => rows.controls.forEach(lockRow))
  }
}
