import { tuiDefaultSort } from '@taiga-ui/cdk';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import {
  RouteWithExtras,
  RoutesTableRow,
  GRADE_NUMBER_TO_LABEL,
  PROJECT_GRADE_LABEL,
  VERTICAL_LIFE_GRADES,
  RouteDto,
  IndoorRouteWithExtras,
  INDOOR_ROUTE_COLORS,
} from '../models';

import { normalizeName } from './index';

export function mapRouteToTableRow(
  r: RouteWithExtras | IndoorRouteWithExtras,
): RoutesTableRow {
  const isIndoor = typeof r.id === 'string';

  if (isIndoor) {
    const indoor = r as IndoorRouteWithExtras;
    const rating = indoor.rating || 0;
    const ascents = indoor.ascent_count || 0;

    return {
      id: indoor.id,
      key: indoor.id,
      grade: indoor.grade?.toString() || '0',
      gradeValue: indoor.grade || 0,
      climbing_kind: indoor.climbing_kind || null,
      route: indoor.name || '',
      height: null,
      color: indoor.color || null,
      legacy: indoor.legacy || false,
      rating,
      ascents,
      liked: false,
      project: false,
      climbed: !!indoor.own_ascent,
      link: [
        '/indoor',
        indoor.center_slug || 'unknown',
        'route',
        indoor.slug || '',
      ],
      topos: (indoor.topos || []).map((t) => ({
        id: t.id,
        name: t.name,
        legacy: t.legacy,
        link: ['/indoor', indoor.center_slug || 'unknown', 'topo', t.id],
      })),
      equippers: indoor.equippers || [],
      own_ascent: indoor.own_ascent || null,
      isIndoor: true,
      _ref: r,
    canEdit: false,
    canDelete: false,
  };
  } else {
    const outdoor = r as RouteWithExtras;
    const grade =
      GRADE_NUMBER_TO_LABEL[outdoor.grade as VERTICAL_LIFE_GRADES] ??
      PROJECT_GRADE_LABEL;
    const rating = outdoor.rating || 0;
    const ascents = outdoor.ascent_count || 0;

    return {
      id: outdoor.id,
      key: outdoor.id.toString(),
      grade,
      gradeValue:
        typeof outdoor.grade === 'number'
          ? outdoor.grade
          : parseInt(outdoor.grade as string, 10) || 0,
      climbing_kind: outdoor.climbing_kind || null,
      route: outdoor.name,
      area_name: outdoor.area_name,
      crag_name: outdoor.crag_name,
      area_slug: outdoor.area_slug,
      crag_slug: outdoor.crag_slug,
      height: outdoor.height || null,
      color: null,
      rating,
      ascents,
      liked: outdoor.liked,
      project: outdoor.project,
      climbed: outdoor.climbed ?? false,
      link: [
        '/area',
        outdoor.area_slug || 'unknown',
        outdoor.crag_slug || 'unknown',
        outdoor.slug,
      ],
      topos: (outdoor.topos || [])
        .map((t) => ({
          id: t.id,
          name: t.name,
          link: [
            '/area',
            outdoor.area_slug || 'unknown',
            outdoor.crag_slug || 'unknown',
            'topo',
            t.id.toString(),
          ],
        }))
        .sort((a, b) =>
          tuiDefaultSort(normalizeName(a.name), normalizeName(b.name)),
        ),
      equippers: outdoor.equippers || [],
      own_ascent: outdoor.own_ascent || null,
      isIndoor: false,
      _ref: r,
    canEdit: false,
    canDelete: false,
  };
  }
}

export const ROUTE_TABLE_SORTERS: Record<
  string,
  TuiComparator<RoutesTableRow>
> = {
  grade: (a, b) => tuiDefaultSort(a.gradeValue, b.gradeValue),
  route: (a, b) => tuiDefaultSort(a.route, b.route),
  height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height ?? 0),
  rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
  ascents: (a, b) => tuiDefaultSort(a.ascents, b.ascents),
  topo: (a, b) => {
    const aVal = a.topos.map((t) => normalizeName(t.name)).join(', ');
    const bVal = b.topos.map((t) => normalizeName(t.name)).join(', ');
    return tuiDefaultSort(aVal, bVal) || tuiDefaultSort(a.route, b.route);
  },
  color: (a, b) => {
    const aName = a.color ? INDOOR_ROUTE_COLORS[a.color] || '' : '';
    const bName = b.color ? INDOOR_ROUTE_COLORS[b.color] || '' : '';
    return tuiDefaultSort(aName, bName);
  },
};

export function sortRoutesByGrade<T extends Partial<RouteDto>>(
  routes: T[],
): T[] {
  return [...routes].sort((a, b) => {
    const gradeA = typeof a.grade === 'number' ? a.grade : 0;
    const gradeB = typeof b.grade === 'number' ? b.grade : 0;

    // Sort descending by grade, then fallback to name
    if (gradeA !== gradeB) {
      return gradeB - gradeA;
    }

    return tuiDefaultSort(
      normalizeName(a.name || ''),
      normalizeName(b.name || ''),
    );
  });
}
