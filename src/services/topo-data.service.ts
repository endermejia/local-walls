import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import {
  AmountByEveryGrade,
  ClimbingKind,
  CragDetail,
  CragListItem,
  CragWithJoins,
  RouteAscentDto,
  RouteWithExtras,
  TopoDetail,
  TopoListItem,
  TopoPath,
  TopoRouteWithRoute,
  VERTICAL_LIFE_GRADES,
} from '../models';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import { mapCragToDetail } from '../utils';

@Injectable({ providedIn: 'root' })
export class TopoDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);

  selectedAreaSlug: WritableSignal<string | null> = signal(null);
  selectedCragSlug: WritableSignal<string | null> = signal(null);
  selectedTopoId: WritableSignal<string | null> = signal(null);
  selectedCenterSlug: WritableSignal<string | null> = signal(null);
  selectedRouteSlug: WritableSignal<string | null> = signal(null);

  /** List of sectors/crags for the selected area. */
  readonly cragsListResource = resource({
    params: () => this.selectedAreaSlug(),
    loader: async ({ params: areaSlug }) => {
      if (!areaSlug) return [];
      if (!isPlatformBrowser(this.platformId)) {
        return [] as CragListItem[];
      }
      const cacheKey = `cached_crags_list_${areaSlug}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const { data, error } = await this.supabase.client
            .rpc('get_crags_list')
            .eq('area_slug', areaSlug);

          if (error) {
            throw error;
          }
          return (
            (data?.map((c) => ({
              ...c,
              grades: c.grades as unknown as AmountByEveryGrade,
              topos: c.topos as unknown as {
                id: number;
                name: string;
                slug: string;
              }[],
            })) as CragListItem[]) ?? []
          );
        },
        { fallbackValue: [], logTag: 'TopoDataService' },
      );
    },
  });

  readonly cragsList: Signal<CragListItem[]> = computed(() => {
    const val = this.cragsListResource.value();
    if (val !== undefined) return val;
    const areaSlug = this.selectedAreaSlug();
    if (!areaSlug) return [];
    return this.cache.get<CragListItem[]>(
      `cached_crags_list_${areaSlug}_v2`,
      [],
    );
  });

  readonly areaToposResource = resource({
    params: () => ({
      areaSlug: this.selectedAreaSlug(),
      centerSlug: this.selectedCenterSlug(),
    }),
    loader: async ({
      params,
    }): Promise<(TopoListItem & { crag_slug: string })[]> => {
      const { areaSlug, centerSlug } = params;
      if (!isPlatformBrowser(this.platformId)) return [];

      if (centerSlug) {
        try {
          await this.supabase.whenReady();
          const { data: center } = await this.supabase.client
            .from('indoor_centers')
            .select('id')
            .eq('slug', centerSlug)
            .single();
          if (!center) return [];

          const { data, error } = await this.supabase.client
            .from('indoor_topos')
            .select('*, indoor_topo_routes ( route:indoor_routes ( grade ) )')
            .eq('center_id', center.id);

          if (error) throw error;

          return (data || []).map((t) => {
            const grades: Record<number, number> = {};
            const topoRoutes = t.indoor_topo_routes || [];
            for (const tr of topoRoutes) {
              const grade = tr.route?.grade;
              if (grade !== undefined && grade !== null) {
                grades[grade] = (grades[grade] || 0) + 1;
              }
            }
            return {
              id: t.id as unknown as number,
              name: t.name,
              slug: t.id,
              crag_slug: '',
              photo: t.image_url,
              grades,
              shade_afternoon: false,
              shade_change_hour: null,
              shade_morning: false,
            };
          }) as (TopoListItem & { crag_slug: string })[];
        } catch {
          return [];
        }
      }

      if (!areaSlug) return [];
      const cacheKey = `cached_area_topos_${areaSlug}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const { data, error } = await this.supabase.client
            .from('topos')
            .select(
              '*, crags!inner(slug, areas!inner(slug)), topo_routes(route_id, route:routes(grade))',
            )
            .eq('crags.areas.slug', areaSlug);

          if (error) {
            throw error;
          }

          return (data || []).map((t) => {
            const grades: AmountByEveryGrade = {};
            (t.topo_routes || []).forEach((tr) => {
              const g = tr.route?.grade;
              if (g != null && g >= 0) {
                grades[g as VERTICAL_LIFE_GRADES] =
                  (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
              }
            });

            return {
              id: t.id,
              name: t.name,
              slug: t.slug,
              crag_slug: t.crags?.slug || '',
              grades,
              photo: t.photo,
              shade_morning: t.shade_morning,
              shade_afternoon: t.shade_afternoon,
              shade_change_hour: t.shade_change_hour,
              route_ids: (t.topo_routes || []).map(
                (tr: { route_id: number }) => tr.route_id,
              ),
            };
          });
        },
        { fallbackValue: [], logTag: 'TopoDataService' },
      );
    },
  });

  readonly areaTopos = computed(() => {
    const val = this.areaToposResource.value();
    if (val !== undefined)
      return val as (TopoListItem & { crag_slug: string })[];
    return this.cache.get<(TopoListItem & { crag_slug: string })[]>(
      `cached_area_topos_${this.selectedAreaSlug()}_v2`,
      [],
    );
  });

  readonly topoDetailResource = resource({
    params: () => this.selectedTopoId(),
    loader: async ({ params: id }): Promise<TopoDetail | null> => {
      if (!id) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      const cacheKey = `cached_topo_detail_${id}_v1`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const userId = this.supabase.authUser()?.id;
          const isIndoor = isNaN(Number(id));

          if (isIndoor) {
            return this.fetchIndoorTopo(id, userId);
          }

          return this.fetchOutdoorTopo(Number(id), userId);
        },
        { fallbackValue: null, logTag: 'TopoDataService' },
      );
    },
  });

  readonly topoDetail = computed(() => {
    const val = this.topoDetailResource.value();
    if (val !== undefined) return val as TopoDetail | null;
    return this.cache.get<TopoDetail | null>(
      `cached_topo_detail_${this.selectedTopoId()}_v1`,
      null,
    );
  });

  readonly cragDetailResource = resource({
    params: () => ({
      cragSlug: this.selectedCragSlug(),
      areaSlug: this.selectedAreaSlug(),
    }),
    loader: async ({
      params: { cragSlug, areaSlug },
    }): Promise<CragDetail | null> => {
      if (!cragSlug || !areaSlug) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      const cacheKey = `cached_crag_detail_${areaSlug}_${cragSlug}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const userId = this.supabase.authUser()?.id;
          let query = this.supabase.client
            .from('crags')
            .select(
              `
              *,
              eight_anu_sector_slugs,
              liked:crag_likes(id),
              area: areas!inner (
                id, name, slug, eight_anu_crag_slugs,
                is_public, price, stripe_account_id,
                purchased:area_purchases(id)
              ),
              crag_parkings (
                parking: parkings (*)
              ),
               topos (
                 *,
                 topo_routes (
                   route_id,
                   route: routes (
                     grade
                   )
                 )
               )
            `,
            )
            .eq('slug', cragSlug)
            .eq('area.slug', areaSlug);

          if (userId) {
            query = query.eq('liked.user_id', userId);
          }

          const { data, error } = await query.single();

          if (error) {
            throw error;
          }

          return mapCragToDetail(data as CragWithJoins);
        },
        { fallbackValue: null, logTag: 'TopoDataService' },
      );
    },
  });

  readonly cragDetail = computed(() => {
    const val = this.cragDetailResource.value();
    if (val !== undefined) return val as CragDetail | null;
    return this.cache.get<CragDetail | null>(
      `cached_crag_detail_${this.selectedAreaSlug()}_${this.selectedCragSlug()}_v2`,
      null,
    );
  });

  readonly routeDetailResource = resource({
    params: () => ({
      cragId: this.cragDetail()?.id,
      routeSlug: this.selectedRouteSlug(),
    }),
    loader: async ({
      params: { cragId, routeSlug },
    }): Promise<RouteWithExtras | null> => {
      if (!cragId || !routeSlug) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      const cacheKey = `cached_route_detail_${routeSlug}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const userId = this.supabase.authUser()?.id;
          let query = this.supabase.client
            .from('routes')
            .select(
              `
              *,
              liked:route_likes(id),
              project:route_projects(id),
              crag:crags(
                id,
                name,
                slug,
                area:areas(id, name, slug)
              ),
              ascents:route_ascents(rate, type),
              own_ascent:route_ascents(*),
              topo_routes(topo:topos(id, name, slug))
            `,
            )
            .eq('crag_id', cragId)
            .eq('slug', routeSlug);

          if (userId) {
            query = query
              .eq('own_ascent.user_id', userId)
              .eq('project.user_id', userId)
              .eq('liked.user_id', userId);
          }

          const { data, error } = await query.single();

          if (error) {
            throw error;
          }

          const r = data;
          const rates =
            r.ascents
              ?.map((a) => a.rate)
              .filter((rate): rate is number => rate != null) ?? [];
          const rating =
            rates.length > 0
              ? rates.reduce((a, b) => a + b, 0) / rates.length
              : 0;

          return {
            ...r,
            liked: (r.liked?.length ?? 0) > 0,
            project: (r.project?.length ?? 0) > 0,
            crag_name: r.crag?.name,
            crag_slug: r.crag?.slug,
            area_id: r.crag?.area?.id,
            area_name: r.crag?.area?.name,
            area_slug: r.crag?.area?.slug,
            rating,
            ascent_count:
              r.ascents?.filter(
                (a: Partial<RouteAscentDto>) => a.type !== 'attempt',
              ).length ?? 0,
            climbed:
              (r.own_ascent?.filter((a) => a.type !== 'attempt').length ?? 0) >
              0,
            own_ascent: r.own_ascent?.sort((a, b) => {
              const isAttemptA = a.type === 'attempt';
              const isAttemptB = b.type === 'attempt';
              if (isAttemptA && !isAttemptB) return 1;
              if (!isAttemptA && isAttemptB) return -1;
              return 0;
            })[0],
            topos:
              r.topo_routes
                ?.map((tr: { topo: unknown }) => tr.topo)
                .filter((t: unknown) => !!t) || [],
            key: `${cragId}:${routeSlug}`,
          } as RouteWithExtras & { area_id?: number; key: string };
        },
        { fallbackValue: null, logTag: 'TopoDataService' },
      );
    },
  });

  readonly routeDetail = computed(() => {
    const val = this.routeDetailResource.value();
    if (val !== undefined) return val as RouteWithExtras | null;
    return this.cache.get<RouteWithExtras | null>(
      `cached_route_detail_${this.selectedRouteSlug()}_v2`,
      null,
    );
  });

  readonly routeAscentsResource = resource({
    params: () => ({
      routeId: this.routeDetail()?.id,
    }),
    loader: async ({
      params,
    }): Promise<{ items: RouteAscentDto[]; total: number }> => {
      const { routeId } = params;
      if (!routeId) return { items: [], total: 0 };
      if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };
      try {
        await this.supabase.whenReady();

        const { data, error, count } = await this.supabase.client
          .from('route_ascents')
          .select('*', { count: 'exact' })
          .eq('route_id', routeId)
          .neq('type', 'attempt')
          .order('date', { ascending: false })
          .order('id', { ascending: false });

        if (error) {
          return { items: [], total: 0 };
        }

        return { items: data ?? [], total: count ?? 0 };
      } catch {
        return { items: [], total: 0 };
      }
    },
  });

  resetSelection(): void {
    this.selectedCragSlug.set(null);
    this.selectedRouteSlug.set(null);
    this.selectedTopoId.set(null);
  }

  private async fetchIndoorTopo(
    id: string,
    userId: string | undefined,
  ): Promise<TopoDetail> {
    const { data: topo, error: topoErr } = await this.supabase.client
      .from('indoor_topos')
      .select(
        `
        *,
        center: indoor_centers!inner (
          id, name, slug
        )
      `,
      )
      .eq('id', id)
      .single();
    if (topoErr) throw topoErr;

    const { data: trs, error: trsErr } = await this.supabase.client
      .from('indoor_topo_routes')
      .select(
        `
        *,
        route: indoor_routes!inner (
          id, name, slug, grade, climbing_kind, color,
          own_ascent: indoor_ascents!left (*)
        )
      `,
      )
      .eq('topo_id', id)
      .eq('route.own_ascent.user_id', userId ?? '')
      .order('number', { ascending: true });

    if (trsErr) throw trsErr;

    const topo_routes: TopoRouteWithRoute[] = [];
    const seenRouteIds = new Set<string>();

    if (trs) {
      for (const tr of trs) {
        if (!seenRouteIds.has(tr.route_id)) {
          seenRouteIds.add(tr.route_id);

          const ascents = (tr.route.own_ascent ||
            []) as unknown as RouteAscentDto[];
          ascents.sort((a, b) => {
            const isAttemptA = a.type === 'attempt';
            const isAttemptB = b.type === 'attempt';
            if (isAttemptA && !isAttemptB) return 1;
            if (!isAttemptA && isAttemptB) return -1;
            return (
              new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
          });
          const bestAscent = ascents[0] || null;

          topo_routes.push({
            topo_id: tr.topo_id,
            route_id: tr.route_id,
            number: tr.number ?? 0,
            path: tr.path as TopoPath | null,
            route: {
              id: tr.route.id,
              name: tr.route.name,
              slug: tr.route.slug,
              grade: tr.route.grade ?? 0,
              climbing_kind: (tr.route.climbing_kind ??
                'sport') as ClimbingKind,
              own_ascent: bestAscent,
              project: false,
            },
          });
        }
      }
    }

    return {
      id: topo.id,
      name: topo.name,
      photo: topo.image_url,
      crag_id: 0,
      created_at: '',
      slug: '',
      shade_afternoon: false,
      shade_change_hour: null,
      shade_morning: false,
      legacy: topo.legacy,
      center_id: topo.center_id,
      topo_routes,
      crag: topo.center
        ? {
            id: 0,
            name: topo.center.name,
            slug: topo.center.slug,
            area_id: 0,
            user_creator_id: null,
            area: {
              id: 0,
              name: '',
              slug: '',
              is_public: true,
              price: 0,
              purchased: true,
            },
          }
        : undefined,
    };
  }

  private async fetchOutdoorTopo(
    id: number,
    userId: string | undefined,
  ): Promise<TopoDetail> {
    const { data, error } = await this.supabase.client
      .from('topos')
      .select(
        `
        *,
        crag: crags!inner (
          id, name, slug, area_id, user_creator_id,
          area: areas!inner (
            id, name, slug, is_public, price, purchased:area_purchases(id)
          )
        ),
        topo_routes (
          *,
          route: routes (
            id, name, slug, grade, height, climbing_kind,
            own_ascent: route_ascents!left (*),
            project: route_projects!left (id)
          )
        )
      `,
      )
      .eq('id', id)
      .eq('topo_routes.route.own_ascent.user_id', userId ?? '')
      .eq('topo_routes.route.project.user_id', userId ?? '')
      .order('number', {
        referencedTable: 'topo_routes',
        ascending: true,
      })
      .single();

    if (error) {
      throw error;
    }

    const topo_routes: TopoRouteWithRoute[] = [];
    const seenRouteIds = new Set<number>();

    if (data.topo_routes) {
      for (const tr of data.topo_routes) {
        if (!seenRouteIds.has(tr.route_id)) {
          seenRouteIds.add(tr.route_id);

          const ascents = tr.route.own_ascent || [];
          const bestAscent =
            ascents.sort((a, b) => {
              const isAttemptA = a.type === 'attempt';
              const isAttemptB = b.type === 'attempt';
              if (isAttemptA && !isAttemptB) return 1;
              if (!isAttemptA && isAttemptB) return -1;
              return 0;
            })[0] || null;

          topo_routes.push({
            topo_id: tr.topo_id,
            route_id: tr.route_id,
            number: tr.number,
            path: tr.path as TopoPath,
            route: {
              ...tr.route,
              own_ascent: bestAscent,
              project: !!tr.route.project?.[0],
            },
          });
        }
      }
    }

    return {
      ...data,
      topo_routes,
      crag: data.crag
        ? {
            ...data.crag,
            area: {
              ...data.crag.area,
              purchased: (data.crag.area.purchased?.length ?? 0) > 0,
            },
          }
        : undefined,
    } as unknown as TopoDetail;
  }
}
