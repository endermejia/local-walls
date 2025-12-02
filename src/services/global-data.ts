import {
  computed,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { VerticalLifeApi } from './vertical-life-api';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorage } from './local-storage';
import { slugify } from '../utils/slugify';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { TUI_ENGLISH_LANGUAGE, TUI_SPANISH_LANGUAGE } from '@taiga-ui/i18n';
import { TranslateService } from '@ngx-translate/core';
import { TuiFlagPipe } from '@taiga-ui/core';
import type {
  ClimbingCrag,
  ClimbingRoute,
  ClimbingSector,
  ClimbingTopo,
  IconName,
  MapBounds,
  MapCragItem,
  MapItem,
  MapResponse,
  OptionsData,
  AscentsPage,
  ClimbingRoutesPage,
  MapAreaItem,
  UserRole,
  AreaDetail,
} from '../models';

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
  protected readonly flagPipe = new TuiFlagPipe();

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

  private readonly i18nTick: WritableSignal<number> = signal(0);
  selectedLanguage: WritableSignal<'es' | 'en'> = signal('es');
  tuiLanguage: Signal<
    typeof TUI_SPANISH_LANGUAGE | typeof TUI_ENGLISH_LANGUAGE
  > = computed(() =>
    this.selectedLanguage() === 'es'
      ? TUI_SPANISH_LANGUAGE
      : TUI_ENGLISH_LANGUAGE,
  );

  selectedTheme: WritableSignal<'light' | 'dark'> = signal('light');
  iconSrc: Signal<(name: IconName) => string> = computed(() => {
    const theme = this.selectedTheme();
    return (name: IconName) => `/image/${name}-${theme}.svg`;
  });

  drawer: WritableSignal<OptionsData> = signal({
    ['Navigation']: [
      {
        name: 'nav.home',
        icon: '@tui.map',
        fn: () => this.router.navigateByUrl('/'),
      },
      {
        name: 'nav.areas',
        icon: '@tui.list',
        fn: () => this.router.navigateByUrl('/areas'),
      },
    ],
  });
  settings: Signal<OptionsData> = computed(() => ({
    preferences: [
      {
        name: 'settings.language',
        icon: this.flagPipe.transform(
          this.selectedLanguage() === 'es' ? 'es' : 'gb',
        ),
        fn: () => this.switchLanguage(),
      },
      {
        name: 'settings.theme',
        icon: `@tui.${this.selectedTheme() === 'dark' ? 'moon' : 'sun'}`,
        fn: () => this.switchTheme(),
      },
      {
        name: 'auth.logout',
        icon: '@tui.log-out',
        fn: () => this.logout(),
      },
    ],
  }));

  // ---- AuthZ (roles) ----
  readonly userRole: WritableSignal<UserRole | null> = signal<UserRole | null>(
    null,
  );
  readonly isAdmin = computed(() => this.userRole() === 'admin');

  /** Loads user role from Supabase user_profiles for current user (client only). Safe to call multiple times. */
  async ensureUserRoleLoaded(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    // If already loaded, skip
    if (this.userRole() !== null) return;
    await this.supabase.whenReady();
    const session = await this.supabase.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      this.userRole.set(null);
      return;
    }
    try {
      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      const role = (data?.role as UserRole | null) ?? null;
      this.userRole.set(role);
    } catch (e) {
      console.warn('[GlobalData] ensureUserRoleLoaded error', e);
      this.userRole.set(null);
    }
  }

  searchPopular: WritableSignal<string[]> = signal([
    'Wild Side',
    'Aixortà',
    'Rincón Bello',
  ]);

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
  area: WritableSignal<AreaDetail | null> = signal(null);
  crag: WritableSignal<ClimbingCrag | null> = signal(null);
  cragSectors: WritableSignal<ClimbingSector[]> = signal([]);
  sector: WritableSignal<ClimbingSector | null> = signal(null);
  route: WritableSignal<ClimbingRoute | null> = signal(null);
  routesPageable: WritableSignal<ClimbingRoutesPage | null> = signal(null);
  ascentsPageable: WritableSignal<AscentsPage | null> = signal(null);
  topo: WritableSignal<ClimbingTopo | null> = signal(null);

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
    } catch (err) {
      console.error(err);
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

  async loadCrag(countrySlug: string, cragSlug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const resp = await this.verticalLifeApi.getClimbingCrag(
        countrySlug,
        cragSlug,
      );
      this.crag.set(resp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
      if (msg.includes('HTTP 404')) {
        this.router.navigateByUrl('/page-not-found');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loadCragSectors(countrySlug: string, cragSlug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const sectors = await this.verticalLifeApi.getClimbingSectors(
        countrySlug,
        cragSlug,
      );
      this.cragSectors.set(sectors);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
      if (msg.includes('HTTP 404')) {
        this.router.navigateByUrl('/page-not-found');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loadCragRoutes(
    countrySlug: string,
    cragSlug: string,
    sectorSlug?: string,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const res = await this.verticalLifeApi.getClimbingCragRoutesPageable(
        countrySlug,
        cragSlug,
        { pageIndex: 0, sortField: 'totalascents', order: 'desc', sectorSlug },
      );
      this.routesPageable.set(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
      if (msg.includes('HTTP 404')) {
        this.router.navigateByUrl('/page-not-found');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loadCragAscents(
    countrySlug: string,
    cragSlug: string,
    params?: {
      sectorSlug?: string;
      pageIndex?: number;
      pageSize?: number;
      grade?: string;
      searchQuery?: string;
    },
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const pageIndex = params?.pageIndex ?? 0;
      const resp = await this.verticalLifeApi.getCragAscentsPageable(
        countrySlug,
        cragSlug,
        params,
      );
      if (pageIndex > 0 && this.ascentsPageable()) {
        const prev = this.ascentsPageable()!;
        this.ascentsPageable.set({
          items: [...prev.items, ...resp.items],
          pagination: resp.pagination,
        });
      } else {
        this.ascentsPageable.set(resp);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadRoute(
    countrySlug: string,
    cragSlug: string,
    sectorSlug: string,
    zlaggableSlug: string,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const resp = await this.verticalLifeApi.getClimbingRoute(
        countrySlug,
        cragSlug,
        sectorSlug,
        zlaggableSlug,
      );
      this.route.set(resp);
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

  toggleLikeRoute(id: number): void {
    console.log('toggleLikeRoute', id);
  }

  // ---- Auth helpers ----
  readonly tokenKey = 'auth_token';
  readonly tokenExpKey = 'auth_token_exp';

  login(username: string, password: string): boolean {
    // Mock login: any non-empty credentials
    if (!username || !password) return false;
    const token = 'mock-token-' + Math.random().toString(36).slice(2);
    const exp = Date.now() + 1000 * 60 * 60; // 1 hour
    this.localStorage.setItem(this.tokenKey, token);
    this.localStorage.setItem(this.tokenExpKey, String(exp));
    return true;
  }

  async logout() {
    try {
      await this.supabase.logout();
    } finally {
      this.localStorage.removeItem(this.tokenKey);
      this.localStorage.removeItem(this.tokenExpKey);
      void this.router.navigateByUrl('/login');
    }
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
  }

  private switchLanguage(): void {
    this.selectedLanguage.set(this.selectedLanguage() === 'es' ? 'en' : 'es');
    this.translate.use(this.selectedLanguage());
    this.localStorage.setItem('language', this.selectedLanguage());
  }

  private switchTheme(): void {
    this.selectedTheme.set(this.selectedTheme() === 'dark' ? 'light' : 'dark');
    this.localStorage.setItem('theme', this.selectedTheme());
  }

  resetDataByPage(page: 'home' | 'area' | 'crag' | 'sector' | 'route'): void {
    switch (page) {
      case 'home': {
        this.area.set(null);
        this.crag.set(null);
        this.sector.set(null);
        this.topo.set(null);
        this.route.set(null);
        this.cragSectors.set([]);
        this.routesPageable.set(null);
        this.ascentsPageable.set(null);
        this.selectedMapCragItem.set(null);
        break;
      }
      case 'area': {
        this.crag.set(null);
        this.sector.set(null);
        this.topo.set(null);
        this.route.set(null);
        this.cragSectors.set([]);
        this.routesPageable.set(null);
        this.ascentsPageable.set(null);
        break;
      }
      case 'crag': {
        this.sector.set(null);
        this.route.set(null);
        this.ascentsPageable.set(null);
        break;
      }
      case 'sector': {
        this.topo.set(null);
        break;
      }
    }
  }
}
