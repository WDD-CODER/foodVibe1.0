import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { ClientDataService } from '@services/client-data.service'
import { RequestDataService } from '@services/request-data.service'
import { BookingDataService } from '@services/booking-data.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { downloadCsv, toCsv, type CsvColumn } from 'src/app/core/utils/csv.util'
import type { Client } from '@models/client.model'
import type { FrontDeskRequest } from '@schemas/entities/request.schema'
import type { Booking } from '@schemas/entities/booking.schema'

type ExportKind = 'clients' | 'requests' | 'bookings'

const TIME_ZONE = 'Asia/Jerusalem'

/** A moment as `YYYY-MM-DD` in Israel time (today by default; used for the file name and date cells). */
export function jerusalemToday(now: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

/** A stored timestamp as `YYYY-MM-DD` (Israel time); empty when absent. */
function dateOf(ms: number | undefined): string {
  return ms ? jerusalemToday(ms) : ''
}

function dateTimeOf(ms: number | undefined): string {
  if (!ms) return ''
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(ms)
  return `${jerusalemToday(ms)} ${time}`
}

/** Plan 557: the owner downloads clients, requests and bookings as CSV files (built in the browser, never stored). */
@Component({
  selector: 'app-data-export-card',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './data-export-card.component.html',
  styleUrl: './data-export-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataExportCardComponent {
  private readonly clients = inject(ClientDataService)
  private readonly requests = inject(RequestDataService)
  private readonly bookings = inject(BookingDataService)
  private readonly permission = inject(PermissionService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly logging = inject(LoggingService)

  protected readonly isOwner_ = computed(() => this.permission.isOwner_())
  protected readonly busy_ = signal<ExportKind | null>(null)

  private t(key: string): string {
    return this.translation.translate(key)
  }

  /** The dictionary label of an enum value (`prefix` + value); the raw key comes back when the dictionary has none. */
  private label(prefix: string, value: string | undefined): string {
    return value ? this.t(prefix + value) : ''
  }

  private h(key: string): string {
    return this.t('fd_csv_' + key)
  }

  private clientColumns(): CsvColumn<Client>[] {
    const yes = this.h('yes')
    return [
      { header: this.h('name'), value: (c) => c.name },
      { header: this.h('phone'), value: (c) => c.phone },
      { header: this.h('email'), value: (c) => c.email },
      { header: this.h('client_type'), value: (c) => this.label('client_type_', c.clientType) },
      { header: this.h('company'), value: (c) => c.companyName },
      { header: this.h('kinds'), value: (c) => (c.kinds ?? []).map((k) => this.label('client_kind_', k)).join(', ') },
      { header: this.h('tags'), value: (c) => (c.tags ?? []).join(', ') },
      { header: this.h('source'), value: (c) => c.source },
      { header: this.h('first_seen'), value: (c) => dateOf(c.firstSeenAt) },
      { header: this.h('last_contact'), value: (c) => dateOf(c.lastContactAt) },
      { header: this.h('requests'), value: (c) => c.counters?.requests },
      { header: this.h('bookings'), value: (c) => c.counters?.bookings },
      { header: this.h('events'), value: (c) => c.counters?.events },
      { header: this.h('no_shows'), value: (c) => c.counters?.noShows },
      { header: this.h('do_not_contact'), value: (c) => (c.doNotContact ? yes : '') },
      {
        header: this.h('marketing'),
        value: (c) => (c.consent?.marketing ? (c.consent.marketing.given ? yes : this.h('no')) : '')
      },
      { header: this.h('notes'), value: (c) => c.notes }
    ]
  }

  private requestColumns(): CsvColumn<FrontDeskRequest>[] {
    return [
      { header: this.h('created'), value: (r) => dateTimeOf(r.createdAt) },
      { header: this.h('kind'), value: (r) => this.label('fd_kind_', r.kind) },
      { header: this.h('status'), value: (r) => this.label('client_tl_status_', r.status) },
      { header: this.h('channel'), value: (r) => this.label('rq_channel_', r.channel) },
      { header: this.h('guest_name'), value: (r) => r.guestName },
      { header: this.h('guest_phone'), value: (r) => r.guestPhone },
      { header: this.h('date'), value: (r) => r.wanted.date },
      { header: this.h('time'), value: (r) => r.wanted.time },
      { header: this.h('party_size'), value: (r) => r.wanted.partySize },
      { header: this.h('event_type'), value: (r) => (r.wanted.eventTypeKey ? this.t(r.wanted.eventTypeKey) : '') },
      { header: this.h('budget'), value: (r) => r.wanted.budgetPerGuest },
      { header: this.h('location'), value: (r) => r.wanted.location },
      { header: this.h('verdict'), value: (r) => this.label('rq_verdict_', r.qualification?.verdict) },
      { header: this.h('answers'), value: (r) => r.answers.map((a) => `${a.label}: ${a.value}`).join(' | ') },
      {
        header: this.h('outcome'),
        value: (r) => (r.outcome ? this.h(r.outcome.type === 'menuEvent' ? 'outcome_event' : 'outcome_booking') : '')
      }
    ]
  }

  private bookingColumns(): CsvColumn<Booking>[] {
    return [
      { header: this.h('date'), value: (b) => b.date },
      { header: this.h('time'), value: (b) => b.time },
      { header: this.h('kind'), value: (b) => this.label('fd_kind_', b.kind) },
      { header: this.h('status'), value: (b) => this.label('client_tl_status_', b.status) },
      { header: this.h('source'), value: (b) => this.t(b.source) },
      { header: this.h('guest_name'), value: (b) => b.guestName },
      { header: this.h('guest_phone'), value: (b) => b.guestPhone },
      { header: this.h('party_size'), value: (b) => b.partySize },
      { header: this.h('duration'), value: (b) => b.durationMinutes },
      { header: this.h('notes'), value: (b) => b.notes }
    ]
  }

  /** Loads fresh records through the data service, builds the file and downloads it. */
  protected async export(kind: ExportKind): Promise<void> {
    if (this.busy_()) return
    this.busy_.set(kind)
    try {
      let text: string
      if (kind === 'clients') {
        await this.clients.reloadFromStorage()
        text = toCsv(this.clientColumns(), this.clients.allClients_())
      } else if (kind === 'requests') {
        await this.requests.reloadFromStorage()
        text = toCsv(
          this.requestColumns(),
          this.requests.all_().filter((r) => !r.test)
        )
      } else {
        await this.bookings.reloadFromStorage()
        text = toCsv(this.bookingColumns(), this.bookings.all_())
      }
      downloadCsv(text, `${kind}-${jerusalemToday()}.csv`)
    } catch (err) {
      this.logging.error({
        event: 'frontdesk.export_failed',
        message: 'Exporting the front desk data failed',
        context: { kind, err: String(err) }
      })
      this.userMsg.onSetErrorMsg(this.t('fd_export_failed'))
    } finally {
      this.busy_.set(null)
    }
  }
}
