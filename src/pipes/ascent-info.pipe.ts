import { inject, Pipe, PipeTransform } from '@angular/core';
import { AscentsService } from '../services/ascents.service';

@Pipe({
  name: 'ascentInfo',
  standalone: true,
})
export class AscentInfoPipe implements PipeTransform {
  private readonly ascentsService = inject(AscentsService);

  transform(type: string | null | undefined) {
    const info = this.ascentsService.ascentInfo();
    const t = type || 'default';
    return info[t as keyof typeof info] || info.default;
  }
}
