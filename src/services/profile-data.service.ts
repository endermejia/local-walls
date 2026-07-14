import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  AscentType,
  ClimbingKind,
  CragDto,
  PaginatedAscents,
  RouteAscentDto,
  RouteAscentWithExtras,
  RouteDto,
  RouteWithExtras,
} from '../models';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import { ORDERED_GRADE_VALUES } from '../models';
import { FilterStateService } from './filter-state.service';

@Injectable({ providedIn: 'root' })
export class ProfileDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);
  private readonly filters = inject(FilterStateService);

  profileUserId: WritableSignal<string | null> = signal(null);
  profileActiveTab: WritableSignal<number> = signal(0);

  // ---- Pagination for Ascents Table ----
  readonly ascentsPage = signal(0);
  readonly ascentsSize = signal(10);
  readonly ascentsDateFilter = signal<string | null>(null);
  readonly ascentsQuery = signal<string | null>(null);
  readonly ascentsSort = signal<'date' | 'grade'>('date');

  readonly userProjectsResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<RouteWithExtras[]> => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        const currentUserId = this.supabase.authUser()?.id;

        let query = this.supabase.client.from('route_projects').select(
          `
            route:routes (
              *,
              liked:route_likes(id),
              project:route_projects(id),
              own_ascent:route_ascents(*),
              crag:crags(
                slug,
                name,
                area_id,
                area:areas(slug, name)
              ),
              ascents:route_ascents(rate, type)
            )
          `,
        );

        if (currentUserId) {
          query = query
            .eq('route.own_ascent.user_id', currentUserId)
            .eq('route.project.user_id', currentUserId)
            .eq('route.liked.user_id', currentUserId);
        }

        const { data, error } = await query.eq('user_id', userId);

        if (error) {
          throw error;
        }

        return data
          .map((item) => {
            const r = item.route as
              | (RouteDto & {
                  liked: { id: number }[];
                  project: { id: number }[];
                  ascents: { rate: number | null; type: AscentType }[];
                  own_ascent: RouteAscentDto[];
                  crag:
                    | (CragDto & {
                        area: { slug: string; name: string } | null;
                      })
                    | null;
                })
              | null;
            if (!r) return null;
            const rates =
              r.ascents
                ?.map((a) => a.rate)
                .filter((rate): rate is number => rate != null) ?? [];
            const rating =
              rates.length > 0
                ? rates.reduce((a: number, b: number) => a + b, 0) /
                  rates.length
                : 0;

            const { crag, ascents, liked, project, own_ascent, ...rest } = r;
            return {
              ...rest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              area_id: crag?.area_id,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.area?.slug,
              area_name: crag?.area?.name,
              rating,
              ascent_count:
                ascents?.filter(
                  (a: Partial<RouteAscentDto>) => a.type !== 'attempt',
                ).length ?? 0,
              climbed:
                (own_ascent?.filter((a) => a.type !== 'attempt').length ?? 0) >
                0,
              own_ascent: own_ascent?.sort((a, b) => {
                const isAttemptA = a.type === 'attempt';
                const isAttemptB = b.type === 'attempt';
                if (isAttemptA && !isAttemptB) return 1;
                if (!isAttemptA && isAttemptB) return -1;
                return 0;
              })[0],
            } as RouteWithExtras;
          })
          .filter((r): r is RouteWithExtras => !!r);
      } catch {
        return [];
      }
    },
  });

  readonly userProjects = computed(() => {
    const val = this.userProjectsResource.value();
    if (val !== undefined) return val as RouteWithExtras[];
    return this.cache.get<RouteWithExtras[]>(
      `cached_user_projects_${this.supabase.authUserId()}_v2`,
      [],
    );
  });

  readonly firstAscentYearResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return null;
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('route_ascents')
          .select('date')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data?.date) return null;

        return new Date(data.date).getFullYear();
      } catch {
        return null;
      }
    },
  });

  readonly effectiveStartingClimbingYear = computed(() => {
    const firstAscentYear = this.firstAscentYearResource.value();
    const profileYear =
      this.supabase.userProfileResource.value()?.starting_climbing_year;

    if (firstAscentYear && profileYear) {
      return Math.min(firstAscentYear, profileYear);
    }

    return firstAscentYear || profileYear || new Date().getFullYear();
  });

  readonly userAscentsResource = resource({
    params: () => ({
      userId: this.profileUserId(),
      page: this.ascentsPage(),
      size: this.ascentsSize(),
      dateFilter: this.ascentsDateFilter(),
      query: this.ascentsQuery(),
      grades: this.filters.areaListGradeRange(),
      categories: this.filters.areaListCategories(),
      sort: this.ascentsSort(),
    }),
    loader: async ({ params }): Promise<PaginatedAscents> => {
      const {
        userId,
        page,
        size,
        dateFilter,
        query: queryText,
        grades,
        categories,
        sort,
      } = params;
      if (!userId || !isPlatformBrowser(this.platformId))
        return { items: [], total: 0 };
      try {
        await this.supabase.whenReady();
        const from = page * size;
        const to = from + size - 1;

        let query = this.supabase.client
          .from('route_ascents')
          .select(
            `
            *,
            routes!inner (
              id, name, slug, grade, climbing_kind,
              crag_id, created_at, eight_anu_route_slugs, height, user_creator_id,
              liked:route_likes(id),
              project:route_projects(id),
              ascents:route_ascents(rate, type),
              crags!inner (
                slug,
                name,
                area_id,
                areas!inner (slug, name)
              )
            )
          `,
            { count: 'exact' },
          )
          .eq('user_id', userId);

        if (queryText) {
          query = query.ilike('routes.search_text', `%${queryText}%`);
        }

        if (dateFilter) {
          if (dateFilter === 'last12') {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            query = query.gte('date', twelveMonthsAgo.toISOString());
          } else if (dateFilter !== 'all') {
            query = query
              .gte('date', `${dateFilter}-01-01`)
              .lte('date', `${dateFilter}-12-31`);
          }
        }

        const [minIdx, maxIdx] = grades;
        if (minIdx > 0 || maxIdx < ORDERED_GRADE_VALUES.length - 1) {
          const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
          const allowedDbGrades = allowedLabels
            .map((label) => {
              const map: Record<string, number> = {};
              return map[label];
            })
            .filter((g): g is number => g !== undefined);
          if (!allowedDbGrades.includes(0)) {
            allowedDbGrades.push(0);
          }
          query = query.in('grade', allowedDbGrades);
        }

        if (categories.length > 0) {
          const idxToKind: Record<number, ClimbingKind> = {
            0: 'sport',
            1: 'boulder',
            2: 'multipitch',
          };
          const allowedKinds = categories
            .map((i: number) => idxToKind[i])
            .filter((k): k is ClimbingKind => !!k);
          query = query.in('routes.climbing_kind', allowedKinds);
        }

        const currentUserId = this.supabase.authUser()?.id;
        if (currentUserId) {
          query = query
            .eq('routes.liked.user_id', currentUserId)
            .eq('routes.project.user_id', currentUserId);
        }

        let finalQuery = query;
        if (sort === 'grade') {
          finalQuery = finalQuery
            .order('grade', { ascending: false })
            .order('date', { ascending: false })
            .order('id', { ascending: false });
        } else {
          finalQuery = finalQuery
            .order('date', { ascending: false })
            .order('id', { ascending: false });
        }

        const { data, error, count } = await finalQuery.range(from, to);

        if (error) {
          throw error;
        }

        const items = data.map((a) => {
          const { routes: route, ...ascentRest } = a;
          let mappedRoute: RouteWithExtras | undefined = undefined;

          if (route) {
            const { crags: crag, liked, project, ...routeRest } = route;
            const rates =
              (
                route as RouteDto & {
                  ascents: { rate: number | null }[];
                }
              ).ascents
                ?.map((a) => a.rate)
                .filter((rate): rate is number => rate != null) ?? [];
            const rating =
              rates.length > 0
                ? rates.reduce((a: number, b: number) => a + b, 0) /
                  rates.length
                : 0;

            mappedRoute = {
              ...routeRest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              crag_id: route.crag_id,
              created_at: route.created_at,
              eight_anu_route_slugs: route.eight_anu_route_slugs,
              height: route.height,
              user_creator_id: route.user_creator_id,
              area_id: crag?.area_id,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.areas?.slug,
              area_name: crag?.areas?.name,
              rating,
              ascent_count:
                (
                  route as RouteDto & {
                    ascents: { type: AscentType }[];
                  }
                ).ascents?.filter((a) => a.type !== 'attempt').length ?? 0,
            } as RouteWithExtras;
          }

          return {
            ...ascentRest,
            route: mappedRoute,
          } as RouteAscentWithExtras;
        });

        return { items, total: count ?? 0 };
      } catch {
        return { items: [], total: 0 };
      }
    },
  });

  readonly userTotalAscentsCountResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<number | undefined> => {
      if (!userId || !isPlatformBrowser(this.platformId)) return undefined;
      try {
        await this.supabase.whenReady();
        const { count, error } = await this.supabase.client
          .from('route_ascents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) {
          return undefined;
        }
        return count ?? undefined;
      } catch {
        return undefined;
      }
    },
  });

  resetPagination(): void {
    this.ascentsPage.set(0);
    this.ascentsSize.set(10);
    this.ascentsDateFilter.set(null);
    this.ascentsQuery.set(null);
  }
}
