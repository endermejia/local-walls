const fs = require('fs');

// We have the commit `d01ce37` checked out, which is before the `routes-table` refactoring started.
// Let's just create `routes-table.ts`, `indoor-routes-table.ts`, `outdoor-routes-table.ts`, `route.model.ts`, `routes.utils.ts` and the pages properly.
// The easiest is to just write the new file contents directly!

fs.writeFileSync('src/models/route.model.ts', `import { EquipperDto, RouteAscentDto, RouteDto } from './supabase-interfaces';
import { IndoorRouteWithExtras } from './indoor.model';
import { AscentType } from './app-enums.model';

export interface RouteBasicDto extends Pick<
  RouteDto,
  'id' | 'name' | 'slug' | 'grade' | 'climbing_kind'
> {
  height?: number | null;
}

export interface RouteBasicWithOwnData extends RouteBasicDto {
  own_ascent?: RouteAscentDto | null;
  project?: boolean;
}

export interface RouteWithExtras extends RouteDto {
  liked: boolean;
  project: boolean;
  crag_slug?: string;
  crag_name?: string;
  area_id?: number;
  area_slug?: string;
  area_name?: string;
  rating?: number;
  ascent_count?: number;
  climbed?: boolean;
  own_ascent?: RouteAscentDto | null;
  topos?: { id: number; name: string; slug: string }[];
  equippers?: EquipperDto[];
}

export type RouteItem = RouteWithExtras;

export type RoutesTableKey =
  | 'grade'
  | 'route'
  | 'topo'
  | 'height'
  | 'rating'
  | 'ascents'
  | 'actions'
  | 'equippers'
  | 'admin_actions'
  | 'expand'
  | 'color';

export interface RoutesTableRow {
  id: string | number;
  key: string;
  grade: string;
  gradeValue: number;
  climbing_kind: RouteDto['climbing_kind'] | null;
  route: string;
  area_name?: string;
  crag_name?: string;
  area_slug?: string;
  crag_slug?: string;
  height: number | null;
  color: string | null;
  legacy?: boolean;
  rating: number;
  ascents: number;
  liked: boolean;
  project: boolean;
  climbed: boolean;
  link: string[];
  topos: {
    id: number | string;
    name: string;
    legacy?: boolean;
    link: string[];
  }[];
  equippers: EquipperDto[];
  own_ascent: { id: number | string; type: AscentType | null } | null;
  isIndoor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  _ref: RouteItem | IndoorRouteWithExtras;
}
`);


let routesUtils = fs.readFileSync('src/utils/routes.utils.ts', 'utf8');
routesUtils = routesUtils.replace(/_ref: r,\n\s*\};/g, '_ref: r,\n    canEdit: false,\n    canDelete: false,\n  };');
fs.writeFileSync('src/utils/routes.utils.ts', routesUtils);
