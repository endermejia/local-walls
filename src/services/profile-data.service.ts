import {
  computed,
  inject,
  Injectable,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';

import {
  AscentType,
  ClimbingKind,
  ClimbingKinds,
  CragDto,
  PaginatedAscents,
  RouteAscentDto,
  RouteAscentWithExtras,
  RouteDto,
  RouteWithExtras,
} from '../models';
import { ORDERED_GRADE_VALUES, LABEL_TO_VERTICAL_LIFE } from '../models';

import { CACHE_KEYS } from '../constants/cache-keys';

import {
  mapRouteToExtras,
  mapAscentRouteToExtras,
  RawRouteData,
} from '../utils/route-mapper';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';
import { FilterStateService } from './filter-state.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileDataService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);
  private readonly filters = inject(FilterStateService);

  profileUserId: WritableSignal<string | null> = signal(null);
  profileActiveTab: WritableSignal<number> = signal(0);

  // ---- Pagination for Ascents Table ----
  readonly ascentsPage = signal(0);
  readonly ascentsSize = signal(10);
  readonly ascentsDateFilter = signal<string>('last12');
  readonly ascentsQuery = signal<string | null>(null);
  readonly ascentsSort = signal<'date' | 'grade'>('date');

  readonly userProjectsResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<RouteWithExtras[]> => {
      if (!userId || !this.isBrowser) return [];
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

            return mapRouteToExtras(r as RawRouteData, {
              areaIdSource: 'crag.area.id',
              includeTopos: false,
            }) as RouteWithExtras;
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
      CACHE_KEYS.userProjects(this.supabase.authUserId() ?? ''),
      [],
    );
  });

  readonly firstAscentYearResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return null;
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
      grades: this.filters.profileAscentsGradeRange(),
      categories: this.filters.profileAscentsCategories(),
      showIndoor: this.filters.profileAscentsShowIndoor(),
      showOutdoor: this.filters.profileAscentsShowOutdoor(),
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
        showIndoor,
        showOutdoor,
        sort,
      } = params;
      if (!userId || !this.isBrowser) return { items: [], total: 0 };
      try {
        await this.supabase.whenReady();
        const from = page * size;
        const to = from + size - 1;

        let outdoorItems: RouteAscentWithExtras[] = [];
        let outdoorTotal = 0;
        let indoorItems: RouteAscentWithExtras[] = [];
        let indoorTotal = 0;

        const [minIdx, maxIdx] = grades;
        const allowedLabels =
          minIdx > 0 || maxIdx < ORDERED_GRADE_VALUES.length - 1
            ? ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1)
            : null;
        const allowedDbGrades = allowedLabels
          ? allowedLabels
              .map((label) => LABEL_TO_VERTICAL_LIFE[label])
              .filter((g): g is number => g !== undefined)
          : null;

        const idxToKind: Record<number, ClimbingKind> = {
          0: ClimbingKinds.SPORT,
          1: ClimbingKinds.BOULDER,
          2: ClimbingKinds.MULTIPITCH,
        };
        const allowedKinds =
          categories.length > 0
            ? categories
                .map((i: number) => idxToKind[i])
                .filter((k): k is ClimbingKind => !!k)
            : null;

        const applyDateFilter = <
          T extends {
            gte: (col: string, val: string) => T;
            lte: (col: string, val: string) => T;
          },
        >(
          query: T,
          dateFilter: string,
        ) => {
          if (dateFilter === 'last12' || dateFilter === 'last_12_months') {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            return query.gte('date', twelveMonthsAgo.toISOString());
          } else if (dateFilter === 'last6' || dateFilter === 'last_6_months') {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return query.gte('date', sixMonthsAgo.toISOString());
          } else if (dateFilter === 'this_year') {
            const year = new Date().getFullYear();
            return query
              .gte('date', `${year}-01-01`)
              .lte('date', `${year}-12-31`);
          } else if (dateFilter !== 'all' && dateFilter !== 'all_time') {
            return query
              .gte('date', `${dateFilter}-01-01`)
              .lte('date', `${dateFilter}-12-31`);
          }
          return query;
        };

        const fetchOutdoor = async () => {
          let countQuery = this.supabase.client
            .from('route_ascents')
            .select('routes!inner(id)', { count: 'exact', head: true })
            .eq('user_id', userId);
          if (queryText) {
            countQuery = countQuery.ilike(
              'routes.search_text',
              `%${queryText}%`,
            );
          }
          if (dateFilter) {
            countQuery = applyDateFilter(countQuery, dateFilter);
          }
          if (allowedDbGrades) {
            countQuery = countQuery.in('grade', allowedDbGrades);
          }
          if (allowedKinds && allowedKinds.length > 0) {
            countQuery = countQuery.in('routes.climbing_kind', allowedKinds);
          }
          const { count: outdoorCount, error: countError } = await countQuery;
          if (countError) throw countError;
          if (from >= (outdoorCount ?? 0)) {
            outdoorTotal = outdoorCount ?? 0;
            outdoorItems = [];
            return;
          }

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
            query = applyDateFilter(query, dateFilter);
          }

          if (allowedDbGrades) {
            query = query.in('grade', allowedDbGrades);
          }

          if (allowedKinds && allowedKinds.length > 0) {
            query = query.in('routes.climbing_kind', allowedKinds);
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
          if (error) throw error;

          outdoorTotal = count ?? 0;
          outdoorItems = (data || []).map((a) => {
            const { routes: route, ...ascentRest } = a;
            let mappedRoute: RouteWithExtras | undefined = undefined;
            if (route) {
              mappedRoute = mapAscentRouteToExtras(
                route as Record<string, unknown>,
              );
            }
            return {
              ...ascentRest,
              route: mappedRoute,
            } as RouteAscentWithExtras;
          });
        };

        const fetchIndoor = async () => {
          const indoorKinds =
            allowedKinds && allowedKinds.length > 0
              ? allowedKinds.filter(
                  (k) =>
                    k === ClimbingKinds.SPORT || k === ClimbingKinds.BOULDER,
                )
              : null;
          if (
            allowedKinds &&
            allowedKinds.length > 0 &&
            (!indoorKinds || indoorKinds.length === 0)
          ) {
            indoorTotal = 0;
            indoorItems = [];
            return;
          }

          let countQuery = this.supabase.client
            .from('indoor_ascents')
            .select('route:indoor_routes!inner(id)', {
              count: 'exact',
              head: true,
            })
            .eq('user_id', userId);
          if (queryText) {
            countQuery = countQuery.ilike('route.name', `%${queryText}%`);
          }
          if (dateFilter) {
            countQuery = applyDateFilter(countQuery, dateFilter);
          }
          if (allowedDbGrades) {
            countQuery = countQuery.in('route.grade', allowedDbGrades);
          }
          if (indoorKinds && indoorKinds.length > 0) {
            countQuery = countQuery.in('route.climbing_kind', indoorKinds);
          }
          const { count: indoorCount, error: countError } = await countQuery;
          if (countError) throw countError;
          if (from >= (indoorCount ?? 0)) {
            indoorTotal = indoorCount ?? 0;
            indoorItems = [];
            return;
          }

          let query = this.supabase.client
            .from('indoor_ascents')
            .select(
              `
              *,
              route:indoor_routes!inner (
                id, name, slug, grade, climbing_kind, color,
                center:indoor_centers!inner (
                  id, name, slug
                )
              )
            `,
              { count: 'exact' },
            )
            .eq('user_id', userId);

          if (queryText) {
            query = query.ilike('route.name', `%${queryText}%`);
          }

          if (dateFilter) {
            query = applyDateFilter(query, dateFilter);
          }

          if (allowedDbGrades) {
            query = query.in('route.grade', allowedDbGrades);
          }

          if (indoorKinds && indoorKinds.length > 0) {
            query = query.in('route.climbing_kind', indoorKinds);
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
          if (error) throw error;

          indoorTotal = count ?? 0;
          indoorItems = (data || []).map((a) => {
            const { route, ...ascentRest } = a as Record<string, unknown>;
            const typedRoute = route as Record<string, unknown> | undefined;
            const center = typedRoute?.['center'] as
              Record<string, unknown> | undefined;
            const { center: _c, ...routeFields } = typedRoute ?? {};
            const mappedRoute: RouteWithExtras = {
              ...routeFields,
              id: (typedRoute?.['id'] as number) || 0,
              name: (typedRoute?.['name'] as string) || '',
              grade: (typedRoute?.['grade'] as number) ?? null,
              climbing_kind:
                (typedRoute?.['climbing_kind'] as ClimbingKind) ||
                ClimbingKinds.SPORT,
              center_slug: center?.['slug'] as string | undefined,
              center_name: center?.['name'] as string | undefined,
              crag_slug: center?.['slug'] as string | undefined,
              crag_name: center?.['name'] as string | undefined,
              liked: false,
              project: false,
            } as unknown as RouteWithExtras;

            return {
              ...ascentRest,
              comment:
                (ascentRest['notes'] as string) ??
                (ascentRest['comment'] as string) ??
                '',
              route: mappedRoute,
            } as RouteAscentWithExtras;
          });
        };

        const shouldFetchOutdoor = (!showIndoor && !showOutdoor) || showOutdoor;
        const shouldFetchIndoor = (!showIndoor && !showOutdoor) || showIndoor;

        const promises: Promise<void>[] = [];
        if (shouldFetchOutdoor) promises.push(fetchOutdoor());
        if (shouldFetchIndoor) promises.push(fetchIndoor());

        await Promise.all(promises);

        const allItems = [...outdoorItems, ...indoorItems];
        if (sort === 'grade') {
          allItems.sort((a, b) => {
            const gradeA = a.grade ?? a.route?.grade ?? 0;
            const gradeB = b.grade ?? b.route?.grade ?? 0;
            if (gradeB !== gradeA) return gradeB - gradeA;
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
        } else {
          allItems.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
        }

        return { items: allItems, total: outdoorTotal + indoorTotal };
      } catch (e) {
        console.error('[ProfileDataService] userAscentsResource error', e);
        return { items: [], total: 0 };
      }
    },
  });

  readonly userTotalAscentsCountResource = resource({
    params: () => ({
      userId: this.profileUserId(),
      showIndoor: this.filters.profileAscentsShowIndoor(),
      showOutdoor: this.filters.profileAscentsShowOutdoor(),
    }),
    loader: async ({ params }): Promise<number | undefined> => {
      const { userId, showIndoor, showOutdoor } = params;
      if (!userId || !this.isBrowser) return undefined;
      const shouldFetchOutdoor = (!showIndoor && !showOutdoor) || showOutdoor;
      const shouldFetchIndoor = (!showIndoor && !showOutdoor) || showIndoor;
      try {
        await this.supabase.whenReady();
        let total = 0;
        const promises: Promise<void>[] = [];

        if (shouldFetchOutdoor) {
          promises.push(
            (async () => {
              const { count, error } = await this.supabase.client
                .from('route_ascents')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
              if (error) throw error;
              total += count ?? 0;
            })(),
          );
        }

        if (shouldFetchIndoor) {
          promises.push(
            (async () => {
              const { count, error } = await this.supabase.client
                .from('indoor_ascents')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
              if (error) throw error;
              total += count ?? 0;
            })(),
          );
        }

        await Promise.all(promises);
        return total;
      } catch (e) {
        console.error(
          '[ProfileDataService] userTotalAscentsCountResource error',
          e,
        );
        return undefined;
      }
    },
  });

  resetPagination(): void {
    this.ascentsPage.set(0);
    this.ascentsSize.set(10);
    this.ascentsDateFilter.set('last12');
    this.ascentsQuery.set(null);
  }
}
