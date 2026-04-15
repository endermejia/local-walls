import { Pipe, PipeTransform } from '@angular/core';

import { getPointsString as getPointsStringUtil } from '../utils/topo-styles.utils';

@Pipe({
  name: 'pointsToSvg',
  standalone: true,
  pure: true,
})
export class PointsToSvgPipe implements PipeTransform {
  transform(
    path: { points: { x: number; y: number }[] } | undefined,
    scaleX = 1,
    scaleY = 1,
  ): string {
    if (!path || !path.points) return '';
    return getPointsStringUtil(path.points, scaleX, scaleY);
  }
}
