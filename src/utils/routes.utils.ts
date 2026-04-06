import { tuiDefaultSort } from '@taiga-ui/cdk';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import {
  RouteWithExtras,
  RoutesTableRow,
  GRADE_NUMBER_TO_LABEL,
  PROJECT_GRADE_LABEL,
  VERTICAL_LIFE_GRADES,
  RouteDto
} from '../models';
import { normalizeName } from './index';

export function mapRouteToTableRow(r: RouteWithExtras): RoutesTableRow {
  const grade =
    GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES] ??
    PROJECT_GRADE_LABEL;

  const rating = r.rating || 0;
  const ascents = r.ascent_count || 0;

  return {
    key: r.id.toString(),
    grade,
    route: r.name,
    area_name: r.area_name,
    crag_name: r.crag_name,
    area_slug: r.area_slug,
    crag_slug: r.crag_slug,
    height: r.height || null,
    rating,
    ascents,
    liked: r.liked,
    project: r.project,
    climbed: r.climbed ?? false,
    link: ['/area', r.area_slug || 'unknown', r.crag_slug || 'unknown', r.slug],
    topos: (r.topos || []).sort((a, b) =>
      tuiDefaultSort(normalizeName(a.name), normalizeName(b.name)),
    ),
    _ref: r,
  };
}

export const ROUTE_TABLE_SORTERS: Record<
  string,
  TuiComparator<RoutesTableRow>
> = {
  grade: (a, b) => tuiDefaultSort(a._ref.grade, b._ref.grade),
  route: (a, b) => tuiDefaultSort(a.route, b.route),
  height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height ?? 0),
  rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
  ascents: (a, b) => tuiDefaultSort(a.ascents, b.ascents),
  topo: (a, b) => {
    const aVal = a.topos.map((t) => normalizeName(t.name)).join(', ');
    const bVal = b.topos.map((t) => normalizeName(t.name)).join(', ');
    return tuiDefaultSort(aVal, bVal) || tuiDefaultSort(a.route, b.route);
  },
};

export function sortRoutesByGrade<T extends Partial<RouteDto>>(routes: T[]): T[] {
  return [...routes].sort((a, b) => {
    const gradeA = typeof a.grade === 'number' ? a.grade : 0;
    const gradeB = typeof b.grade === 'number' ? b.grade : 0;

    // Sort descending by grade, then fallback to name
    if (gradeA !== gradeB) {
      return gradeB - gradeA;
    }

    return tuiDefaultSort(normalizeName(a.name || ''), normalizeName(b.name || ''));
  });
}
