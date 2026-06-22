import { inject, Pipe, PipeTransform } from '@angular/core';
import { GlobalData } from '../services/global-data';

@Pipe({
  name: 'ascentDate',
  standalone: true,
})
export class AscentDatePipe implements PipeTransform {
  private readonly global = inject(GlobalData);

  transform(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return dateStr;

    const currentYear = new Date().getFullYear();
    const locale = this.global.selectedLanguage() || 'es';

    if (year === currentYear) {
      try {
        const formatted = new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(date);
        return formatted.replace(',', '');
      } catch (e) {
        // Fallback
      }
    }

    try {
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  }
}
