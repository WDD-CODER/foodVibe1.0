import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VenueDataService } from '@services/venue-data.service';
import { VenueProfile, EnvironmentType } from '@models/venue.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueListComponent {
  private readonly venueData = inject(VenueDataService);
  private readonly router = inject(Router);

  protected searchQuery_ = signal('');
  protected deletingId_ = signal<string | null>(null);

  protected filteredVenues_ = computed(() => {
    let list = this.venueData.allVenues_();
    const search = this.searchQuery_().trim().toLowerCase();
    if (search) {
      list = list.filter(
        v =>
          (v.name_hebrew ?? '').toLowerCase().includes(search) ||
          (v.environment_type_ ?? '').toLowerCase().includes(search)
      );
    }
    return [...list].sort((a, b) =>
      (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he')
    );
  });

  protected envTypeLabel(env: EnvironmentType): string {
    return env;
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
