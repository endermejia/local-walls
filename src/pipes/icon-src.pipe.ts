import { inject, Pipe, PipeTransform } from '@angular/core';

import { GlobalData } from '../services/global-data';
import { IconName } from '../models';

@Pipe({
  name: 'iconSrc',
  standalone: true,
  pure: true,
})
export class IconSrcPipe implements PipeTransform {
  private readonly global = inject(GlobalData);

  transform(name: IconName | string): string {
    const theme = this.global.theme();
    return `/image/${name}-${theme}.svg`;
  }
}
