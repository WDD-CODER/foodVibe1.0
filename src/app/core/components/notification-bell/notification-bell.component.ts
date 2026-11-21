import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core'
import { Router } from '@angular/router'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { formatMoney, formatPct1 } from 'src/app/core/engine/rounding'
import { NotificationsService, type AlertRow } from '@services/notifications.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'

/**
 * Plan 646: the header bell. The unread count shows above 0; the panel lists the alerts newest first. Clicking one
 * marks it read and opens the product (another business: it switches into it first and lands on the dashboard).
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, DatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly notifications = inject(NotificationsService)
  private readonly translation = inject(TranslationService)
  private readonly user = inject(UserService)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  protected readonly isOpen_ = signal(false)
  protected readonly unread_ = this.notifications.unread_
  protected readonly rows_ = this.notifications.rows_
  private readonly activeBusinessId_ = computed(() => this.user.user_()?.businessId ?? null)

  ngOnInit(): void {
    this.notifications.startPolling()
  }

  ngOnDestroy(): void {
    this.notifications.stopPolling()
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (this.isOpen_() && !this.host.nativeElement.contains(event.target as Node)) this.isOpen_.set(false)
  }

  protected toggle(): void {
    this.isOpen_.update((open) => !open)
  }

  /** The alert text from `alert_price_change`. */
  protected text(row: AlertRow): string {
    return this.translation
      .translate('alert_price_change')
      .replace('{product}', row.productName)
      .replace('{from}', formatMoney(row.from))
      .replace('{to}', formatMoney(row.to))
      .replace('{pct}', `${row.changePct > 0 ? '+' : ''}${formatPct1(row.changePct)}`)
      .replace('{supplier}', row.supplierName)
  }

  /** The business name, only when the alert is not about the business the user is in. */
  protected otherBusiness(row: AlertRow): string {
    return row.businessId === this.activeBusinessId_() ? '' : row.businessName
  }

  protected async open(row: AlertRow): Promise<void> {
    this.isOpen_.set(false)
    void this.notifications.markRead(row._id)
    if (row.businessId !== this.activeBusinessId_()) {
      await this.user.switchBusiness(row.businessId === this.user.homeBusinessId_() ? null : row.businessId)
      return
    }
    await this.router.navigate(['/inventory/edit', row.productId])
  }

  protected markAll(): void {
    void this.notifications.markAllRead()
  }
}
