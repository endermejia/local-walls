import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'contextIndex',
  standalone: true,
})
export class ContextIndexPipe implements PipeTransform {
  transform(
    context:
      | number
      | { index: number }
      | { $implicit: number }
      | Record<string, unknown>
      | null
      | undefined,
  ): number {
    if (typeof context === 'number') {
      return context;
    }
    if (
      context &&
      typeof context === 'object' &&
      'index' in context &&
      typeof context.index === 'number'
    ) {
      return context.index;
    }
    if (
      context &&
      typeof context === 'object' &&
      '$implicit' in context &&
      typeof context.$implicit === 'number'
    ) {
      return context.$implicit;
    }
    return 0;
  }
}
