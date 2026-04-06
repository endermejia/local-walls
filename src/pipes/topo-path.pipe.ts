import { Pipe, PipeTransform } from '@angular/core';
import { hasPath as hasPathUtil } from '../utils/topo-styles.utils';

export interface Point {
  x: number;
  y: number;
}

@Pipe({
  name: 'topoPathPoints',
  standalone: true,
  pure: true,
})
export class TopoPathPointsPipe implements PipeTransform {
  transform(path: string | undefined): Point[] {
    if (!path) return [];

    return path
      .trim()
      .split(/\s+/)
      .map((pointStr) => {
        const [xStr, yStr] = pointStr.split(',');
        return { x: parseFloat(xStr), y: parseFloat(yStr) };
      })
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
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
