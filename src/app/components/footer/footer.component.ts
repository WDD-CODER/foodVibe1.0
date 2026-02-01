import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnDestroy {
  private datePipe = inject(DatePipe);
  private changeDetectorRef = inject(ChangeDetectorRef);
  currentDateTime: string = '';
  recipesCount: number = 0; // Placeholder for now

  private intervalId: any;

  constructor() {
    this.updateDateTime();
    this.intervalId = setInterval(() => {
      this.updateDateTime();
      this.changeDetectorRef.detectChanges(); // Manually trigger change detection
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateDateTime(): void {
    this.currentDateTime = this.datePipe.transform(new Date(), 'medium') || '';
  }
}
