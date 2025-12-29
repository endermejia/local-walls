import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TUI_ENGLISH_LANGUAGE, TUI_SPANISH_LANGUAGE } from '@taiga-ui/i18n';
import { TuiBreakpointService } from '@taiga-ui/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';
import {
  AmountByEveryGrade,
  AppRoles,
  AreaListItem,
  CragDetail,
  CragDto,
  CragListItem,
  IconName,
  Language,
  Languages,
  MapAreaItem,
  MapBounds,
  MapCragItem,
  MapItem,
  MapResponse,
  OptionsData,
  ORDERED_GRADE_VALUES,
  ParkingDto,
  RouteAscentWithExtras,
  RouteWithExtras,
  Theme,
  Themes,
  TopoDetail,
  TopoDto,
  TopoListItem,
  TopoRouteWithRoute,
  VERTICAL_LIFE_GRADES,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private translate = inject(TranslateService);
  private localStorage = inject(LocalStorage);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private supabase = inject(SupabaseService);
  private breakpointService = inject(TuiBreakpointService);

  readonly isMobile = toSignal(
    this.breakpointService.pipe(map((b) => b === 'mobile')),
    { initialValue: false },
  );

  // ---- Map cache (keeps already downloaded items) ----
  private readonly mapCache = new Map<number, MapItem>();
  private readonly maxCacheItems = 1000;
  private readonly cachedMapItems: WritableSignal<MapItem[]> = signal([]);

  // Loading/Status state
  readonly error: WritableSignal<string | null> = signal(null);

  // ---- Language ----
  readonly i18nTick: WritableSignal<number> = signal(0);
  selectedLanguage: Signal<Language> = computed(
    () => this.userProfile()?.language || Languages.ES,
  );
  tuiLanguage: Signal<
    typeof TUI_SPANISH_LANGUAGE | typeof TUI_ENGLISH_LANGUAGE
  > = computed(() =>
    this.selectedLanguage() === Languages.ES
      ? TUI_SPANISH_LANGUAGE
      : TUI_ENGLISH_LANGUAGE,
  );

  // ---- Theme ----
  selectedTheme: Signal<Theme> = computed(
    () => this.userProfile()?.theme || Themes.LIGHT,
  );
  iconSrc: Signal<(name: IconName) => string> = computed(() => {
    const theme = this.selectedTheme();
    // Return the icon URL based on the theme
    return (name: IconName) => `/image/${name}-${theme}.svg`;
  });

  // ---- Drawer ----
  drawer: Signal<OptionsData> = computed(() => {
    this.i18nTick();
    const isAdmin = this.isAdmin();
    const isEquipper = this.isEquipper();

    const config = [];
    if (isEquipper) {
      config.push({
        name: 'nav.my-crags',
        icon: '@tui.list',
        fn: () => this.router.navigateByUrl('/my-crags'),
      });
    }
    if (isAdmin) {
      config.push({
        name: 'nav.admin-users',
        icon: '@tui.users',
        fn: () => this.router.navigateByUrl('/admin/users'),
      });
      config.push({
        name: 'nav.admin-parkings',
        icon: '@tui.map-pin',
        fn: () => this.router.navigateByUrl('/admin/parkings'),
      });
    }
    if (isAdmin || isEquipper) {
      config.push({
        name: 'nav.admin-equippers',
        icon: '@tui.hammer',
        fn: () => this.router.navigateByUrl('/admin/equippers'),
      });
    }
    return {
      navigation: [
        {
          name: 'nav.home',
          icon: '@tui.home',
          fn: () => this.router.navigateByUrl('/home'),
        },

        {
          name: 'nav.explore',
          icon: '@tui.map',
          fn: () => this.router.navigateByUrl('/explore'),
        },
        {
          name: 'nav.areas',
          icon: '@tui.list',
          fn: () => this.router.navigateByUrl('/areas'),
        },
      ],
      config,
    } satisfies OptionsData;
  });

  // ---- Search ----
  searchPopular: WritableSignal<string[]> = signal([
    'Wild Side',
    'Aixortà',
    'Rincón Bello',
    'Chulilla',
    'Oliana',
    'Rodellar',
    'Siurana',
    'Margalef',
    'Kalymnos',
    'Fontainebleau',
  ]);

  // ---- Auth (roles) ----
  readonly userProfile = computed(() => this.supabase.userProfile());
  readonly userRole = computed(() => this.supabase.userRole());
  readonly isAdmin = computed(() => this.userRole() === AppRoles.ADMIN);
  readonly isEquipper = computed(() => this.userRole() === AppRoles.EQUIPPER);
  readonly userAvatar = computed(() =>
    this.supabase.buildAvatarUrl(this.userProfile()?.avatar),
  );

  // ---- Map ----
  mapBounds: WritableSignal<MapBounds | null> = signal(null);
  private readonly mapBoundsStorageKey = 'map_bounds_v1';

  /**
   * Resource for fetching map items based on bounds.
   */
  readonly mapResource = resource({
    params: () => this.mapBounds(),
    loader: async ({ params: bounds }) => {
      if (
        !isPlatformBrowser(this.platformId) ||
        typeof window === 'undefined' ||
        !bounds
      ) {
        return {
          items: [],
          counts: { locations: 0, map_collections: 0 },
        } as MapResponse;
      }

      await this.supabase.whenReady();
      const userId = this.supabase.authUser()?.id;
      let query = this.supabase.client.from('crags').select(
        `
          id, name, slug, latitude, longitude,
          area:areas (name, slug),
          routes (grade, climbing_kind),
          topos (shade_morning, shade_afternoon),
          liked:crag_likes(id)
        `,
      );

      if (userId) {
        query = query.eq('liked.user_id', userId);
      }

      const { data: sbCrags, error: sbError } = await query
        .gte('latitude', bounds.south_west_latitude)
        .lte('latitude', bounds.north_east_latitude)
        .gte('longitude', bounds.south_west_longitude)
        .lte('longitude', bounds.north_east_longitude);

      if (sbError) {
        console.error('[GlobalData] mapResource error', sbError);
        throw sbError;
      }

      const supabaseCragItems: MapCragItem[] = (sbCrags || []).map((c) => {
        const grades: Record<number, number> = {};
        let totalRoutes = 0;
        const climbingKinds = new Set<string>();

        (c.routes || []).forEach((r) => {
          totalRoutes++;
          if (typeof r.grade === 'number') {
            grades[r.grade] = (grades[r.grade] || 0) + 1;
          }
          if (r.climbing_kind) climbingKinds.add(r.climbing_kind);
        });

        let category = 0;
        if (climbingKinds.has('boulder')) category = 1;
        else if (climbingKinds.has('multipitch')) category = 2;

        const shadeMorning = (c.topos || []).some((t) => t.shade_morning);
        const shadeAfternoon = (c.topos || []).some((t) => t.shade_afternoon);

        const isLiked = (c.liked || []).length > 0;

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          latitude: c.latitude || 0,
          longitude: c.longitude || 0,
          area_name: c.area?.name || '',
          area_slug: c.area?.slug || '',
          grades,
          category,
          routes_count: totalRoutes,
          shade_morning: shadeMorning,
          shade_afternoon: shadeAfternoon,
          shade_all_day: shadeMorning && shadeAfternoon,
          sun_all_day: !shadeMorning && !shadeAfternoon,
          avg_rating: 0,
          liked: isLiked,
        } as MapCragItem;
      });

      const mergedResponse: MapResponse = {
        items: supabaseCragItems,
        counts: {
          locations: supabaseCragItems.length,
          map_collections: 0,
        },
      };

      // Merge into cache
      for (const it of supabaseCragItems) {
        if (it.id) {
          this.mapCache.set(it.id, it);
        }
      }

      // Enforce cache limit
      let arr = Array.from(this.mapCache.values());
      if (arr.length > this.maxCacheItems) {
        arr = arr.slice(arr.length - this.maxCacheItems);
        this.mapCache.clear();
        for (const it of arr) {
          this.mapCache.set(it.id, it);
        }
      }
      this.cachedMapItems.set(arr);

      return mergedResponse;
    },
  });

  mapResponse: Signal<MapResponse | null> = computed(
    () => this.mapResource.value() ?? null,
  );
  mapItems: Signal<MapItem[]> = computed(() => this.cachedMapItems());
  /**
   * Items currently visible in the viewport defined by mapBounds.
   * - Crags: included when their [lat,lng] is inside bounds.
   * - Areas: included when their bbox intersects bounds.
   * If no bounds yet, returns all cached mapItems.
   */
  mapItemsOnViewport: Signal<MapItem[]> = computed(() => {
    const bounds = this.mapBounds();
    const items = this.mapItems();
    if (!bounds) return items;

    const south = bounds.south_west_latitude;
    const west = bounds.south_west_longitude;
    const north = bounds.north_east_latitude;
    const east = bounds.north_east_longitude;

    const pointIn = (lat: number, lng: number): boolean => {
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
      // Handle normal case where east >= west; if anti-meridian crossed (east < west), allow wrap.
      const inLat = lat >= south && lat <= north;
      const inLng =
        east >= west ? lng >= west && lng <= east : lng >= west || lng <= east;
      return inLat && inLng;
    };

    return [
      ...items.filter((it) => {
        const area = (it as MapAreaItem).area_type === 0;
        if (area) return false;

        const lat = (it as MapCragItem).latitude as number | undefined;
        const lng = (it as MapCragItem).longitude as number | undefined;
        return (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          pointIn(lat, lng)
        );
      }),
      ...(this.areasMapResource.value() || []),
    ];
  });
  selectedMapCragItem: WritableSignal<MapCragItem | null> = signal(null);
  selectedMapParkingItem: WritableSignal<ParkingDto | null> = signal(null);

  /**
   * Resource for fetching parkings in the map based on bounds.
   */
  readonly parkingsMapResource = resource({
    params: () => this.mapBounds(),
    loader: async ({ params: bounds }) => {
      if (
        !bounds ||
        typeof bounds.south_west_latitude !== 'number' ||
        typeof bounds.north_east_latitude !== 'number' ||
        typeof bounds.south_west_longitude !== 'number' ||
        typeof bounds.north_east_longitude !== 'number'
      ) {
        return [];
      }

      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('parkings')
        .select('*')
        .gte('latitude', bounds.south_west_latitude)
        .lte('latitude', bounds.north_east_latitude)
        .gte('longitude', bounds.south_west_longitude)
        .lte('longitude', bounds.north_east_longitude);

      if (error) {
        console.error('[GlobalData] parkingsMapResource error', error);
        return [];
      }

      return data as ParkingDto[];
    },
  });

  /**
   * Resource for fetching areas in the map based on bounds.
   * Since areas don't have direct coordinates in the database,
   * we derive them from the crags found in the current viewport
   * and fetch their detailed info.
   */
  readonly areasMapResource = resource({
    params: () => {
      const crags = this.mapResource.value()?.items || [];
      return [
        ...new Set(
          crags
            .map((c) => (c as MapCragItem).area_slug)
            .filter((slug): slug is string => !!slug),
        ),
      ];
    },
    loader: async ({ params: slugs }) => {
      if (!slugs.length || !isPlatformBrowser(this.platformId)) return [];

      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        let query = this.supabase.client
          .from('areas')
          .select(
            `
            id, name, slug,
            liked:area_likes(id),
            crags (
              routes (grade)
            )
          `,
          )
          .in('slug', slugs);

        if (userId) {
          query = query.eq('liked.user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[GlobalData] areasMapResource error', error);
          return [];
        }

        return (data || []).map((a) => {
          const grades: AmountByEveryGrade = {};
          let cragsCount = 0;

          (a.crags || []).forEach((c) => {
            cragsCount++;
            (c.routes || []).forEach((r) => {
              if (typeof r.grade === 'number') {
                const g = r.grade as VERTICAL_LIFE_GRADES;
                grades[g] = (grades[g] || 0) + 1;
              }
            });
          });

          const isLiked = (a.liked || []).length > 0;

          return {
            id: a.id,
            name: a.name,
            slug: a.slug,
            liked: isLiked,
            grades,
            crags_count: cragsCount,
            area_type: 0,
          } as MapAreaItem & {
            grades: AmountByEveryGrade;
            crags_count: number;
          };
        });
      } catch (e) {
        console.error('[GlobalData] areasMapResource exception', e);
        return [];
      }
    },
  });

  // ---- Area List Filters (Persisted) ----
  areaListGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  areaListCategories: WritableSignal<number[]> = signal([]);
  areaListShade: WritableSignal<
    ('shade_morning' | 'shade_afternoon' | 'shade_all_day' | 'sun_all_day')[]
  > = signal([]);

  // ---- Areas ----
  selectedAreaSlug: WritableSignal<string | null> = signal(null);
  selectedArea: Signal<AreaListItem | null> = computed(() => {
    const slug = this.selectedAreaSlug();
    return slug ? this.areaList().find((a) => a.slug === slug) || null : null;
  });
  /**
   * List of areas (RPC get_areas_list)
   * SSR-safe: on server returns [] and does not access browser APIs.
   */
  readonly areasListResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) {
        return [] as AreaListItem[];
      }
      try {
        await this.supabase.whenReady();
        const { data, error } =
          await this.supabase.client.rpc('get_areas_list');
        if (error) {
          console.error('[GlobalData] areaListResource error', error);
          return [] as AreaListItem[];
        }
        return (data as AreaListItem[]) ?? [];
      } catch (e) {
        console.error('[GlobalData] areaListResource exception', e);
        return [] as AreaListItem[];
      }
    },
  });
  areaList: Signal<AreaListItem[]> = computed(
    () => this.areasListResource.value() ?? [],
  );

  // ---- Crags list by selected area ----
  /**
   * List of sectors/crags for the selected area using RPC get_crags_list_by_area_slug.
   * SSR-safe: on server returns [].
   */
  readonly cragsListResource = resource({
    params: () => this.selectedAreaSlug(),
    loader: async ({ params: areaSlug }) => {
      if (!areaSlug) return [];
      if (!isPlatformBrowser(this.platformId)) {
        return [] as CragListItem[];
      }
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client.rpc(
          'get_crags_list_by_area_slug',
          { p_area_slug: areaSlug },
        );
        if (error) {
          console.error('[GlobalData] cragsListResource error', error);
          return [];
        }
        return (data as CragListItem[]) ?? [];
      } catch (e) {
        console.error('[GlobalData] cragsListResource exception', e);
        return [];
      }
    },
  });
  readonly cragsList: Signal<CragListItem[]> = computed(
    () => this.cragsListResource.value() ?? [],
  );

  /**
   * Selection of crag (by slug) dependent on the selected area.
   */
  selectedCragSlug: WritableSignal<string | null> = signal(null);
  selectedCrag: Signal<CragListItem | null> = computed(() => {
    const slug = this.selectedCragSlug();
    if (!slug) return null;
    const list = this.cragsList();
    return list.find((c) => c.slug === slug) ?? null;
  });

  selectedTopoId: WritableSignal<string | null> = signal(null);

  readonly topoDetailResource = resource({
    params: () => this.selectedTopoId(),
    loader: async ({ params: id }): Promise<TopoDetail | null> => {
      if (!id) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        const { data, error } = await this.supabase.client
          .from('topos')
          .select(
            `
            *,
            topo_routes (
              *,
              route: routes (
                *,
                own_ascent: route_ascents!left (*),
                project: route_projects!left (id)
              )
            )
          `,
          )
          .eq('id', Number(id))
          .eq('topo_routes.route.own_ascent.user_id', userId ?? '')
          .eq('topo_routes.route.project.user_id', userId ?? '')
          .order('number', { referencedTable: 'topo_routes', ascending: true })
          .single();

        if (error) {
          console.error('[GlobalData] topoDetailResource error', error);
          return null;
        }

        const topo_routes: TopoRouteWithRoute[] =
          data.topo_routes?.map((tr) => ({
            ...tr,
            route: {
              ...tr.route,
              own_ascent: tr.route.own_ascent?.[0] || null,
              project: tr.route.project?.[0] || null,
            },
          })) || [];

        return {
          ...data,
          topo_routes,
        };
      } catch (e) {
        console.error('[GlobalData] topoDetailResource error', e);
        return null;
      }
    },
  });

  readonly cragDetailResource = resource({
    params: () => this.selectedCragSlug(),
    loader: async ({ params: slug }): Promise<CragDetail | null> => {
      if (!slug) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        let query = this.supabase.client
          .from('crags')
          .select(
            `
            *,
            liked:crag_likes(id),
            area: areas ( name, slug ),
            crag_parkings (
              parking: parkings (*)
            ),
            topos (
              *,
              topo_routes (
                route: routes (
                  grade
                )
              )
            )
          `,
          )
          .eq('slug', slug);

        if (userId) {
          query = query.eq('liked.user_id', userId);
        }

        const { data, error } = await query.single();

        if (error) {
          console.error('[GlobalData] cragDetailResource error', error);
          return null;
        }

        // Type the raw response structure from Supabase join query
        type CragWithJoins = CragDto & {
          area: { name: string; slug: string } | null;
          crag_parkings: { parking: ParkingDto }[] | null;
          topos:
            | (TopoDto & {
                topo_routes: { route: { grade: number } | null }[];
              })[]
            | null;
          liked: { id: number }[];
        };
        const rawData = data as CragWithJoins;

        // Transform nested parkings
        const parkings =
          rawData.crag_parkings?.map((cp) => cp.parking).filter(Boolean) ?? [];

        const topos: TopoListItem[] =
          rawData.topos?.map((t) => {
            const grades: AmountByEveryGrade = {};
            t.topo_routes.forEach((tr) => {
              const g = tr.route?.grade;
              if (g !== undefined && g !== null) {
                grades[g as VERTICAL_LIFE_GRADES] =
                  (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
              }
            });

            return {
              id: t.id,
              name: t.name,
              slug: t.slug,
              photo: t.photo,
              grades,
              shade_afternoon: t.shade_afternoon,
              shade_change_hour: t.shade_change_hour,
              shade_morning: t.shade_morning,
            };
          }) ?? [];
        const topos_count = topos.length;
        const shade_morning = topos.some((t) => t.shade_morning);
        const shade_afternoon = topos.some((t) => t.shade_afternoon);
        const shade_all_day = topos.some(
          (t) => t.shade_morning && t.shade_afternoon,
        );
        const sun_all_day = topos.some(
          (t) => !t.shade_morning && !t.shade_afternoon,
        );

        return {
          // Fields from CragDto (table)
          id: rawData.id,
          name: rawData.name,
          slug: rawData.slug,
          area_id: rawData.area_id, // Not in CragListItem but in CragDto
          description_en: rawData.description_en ?? undefined,
          description_es: rawData.description_es ?? undefined,
          warning_en: rawData.warning_en ?? undefined,
          warning_es: rawData.warning_es ?? undefined,
          latitude: rawData.latitude ?? 0,
          longitude: rawData.longitude ?? 0,
          approach: rawData.approach ?? undefined,

          // Enriched fields
          area_name: rawData.area?.name ?? '',
          area_slug: rawData.area?.slug ?? '',
          grades: {}, // Will be computed in the component from routes
          liked: (rawData.liked?.length ?? 0) > 0,
          parkings,
          topos,

          // Missing CragListItem fields
          climbing_kind: [], // Cannot compute without routes here
          topos_count,
          shade_morning,
          shade_afternoon,
          shade_all_day,
          sun_all_day,
        };
      } catch (e) {
        console.error('[GlobalData] cragDetailResource exception', e);
        return null;
      }
    },
  });

  readonly cragRoutesResource = resource({
    params: () => {
      const crag = this.cragDetailResource.value();
      return {
        cragId: crag?.id,
        cragSlug: crag?.slug,
        areaSlug: crag?.area_slug,
      };
    },
    loader: async ({ params: { cragId } }): Promise<RouteWithExtras[]> => {
      if (!cragId) return [];
      if (!isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        let query = this.supabase.client
          .from('routes')
          .select(
            `
            *,
            liked:route_likes(id),
            project:route_projects(id),
            ascents:route_ascents(rate),
            own_ascent:route_ascents(*),
            crag:crags(
              slug,
              area:areas(slug)
            )
          `,
          )
          .eq('crag_id', cragId);

        if (userId) {
          query = query.eq('own_ascent.user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[GlobalData] cragRoutesResource error', error);
          return [];
        }

        return (
          data.map((r) =>
            (() => {
              const rates =
                r.ascents?.map((a) => a.rate).filter((rate) => rate != null) ??
                [];
              const rating =
                rates.length > 0
                  ? rates.reduce((a, b) => a + b, 0) / rates.length
                  : 0;

              return {
                ...r,
                liked: (r.liked?.length ?? 0) > 0,
                project: (r.project?.length ?? 0) > 0,
                crag_slug: r.crag?.slug,
                area_slug: r.crag?.area?.slug,
                rating,
                ascent_count: r.ascents?.length ?? 0,
                climbed: (r.own_ascent?.length ?? 0) > 0,
                own_ascent: r.own_ascent?.[0],
              } as RouteWithExtras;
            })(),
          ) ?? []
        );
      } catch (e) {
        console.error('[GlobalData] cragRoutesResource exception', e);
        return [];
      }
    },
  });

  // ---- Route Detail ----
  selectedRouteSlug: WritableSignal<string | null> = signal(null);
  profileUserId: WritableSignal<string | null> = signal(null);

  readonly userProjectsResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        // Fetch routes that are projects for this specific user
        const { data, error } = await this.supabase.client
          .from('route_projects')
          .select(
            `
            route:routes (
              *,
              liked:route_likes(id),
              project:route_projects(id),
              crag:crags(
                slug,
                name,
                area:areas(slug, name)
              ),
              ascents:route_ascents(rate)
            )
          `,
          )
          .eq('user_id', userId);

        if (error) {
          console.error('[GlobalData] userProjectsResource error', error);
          return [];
        }

        return (data as any[])
          .map((item) => {
            const r = item.route;
            if (!r) return null;
            const rates =
              r.ascents
                ?.map((a: any) => a.rate)
                .filter((rate: any) => rate != null) ?? [];
            const rating =
              rates.length > 0
                ? rates.reduce((a: any, b: any) => a + b, 0) / rates.length
                : 0;

            const { crag, ascents, liked, project, ...rest } = r;
            return {
              ...rest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.area?.slug,
              area_name: crag?.area?.name,
              rating,
              ascent_count: ascents?.length ?? 0,
            } as any;
          })
          .filter((r) => !!r);
      } catch (e) {
        console.error('[GlobalData] userProjectsResource exception', e);
        return [];
      }
    },
  });

  readonly userAscentsResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<RouteAscentWithExtras[]> => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('route_ascents')
          .select(
            `
            *,
            route:routes (
              *,
              liked:route_likes(id),
              project:route_projects(id),
              crag:crags(
                slug,
                name,
                area:areas(slug, name)
              )
            )
          `,
          )
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (error) {
          console.error('[GlobalData] userAscentsResource error', error);
          return [];
        }

        return (data as any[]).map((a) => {
          const { route, ...ascentRest } = a;
          let mappedRoute: RouteWithExtras | undefined = undefined;

          if (route) {
            const { crag, liked, project, ...routeRest } = route;
            mappedRoute = {
              ...routeRest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.area?.slug,
              area_name: crag?.area?.name,
            } as RouteWithExtras;
          }

          return {
            ...ascentRest,
            route: mappedRoute,
          } as RouteAscentWithExtras;
        });
      } catch (e) {
        console.error('[GlobalData] userAscentsResource exception', e);
        return [];
      }
    },
  });

  readonly routeDetailResource = resource({
    params: () => ({
      cragId: this.cragDetailResource.value()?.id,
      routeSlug: this.selectedRouteSlug(),
    }),
    loader: async ({
      params: { cragId, routeSlug },
    }): Promise<RouteWithExtras | null> => {
      if (!cragId || !routeSlug) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      try {
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
              name,
              slug,
              area:areas(name, slug)
            ),
            ascents:route_ascents(rate),
            own_ascent:route_ascents(*)
          `,
          )
          .eq('crag_id', cragId)
          .eq('slug', routeSlug);

        if (userId) {
          query = query.eq('own_ascent.user_id', userId);
        }

        const { data, error } = await query.single();

        if (error) {
          console.error('[GlobalData] routeDetailResource error', error);
          return null;
        }

        const r = data;
        const rates =
          r.ascents?.map((a) => a.rate).filter((rate) => rate != null) ?? [];
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
          area_name: r.crag?.area?.name,
          area_slug: r.crag?.area?.slug,
          rating,
          ascent_count: r.ascents?.length ?? 0,
          climbed: (r.own_ascent?.length ?? 0) > 0,
          own_ascent: r.own_ascent?.[0],
        } as RouteWithExtras;
      } catch (e) {
        console.error('[GlobalData] routeDetailResource exception', e);
        return null;
      }
    },
  });

  readonly routeAscentsResource = resource({
    params: () => this.routeDetailResource.value()?.id,
    loader: async ({ params: routeId }): Promise<RouteAscentWithExtras[]> => {
      if (!routeId) return [];
      if (!isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        // 1. Fetch ascents for the route
        const { data: ascents, error: ascentsError } =
          await this.supabase.client
            .from('route_ascents')
            .select('*')
            .eq('route_id', routeId)
            .order('date', { ascending: false });

        if (ascentsError) {
          console.error(
            '[GlobalData] routeAscentsResource error',
            ascentsError,
          );
          return [];
        }

        if (!ascents || ascents.length === 0) return [];

        // 2. Fetch unique user profiles for these ascents
        const userIds = [...new Set(ascents.map((a) => a.user_id))];
        const { data: profiles, error: profilesError } =
          await this.supabase.client
            .from('user_profiles')
            .select('*')
            .in('id', userIds);

        if (profilesError) {
          console.error(
            '[GlobalData] routeAscentsResource profiles error',
            profilesError,
          );
          // Return ascents without user info if profiles fail
          return ascents;
        }

        // 3. Map profiles back to ascents
        const profileMap = new Map(profiles?.map((p) => [p.id, p]));
        const currentRoute = this.routeDetailResource.value();
        return ascents.map(
          (a) =>
            ({
              ...a,
              user: profileMap.get(a.user_id),
              route: currentRoute ?? undefined,
            }) as RouteAscentWithExtras,
        );
      } catch (e) {
        console.error('[GlobalData] routeAscentsResource exception', e);
        return [];
      }
    },
  });

  // ---- Error state for interceptor ----
  errorMessage: WritableSignal<string | null> = signal(null);
  setError(message: string | null) {
    this.errorMessage.set(message);
  }

  constructor() {
    this.translate.onLangChange.subscribe(() =>
      this.i18nTick.update((v) => v + 1),
    );
    this.translate.onTranslationChange.subscribe(() =>
      this.i18nTick.update((v) => v + 1),
    );
    this.translate.onDefaultLangChange.subscribe(() =>
      this.i18nTick.update((v) => v + 1),
    );

    // Hydrate last map bounds from storage on a browser
    try {
      const rawBounds = this.localStorage.getItem(this.mapBoundsStorageKey);
      if (rawBounds) {
        const parsed = JSON.parse(rawBounds) as MapBounds;
        this.mapBounds.set(parsed);
      }
    } catch {
      // ignore corrupted viewport state
    }

    // Persist and react to map bounds changes
    effect(() => {
      const mapBounds = this.mapBounds();
      if (mapBounds) {
        // Save the last viewport for next sessions (SSR-safe local storage wrapper)
        try {
          this.localStorage.setItem(
            this.mapBoundsStorageKey,
            JSON.stringify(mapBounds),
          );
        } catch {
          // ignore corrupted viewport state
        }
      }
    });

    effect(() => {
      const selectedLanguage = this.selectedLanguage();
      if (selectedLanguage) {
        this.translate.use(selectedLanguage);
      }
    });
  }

  resetDataByPage(
    page: 'explore' | 'area-list' | 'area' | 'crag' | 'topo' | 'route' | 'home',
  ): void {
    switch (page) {
      case 'explore': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        this.selectedMapCragItem.set(null);
        break;
      }
      case 'home': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        break;
      }
      case 'area': {
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        break;
      }
      case 'crag': {
        this.selectedRouteSlug.set(null);
        this.selectedTopoId.set(null);
        break;
      }
      case 'topo': {
        this.selectedRouteSlug.set(null);
        break;
      }
      case 'route': {
        this.selectedTopoId.set(null);
        break;
      }
    }
  }
}
