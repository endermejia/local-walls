import { inject, Pipe, PipeTransform } from '@angular/core';

import { GlobalData } from '../services/global-data';
import { Theme } from '../models';

@Pipe({
  name: 'iconSrc',
  standalone: true,
  pure: true,
})
export class IconSrcPipe implements PipeTransform {
  private readonly global = inject(GlobalData);

  transform(name: string, _theme: Theme | string): string {
    return this.global.iconSrc()(name as any);
  }
}
