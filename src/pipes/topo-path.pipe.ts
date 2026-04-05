import { Pipe, PipeTransform } from '@angular/core';
import { hasPath as hasPathUtil } from '../utils/topo-styles.utils';

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
