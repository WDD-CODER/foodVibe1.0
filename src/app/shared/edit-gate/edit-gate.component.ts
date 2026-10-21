import { EMPTY } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PermissionService } from '@services/permission.service'

/**
 * Plan 428: shows its content (a save button) only when the signed-in user may save the document the
 * route opened. A new item (no route data) asks `create`; an existing one asks `edit` on that document.
 * Denied: a short note instead. The server (plan 427) still decides every write.
 */
@Component({
  selector: 'app-edit-gate',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './edit-gate.component.html',
  styleUrl: './edit-gate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditGateComponent {
  // 1. INJECTED
  private readonly route = inject(ActivatedRoute)
  private readonly permission = inject(PermissionService)

  // 2. INPUTS
  /** Entity type the document belongs to, e.g. `recipes`. */
  readonly type = input.required<string>()
  /** Key of the route data that holds the opened document. */
  readonly routeDataKey = input<string>('recipe')

  // 4. SIGNALS & CONSTANTS
  /** The route data; follows the router when it reuses this component for another document. */
  private readonly routeData_ = toSignal(this.route.data ?? EMPTY, { initialValue: this.route.snapshot?.data ?? {} })

  // 5. COMPUTED
  readonly allowed_ = computed(() => {
    const doc = this.routeData_()[this.routeDataKey()] as object | null | undefined
    return doc
      ? this.permission.can('edit', { type: this.type(), doc })
      : this.permission.can('create', { type: this.type() })
  })
}
