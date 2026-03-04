import { ChangeDetectionStrategy, Component, computed, inject, output, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VenueDataService } from '@services/venue-data.service';
import { VenueProfile, EnvironmentType } from '@models/venue.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component';
import { CarouselHeaderComponent, CarouselHeaderColumnDirective } from 'src/app/shared/carousel-header/carousel-header.component';
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component';

const ENV_TYPES: EnvironmentType[] = [
  'professional_kitchen',
  'outdoor_field',
  'client_home',
  'popup_venue',
];

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    ListShellComponent,
    CarouselHeaderComponent,
    CarouselHeaderColumnDirective,
    CellCarouselComponent,
    CellCarouselSlideDirective,
  ],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['embeddedInDashboard'],
})
export class VenueListComponent {
  private readonly venueData = inject(VenueDataService);
  private readonly router = inject(Router);

  /** When true, add button emits addVenueClick instead of navigating (e.g. dashboard tab switch). */
  embeddedInDashboard = false;
  readonly addVenueClick = output<void>();

  protected searchQuery_ = signal('');
  protected deletingId_ = signal<string | null>(null);
  protected isPanelOpen_ = signal(true);
  protected carouselHeaderIndex_ = signal(0);
  protected selectedEnvTypes_ = signal<Set<EnvironmentType>>(new Set());

  protected envTypes = ENV_TYPES;

  constructor() {
    afterNextRender(() => {
      const q = window.matchMedia('(max-width: 768px)');
      if (q.matches) this.isPanelOpen_.set(false);
      q.addEventListener('change', (e) => { if (e.matches) this.isPanelOpen_.set(false); });
    });
  }

  protected togglePanel(): void {
    this.isPanelOpen_.update((v) => !v);
  }

  protected onCarouselHeaderChange(index: number): void {
    this.carouselHeaderIndex_.set(index);
  }

  protected toggleEnvType(env: EnvironmentType): void {
    this.selectedEnvTypes_.update((set) => {
      const next = new Set(set);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return next;
    });
  }

  protected hasActiveFilters_ = computed(() => this.selectedEnvTypes_().size > 0);

  protected clearAllFilters(): void {
    this.selectedEnvTypes_.set(new Set());
  }

  protected filteredVenues_ = computed(() => {
    let list = this.venueData.allVenues_();
    const search = this.searchQuery_().trim().toLowerCase();
    const selectedEnv = this.selectedEnvTypes_();
    if (search) {
      list = list.filter(
        (v) =>
          (v.name_hebrew ?? '').toLowerCase().includes(search) ||
          (v.environment_type_ ?? '').toLowerCase().includes(search)
      );
    }
    if (selectedEnv.size > 0) {
      list = list.filter((v) => selectedEnv.has(v.environment_type_));
    }
    return [...list].sort((a, b) =>
      (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he')
    );
  });

  protected envTypeLabel(env: EnvironmentType): string {
    return env;
  }

  protected onAddPlace(): void {
    if (this.embeddedInDashboard) {
      this.addVenueClick.emit();
    } else {
      void this.router.navigate(['/venues/add']);
    }
  }

  onEdit(id: string): void {
    this.router.navigate(['/venues/edit', id]);
  }

  async onDelete(item: VenueProfile): Promise<void> {
    if (!confirm('למחוק את המיקום "' + (item.name_hebrew ?? '') + '"?')) return;
    this.deletingId_.set(item._id);
    try {
      await this.venueData.deleteVenue(item._id);
    } catch (e) {
      console.error(e);
    } finally {
      this.deletingId_.set(null);
    }
  }
}
