// Component: venue-form.component.ts (adapted)
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'app-venue-form', template: '' })
export class VenueFormComponent {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.hydrateForm(data['venue']);
      });
  }

  private hydrateForm(venue: any): void {}
}
