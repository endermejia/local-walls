import { Pipe, PipeTransform } from '@angular/core';

export interface ShadeInfo {
  icon: string;
  label: string;
}

@Pipe({
  name: 'shadeInfo',
  standalone: true,
})
export class ShadeInfoPipe implements PipeTransform {
  transform(
    item:
      | { shade_morning: boolean; shade_afternoon: boolean }
      | null
      | undefined,
  ): ShadeInfo | null {
    if (!item) return null;

    if (item.shade_morning && item.shade_afternoon) {
      return { icon: '@tui.cloud-sun', label: 'filters.shade.allDay' };
    }
    if (item.shade_morning) {
      return { icon: '@tui.sunrise', label: 'filters.shade.morning' };
    }
    if (item.shade_afternoon) {
      return { icon: '@tui.sunset', label: 'filters.shade.afternoon' };
    }
    return { icon: '@tui.sun', label: 'filters.shade.noShade' };
  }
}
