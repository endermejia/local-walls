import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'includesId',
  standalone: true,
})
export class IncludesIdPipe implements PipeTransform {
  transform<T extends { id?: string | number } | string | number>(
    items: T[] | null | undefined,
    id: string | number | null | undefined,
  ): boolean {
    if (!items || id === null || id === undefined) return false;
    return items.some((item) => {
      if (typeof item === 'object' && item !== null && 'id' in item) {
        return item.id === id;
      }
      return item === id;
    });
  }
}
