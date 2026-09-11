import { Pipe, PipeTransform } from '@angular/core';

import { PointState, TopoPoint } from '../models';

import {
  getPointStateBadge as getPointStateBadgeUtil,
  getPointStateColor as getPointStateColorUtil,
  getPointStateLabel as getPointStateLabelUtil,
  hasPath as hasPathUtil,
} from '../utils';

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
    routeId: string | number,
    pathsMap: Map<
      string | number,
      { points: TopoPoint[] | { x: number; y: number }[] }
    >,
    _version?: number,
  ): boolean {
    return hasPathUtil(routeId, pathsMap);
  }
}

@Pipe({
  name: 'topoPointStateColor',
  standalone: true,
  pure: true,
})
export class TopoPointStateColorPipe implements PipeTransform {
  transform(state: PointState | undefined, defaultColor?: string): string {
    return getPointStateColorUtil(state, defaultColor);
  }
}

@Pipe({
  name: 'topoPointStateBadge',
  standalone: true,
  pure: true,
})
export class TopoPointStateBadgePipe implements PipeTransform {
  transform(state: PointState | undefined): string {
    return getPointStateBadgeUtil(state);
  }
}

@Pipe({
  name: 'topoPointStateLabel',
  standalone: true,
  pure: true,
})
export class TopoPointStateLabelPipe implements PipeTransform {
  transform(state: PointState | undefined): string {
    return getPointStateLabelUtil(state);
  }
}

@Pipe({
  name: 'topoIsTraverse',
  standalone: true,
  pure: true,
})
export class TopoIsTraversePipe implements PipeTransform {
  transform(
    routeId: string | number,
    pathsMap: Map<
      string | number,
      { isTraverse?: boolean; [key: string]: unknown }
    >,
    _version?: number,
  ): boolean {
    return !!pathsMap.get(routeId)?.isTraverse;
  }
}

@Pipe({
  name: 'topoIsRouteVisible',
  standalone: true,
  pure: true,
})
export class TopoIsRouteVisiblePipe implements PipeTransform {
  transform(
    routeId: string | number,
    hiddenRouteIds:
      Set<string | number> | (string | number)[] | null | undefined,
  ): boolean {
    if (!hiddenRouteIds) return true;
    if (hiddenRouteIds instanceof Set) {
      return !hiddenRouteIds.has(routeId);
    }
    return !hiddenRouteIds.includes(routeId);
  }
}
