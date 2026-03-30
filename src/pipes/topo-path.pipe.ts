import { Pipe, PipeTransform } from '@angular/core';
import {
  getPointsString as getPointsStringUtil,
  hasPath as hasPathUtil,
} from '../utils/topo-styles.utils';

@Pipe({
  name: 'topoPathPoints',
  standalone: true,
  pure: true,
})
export class TopoPathPointsPipe implements PipeTransform {
  transform(points: { x: number; y: number }[], zoomScale = 1): string {
    return getPointsStringUtil(points, zoomScale, zoomScale);
  }
}

@Pipe({
  name: 'topoHasPath',
  standalone: true,
  pure: true,
})
export class TopoHasPathPipe implements PipeTransform {
  transform(
    routeId: number,
    pathsMap: Map<number, { points: { x: number; y: number }[] }>,
  ): boolean {
    return hasPathUtil(routeId, pathsMap);
  }
}
