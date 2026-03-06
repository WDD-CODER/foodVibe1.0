import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatQuantity',
  standalone: true
})
export class FormatQuantityPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null || isNaN(value)) return '';
    return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 3 }).format(value);
  }
}
