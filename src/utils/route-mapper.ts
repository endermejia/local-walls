import {
  AscentType,
  AscentTypes,
  EquipperDto,
  RouteAscentDto,
  RouteWithExtras,
} from '../models';

/**
 * Raw route data shape from Supabase queries with common joins.
 */
export interface RawRouteData {
  id?: number;
  name?: string;
  slug?: string;
  grade?: number;
  climbing_kind?: string;
  height?: number;
  crag_id?: number;
  created_at?: string;
  user_creator_id?: string;
  eight_anu_route_slugs?: string[];
  search_text?: string;
  liked?: { id: number }[];
  project?: { id: number }[];
  ascents?: { rate: number | null; type: AscentType }[];
  own_ascent?: RouteAscentDto[];
  crag?: {
    id?: number;
    name?: string;
    slug?: string;
    area_id?: number;
    area?: {
      id?: number;
      name?: string;
      slug?: string;
    } | null;
  } | null;
  route_equippers?: { equipper: EquipperDto }[];
  topo_routes?: { topo: { id: number; name: string; slug: string } }[];
}

export interface RouteMapperOptions {
  /** Value to use for rating when no ascents have rates. Default: 0 */
  ratingFallback?: number | null;
  /** Source for area_id when crag is nested. Default: 'crag.area.id' */
  areaIdSource?: 'crag.area.id' | 'crag.area_id';
  /** Source for area_slug when crag is nested. Default: 'crag.area.slug' */
  areaSlugSource?: 'crag.area.slug' | 'crag.areas?.slug';
  /** Source for area_name when crag is nested. Default: 'crag.area.name' */
  areaNameSource?: 'crag.area.name' | 'crags?.areas?.name';
  /** Whether to include equippers mapping. Default: false */
  includeEquippers?: boolean;
  /** Whether to include topos mapping. Default: false */
  includeTopos?: boolean;
  /** Whether to filter topos (for paywall). Default: false */
  filterTopos?: boolean;
}

const DEFAULT_OPTIONS: RouteMapperOptions = {
  ratingFallback: 0,
  areaIdSource: 'crag.area.id',
  areaSlugSource: 'crag.area.slug',
  areaNameSource: 'crag.area.name',
  includeEquippers: false,
  includeTopos: false,
  filterTopos: false,
};

/**
 * Maps raw Supabase route data to RouteWithExtras.
 * Shared across all resources that return routes.
 */
export function mapRouteToExtras(
  raw: RawRouteData,
  options: RouteMapperOptions = {},
): RouteWithExtras {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Compute rating from ascents
  const rates =
    raw.ascents
      ?.map((a) => a.rate)
      .filter((rate): rate is number => rate != null) ?? [];
  const rating =
    rates.length > 0
      ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length
      : (opts.ratingFallback ?? 0);

  // Extract crag/area fields based on source options
  const areaId = getAreaField(raw, opts.areaIdSource!);
  const areaSlug = getAreaField(raw, opts.areaSlugSource!);
  const areaName = getAreaField(raw, opts.areaNameSource!);

  // Compute climbed and own_ascent
  const ownAscents = raw.own_ascent ?? [];
  const sortedOwnAscent = [...ownAscents].sort((a, b) => {
    const isAttemptA = a.type === AscentTypes.ATTEMPT;
    const isAttemptB = b.type === AscentTypes.ATTEMPT;
    if (isAttemptA && !isAttemptB) return 1;
    if (!isAttemptA && isAttemptB) return -1;
    return 0;
  })[0];

  const climbed =
    ownAscents.filter((a) => a.type !== AscentTypes.ATTEMPT).length > 0;

  // Map equippers if requested
  const equippers = opts.includeEquippers
    ? (raw.route_equippers ?? [])
        .map((re) => re.equipper)
        .filter((e): e is EquipperDto => !!e)
    : undefined;

  // Map topos if requested
  const topos = opts.includeTopos
    ? opts.filterTopos
      ? []
      : (raw.topo_routes ?? [])
          .map((tr) => tr.topo)
          .filter((t): t is { id: number; name: string; slug: string } => !!t)
    : undefined;

  const result: Record<string, unknown> = {
    ...raw,
    liked: (raw.liked?.length ?? 0) > 0,
    project: (raw.project?.length ?? 0) > 0,
    crag_name: raw.crag?.name,
    crag_slug: raw.crag?.slug,
    area_id: areaId,
    area_name: areaName,
    area_slug: areaSlug,
    rating,
    ascent_count:
      raw.ascents?.filter((a) => a.type !== AscentTypes.ATTEMPT).length ?? 0,
    climbed,
    own_ascent: sortedOwnAscent,
  };

  if (equippers !== undefined) {
    result['equippers'] = equippers;
  }
  if (topos !== undefined) {
    result['topos'] = topos;
  }

  return result as unknown as RouteWithExtras;
}

function getAreaField(raw: RawRouteData, source: string): unknown {
  switch (source) {
    case 'crag.area.id':
      return raw.crag?.area && 'id' in raw.crag.area
        ? (raw.crag.area as { id?: number }).id
        : undefined;
    case 'crag.area_id':
      return raw.crag?.area_id;
    case 'crag.area.slug':
      return raw.crag?.area && 'slug' in raw.crag.area
        ? (raw.crag.area as { slug?: string }).slug
        : undefined;
    case 'crag.areas?.slug':
      return (raw.crag as Record<string, unknown>)?.['areas'] &&
        typeof (raw.crag as Record<string, unknown>)['areas'] === 'object'
        ? (raw.crag as Record<string, { slug?: string }>)['areas']?.slug
        : undefined;
    case 'crag.area.name':
      return raw.crag?.area && 'name' in raw.crag.area
        ? (raw.crag.area as { name?: string }).name
        : undefined;
    case 'crags?.areas?.name':
      return (raw.crag as Record<string, unknown>)?.['areas'] &&
        typeof (raw.crag as Record<string, unknown>)['areas'] === 'object'
        ? (raw.crag as Record<string, { name?: string }>)['areas']?.name
        : undefined;
    default:
      return undefined;
  }
}

/**
 * Maps route data nested within ascent records (profile ascents table).
 * This has a different crag join alias ('crags' instead of 'crag').
 */
export function mapAscentRouteToExtras(
  route: Record<string, unknown>,
): RouteWithExtras | undefined {
  if (!route) return undefined;

  const liked = route['liked'] as { id: number }[] | undefined;
  const project = route['project'] as { id: number }[] | undefined;
  const ascents = (route['ascents'] ?? []) as {
    rate: number | null;
    type: AscentType;
  }[];
  const crag = route['crags'] as
    | {
        area_id?: number;
        slug?: string;
        name?: string;
        areas?: { slug?: string; name?: string };
      }
    | undefined;

  const rates = ascents
    .map((a) => a.rate)
    .filter((rate): rate is number => rate != null);
  const rating =
    rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

  return {
    ...route,
    liked: (liked?.length ?? 0) > 0,
    project: (project?.length ?? 0) > 0,
    crag_id: route['crag_id'],
    created_at: route['created_at'],
    eight_anu_route_slugs: route['eight_anu_route_slugs'],
    height: route['height'],
    user_creator_id: route['user_creator_id'],
    area_id: crag?.area_id,
    crag_slug: crag?.slug,
    crag_name: crag?.name,
    area_slug: crag?.areas?.slug,
    area_name: crag?.areas?.name,
    rating,
    ascent_count:
      ascents.filter((a) => a.type !== AscentTypes.ATTEMPT).length ?? 0,
  } as RouteWithExtras;
}
