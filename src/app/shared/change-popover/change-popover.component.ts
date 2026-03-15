import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityEntry, ActivityChange } from '../../core/services/activity-log.service';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '../../core/directives/click-out-side';
import { FloatingInfoContainerComponent } from '../floating-info-container/floating-info-container.component';

export interface ChangePopoverOpen {
  top: number;
  left: number;
  activityId: string;
  field: string;
}

@Component({
  selector: 'app-change-popover',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ClickOutSideDirective, FloatingInfoContainerComponent],
  templateUrl: './change-popover.component.html',
  styleUrl: './change-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePopoverComponent {
  private readonly translation = inject(TranslationService);

  open = input<ChangePopoverOpen | null>(null);
  activity = input<ActivityEntry | undefined>(undefined);

  closeRequest = output<HTMLElement>();

  getChange(activity: ActivityEntry | undefined, field: string): ActivityChange | undefined {
    return activity?.changes?.find(c => c.field === field);
  }

  formatChangeValue(value: string | undefined): string {
    if (value == null || value === '') return '';
    return value
      .split(',')
      .map(s => this.translation.translate(s.trim()))
      .join(', ');
  }
}
