import {
  computed,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
  resource,
  PLATFORM_ID,
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
import { VerticalLifeApi } from './vertical-life-api';
import {
  AppRoles,
  AreaListItem,
  CragListItem,
  CragDetail,
  CragDto,
  Parking,
  RouteWithExtras,
  RouteAscentWithExtras,
  TopoListItem,
  TopoDto,
  IconName,
  Language,
  Languages,
  MapAreaItem,
  MapBounds,
  MapCragItem,
  MapItem,
  MapResponse,
  OptionsData,
  Theme,
  Themes,
  ORDERED_GRADE_VALUES,
  AmountByEveryGrade,
  VERTICAL_LIFE_GRADES,
} from '../models';
import { slugify } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private translate = inject(TranslateService);
  private localStorage = inject(LocalStorage);
  private router = inject(Router);
  private verticalLifeApi = inject(VerticalLifeApi);
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

  /**
   * Refresh a single map item by id by calling 8a.nu item endpoint.
   * Merges it into a cache and updates the selected item if it matches.
   * SSR-safe: no-op on server.
   */
  async refreshMapItemById(id: number): Promise<MapCragItem | void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    const item = await this.verticalLifeApi.getMapItemById(id);
    if (!item || !item.id) return;
    this.mapCache.set(item.id, item);
    const arr = Array.from(this.mapCache.values());
    this.cachedMapItems.set(arr);
    return item;
  }

  // Loading/Status state
  readonly loading = signal(false);
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
    }
    if (isAdmin || isEquipper) {
      config.push({
        name: 'nav.admin-equippers',
        icon: '@tui.hammer',
        fn: () => this.router.navigateByUrl('/admin-equippers'),
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
          fn: () => this.router.navigateByUrl('/'),
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
  mapResponse: WritableSignal<MapResponse | null> = signal(null);
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

    const rectIntersect = (rect: {
      south: number;
      west: number;
      north: number;
      east: number;
    }): boolean => {
      const eastWrap = east < west; // viewport crosses anti-meridian
      if (!eastWrap) {
        // Standard AABB overlap on lon/lat
        return !(
          rect.west > east ||
          rect.east < west ||
          rect.south > north ||
          rect.north < south
        );
      }
      // When viewport wraps, we split it into two: [west, 180] and [-180, east]
      const left = { south, west, north, east: 180 };
      const right = { south, west: -180, north, east };
      const overlap = (a: typeof left, b: typeof rect) =>
        !(
          b.west > a.east ||
          b.east < a.west ||
          b.south > a.north ||
          b.north < a.south
        );
      return overlap(left, rect) || overlap(right, rect);
    };

    return items.filter((it) => {
      const area = (it as MapAreaItem).area_type === 0;
      if (!area) {
        const lat = (it as MapCragItem).latitude as number | undefined;
        const lng = (it as MapCragItem).longitude as number | undefined;
        return (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          pointIn(lat, lng)
        );
      }
      const box = (it as MapAreaItem).b_box as
        | [[number, number], [number, number]]
        | undefined;
      if (!box || !Array.isArray(box) || box.length !== 2) return false;
      // Vertical-Life API b_box order is [[westLng, southLat], [eastLng, northLat]]
      const [w, s] = box[0] ?? [];
      const [e, n] = box[1] ?? [];
      if ([w, s, e, n].some((v) => typeof v !== 'number')) return false;
      return rectIntersect({
        south: s as number,
        west: w as number,
        north: n as number,
        east: e as number,
      });
    });
  });
  selectedMapCragItem: WritableSignal<MapCragItem | null> = signal(null);

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
  readonly areaListResource = resource({
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
    () => this.areaListResource.value() ?? [],
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
          crag_parkings: { parking: Parking }[] | null;
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

        const detailedCrag: CragDetail = {
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

        return detailedCrag;
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
  readonly cragRoutes: Signal<RouteWithExtras[]> = computed(
    () => this.cragRoutesResource.value() ?? [],
  );

  // ---- Route Detail ----
  selectedRouteSlug: WritableSignal<string | null> = signal(null);
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
        return ascents.map(
          (a) =>
            ({
              ...a,
              user: profileMap.get(a.user_id),
            }) as RouteAscentWithExtras,
        );
      } catch (e) {
        console.error('[GlobalData] routeAscentsResource exception', e);
        return [];
      }
    },
  });

  // Cache for local areas loaded from public/map/map_areas.json
  private _localAreasCache: MapAreaItem[] | null = null;

  // slugify moved to shared utils (see src/utils/slugify.ts)

  // Load local areas from static JSON (browser-only). The JSON contains points with
  // properties: { area_name, bounding_box }. We adapt them to MapAreaItem.
  private async loadLocalAreasFromJson(): Promise<MapAreaItem[]> {
    if (this._localAreasCache) return this._localAreasCache;
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return [];
    }
    try {
      const res = await fetch('/map/map_areas.json', { cache: 'force-cache' });
      if (!res.ok)
        throw new Error(`Failed to load map_areas.json: HTTP ${res.status}`);
      const data = (await res.json()) as {
        type: string;
        features: {
          id?: number | string;
          properties?: {
            area_name?: string;
            bounding_box?: [[number, number], [number, number]];
          };
        }[];
      };
      const list: MapAreaItem[] = (data?.features ?? [])
        .map((f) => {
          const idRaw = f?.id as number | string | undefined;
          const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
          const name = f?.properties?.area_name ?? '';
          const bbox = f?.properties?.bounding_box as
            | [[number, number], [number, number]]
            | undefined;
          if (!id || !name || !bbox) return null;
          return {
            id,
            name,
            slug: slugify(name),
            country_name: '',
            country_slug: '',
            area_type: 0,
            b_box: bbox,
          } as MapAreaItem;
        })
        .filter((x): x is MapAreaItem => !!x);
      this._localAreasCache = list;
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async loadMapItems(bounds: MapBounds): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      // 1) Load API response (we will use only crags from it)
      const apiResponse: MapResponse =
        await this.verticalLifeApi.getMapResponse(bounds);
      const apiItems = Array.isArray(apiResponse?.items)
        ? apiResponse.items
        : [];
      const cragItems = apiItems.filter(
        (it) => (it as MapAreaItem).area_type !== 0,
      ) as MapCragItem[];

      // 2) Load local areas from static JSON and filter by current viewport bounds
      const localAreasAll = await this.loadLocalAreasFromJson();
      const south = bounds.south_west_latitude;
      const west = bounds.south_west_longitude;
      const north = bounds.north_east_latitude;
      const east = bounds.north_east_longitude;
      const eastWrap = east < west; // viewport crosses anti-meridian
      const intersects = (
        box: [[number, number], [number, number]],
      ): boolean => {
        const [w, s] = box[0] ?? [];
        const [e, n] = box[1] ?? [];
        if ([w, s, e, n].some((v) => typeof v !== 'number')) return false;
        if (!eastWrap) {
          return !(w > east || e < west || s > north || n < south);
        }
        // split viewport into two when wrapped
        const left = { south, west, north, east: 180 };
        const right = { south, west: -180, north, east };
        const overlap = (a: typeof left) =>
          !(w > a.east || e < a.west || s > a.north || n < a.south);
        return overlap(left) || overlap(right);
      };
      const localAreas = localAreasAll.filter(
        (a) => a.b_box && intersects(a.b_box),
      );

      // 2b) Enrich local areas with country fields from API areas (by id), but keep local bounding_box
      const apiAreasById = new Map<number, MapAreaItem>(
        apiItems
          .filter((it) => (it as MapAreaItem).area_type === 0)
          .map((it) => [it.id as number, it as MapAreaItem]),
      );
      const localAreasEnriched = localAreas.map((a) => {
        const apiA = apiAreasById.get(a.id);
        if (!apiA) return a;
        return {
          ...a,
          country_name: apiA.country_name ?? a.country_name,
          country_slug: apiA.country_slug ?? a.country_slug,
          // keep a.b_box from local JSON on purpose
        } as MapAreaItem;
      });

      // 3) Build merged response with crags from API and areas ONLY from local JSON (enriched with country fields)
      const mergedItems: MapItem[] = [...cragItems, ...localAreasEnriched];
      const mergedCounts = {
        locations: apiResponse?.counts?.locations ?? cragItems.length,
        map_collections: localAreasEnriched.length,
      };
      const mergedResponse: MapResponse = {
        items: mergedItems,
        counts: mergedCounts,
      };
      this.mapResponse.set(mergedResponse);

      // 4) Merge into cache (dedupe by id)
      for (const it of mergedItems) {
        const id = it?.id;
        if (id) {
          this.mapCache.set(id, it);
        }
      }
      // Enforce cache size limit and update signal
      let arr = Array.from(this.mapCache.values());
      if (arr.length > this.maxCacheItems) {
        arr = arr.slice(arr.length - this.maxCacheItems);
        // Rebuild map to keep only the last N (approximate LRU by recency of merge)
        this.mapCache.clear();
        for (const it of arr) {
          this.mapCache.set(it.id, it);
        }
      }
      this.cachedMapItems.set(arr);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  toggleLikeCrag(id: string): void {
    console.log('toggleLikeCrag', id);
  }

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
        void this.loadMapItems(mapBounds);
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
        break;
      }
      case 'topo': {
        this.selectedRouteSlug.set(null);
        break;
      }
      case 'route': {
        break;
      }
    }
  }
}
