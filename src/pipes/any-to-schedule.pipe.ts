import { Pipe, PipeTransform } from '@angular/core';
import { IndoorSchedule } from '../models';

@Pipe({
  name: 'anyToSchedule',
  standalone: true,
})
export class AnyToSchedulePipe implements PipeTransform {
  transform(val: unknown): IndoorSchedule {
    const s = val as IndoorSchedule;
    return {
      normal: s?.normal || {},
      exceptions: s?.exceptions || [],
    };
  }
}
