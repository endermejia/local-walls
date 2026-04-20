import { Pipe, PipeTransform } from '@angular/core';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import { TopoRouteWithRoute } from '../models';

export interface TopoRouteRow {
  index: number;
  name: string;
  grade: number;
  height: number | null;
  slug: string;
  link: string[];
  climbed: boolean;
  project: boolean;
  _ref: TopoRouteWithRoute;
}

export const TOPO_ROUTE_SORTERS: Record<string, TuiComparator<TopoRouteRow>> = {
  index: (a, b) => tuiDefaultSort(a.index, b.index),
  name: (a, b) => tuiDefaultSort(a.name, b.name),
  grade: (a, b) => tuiDefaultSort(a.grade, b.grade),
  height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height ?? 0),
};

@Pipe({
  name: 'tableSorter',
  standalone: true,
})
export class TableSorterPipe implements PipeTransform {
  transform(col: string): TuiComparator<TopoRouteRow> | null {
    if (col === 'actions' || col === 'admin_actions') return null;
    return TOPO_ROUTE_SORTERS[col] ?? null;
  }
}
