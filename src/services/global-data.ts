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
import { Router } from '@angular/router';
import { TUI_ENGLISH_LANGUAGE, TUI_SPANISH_LANGUAGE } from '@taiga-ui/i18n';
import { TranslateService } from '@ngx-translate/core';
import { TuiFlagPipe } from '@taiga-ui/core';
import type {
  ClimbingArea,
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
  PageableResponse,
  SearchData,
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
  protected readonly flagPipe = new TuiFlagPipe();

  // ---- Map cache (keeps already downloaded items) ----
  private readonly mapCache = new Map<number, MapItem>();
  private readonly maxCacheItems = 1000;
  private readonly cachedMapItems: WritableSignal<MapItem[]> = signal([]);

  /**
   * Refresh a single map item by id by calling 8a.nu item endpoint.
   * Merges it into cache and updates selected item if it matches.
   * SSR-safe: no-op on server.
   */
  async refreshMapItemById(id: number): Promise<MapCragItem | void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    const item = await this.verticalLifeApi.getMapItemById(id);
    if (!item || typeof (item as any).id !== 'number') return;
    this.mapCache.set((item as any).id as number, item);
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
    Navigation: [
      {
        name: 'Home',
        icon: '@tui.home',
        fn: () => this.router.navigateByUrl('/'),
      },
      {
        name: 'Not found',
        icon: '@tui.alert-circle',
        fn: () => this.router.navigateByUrl('/404'),
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
  searchPopular: WritableSignal<string[]> = signal([
    'Wild Side',
    'Aixortà',
    'Rincón Bello',
  ]);
  // TODO: use verticalLifeApi => getMapItemsBySearch
  searchData: WritableSignal<SearchData> = signal({});

  // TODO: implement likes
  liked: WritableSignal<boolean> = signal(false);

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
      const area = (it as any).area_type === 0;
      if (!area) {
        const lat = (it as any).latitude as number | undefined;
        const lng = (it as any).longitude as number | undefined;
        return (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          pointIn(lat, lng)
        );
      }
      const box = (it as any).b_box as
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
  area: WritableSignal<ClimbingArea | null> = signal(null);
  crag: WritableSignal<ClimbingCrag | null> = signal(null);
  cragsPageable: WritableSignal<PageableResponse<ClimbingCrag> | null> =
    signal(null);
  cragSectors: WritableSignal<ClimbingSector[]> = signal([]);
  sector: WritableSignal<ClimbingSector | null> = signal(null);
  route: WritableSignal<ClimbingRoute | null> = signal(null);
  routesPageable: WritableSignal<PageableResponse<ClimbingRoute> | null> =
    signal(null);
  topo: WritableSignal<ClimbingTopo | null> = signal(null);

  async loadMapItems(bounds: MapBounds): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const mapResponse: MapResponse =
        await this.verticalLifeApi.getMapResponse(bounds);
      this.mapResponse.set(mapResponse);

      // Merge fetched items into a cache (dedupe by id)
      const items = mapResponse?.items ?? [];
      if (Array.isArray(items)) {
        for (const it of items) {
          const id = (it as any)?.id as number | undefined;
          if (typeof id === 'number') {
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
            this.mapCache.set((it as any).id as number, it);
          }
        }
        this.cachedMapItems.set(arr);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadArea(countrySlug: string, areaSlug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const resp = await this.verticalLifeApi.getClimbingArea(
        countrySlug,
        areaSlug,
      );
      this.area.set(resp);
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

  async loadAreaCrags(
    countrySlug: string,
    areaSlug: string,
    params?: {
      pageIndex?: number;
      sortField?: 'totalascents' | 'grade' | 'name';
      order?: 'asc' | 'desc';
      category?: number;
    },
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const resp = await this.verticalLifeApi.getClimbingCragsPageable(
        countrySlug,
        areaSlug,
        params,
      );
      this.cragsPageable.set(resp);
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

  // TODO: implement likes

  toggleLikeZone(id: string): void {
    console.log('toggleLikeZone', id);
  }

  toggleLikeCrag(id: string): void {
    console.log('toggleLikeCrag', id);
  }

  toggleLikeTopo(id: string): void {
    console.log('toggleLikeTopo', id);
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

  logout() {
    this.localStorage.removeItem(this.tokenKey);
    this.localStorage.removeItem(this.tokenExpKey);
    // After logging out, redirect to login
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return this.localStorage.getItem(this.tokenKey);
  }

  isTokenValid(): boolean {
    const token = this.localStorage.getItem(this.tokenKey);
    const expStr = this.localStorage.getItem(this.tokenExpKey);
    if (!token || !expStr) return false;
    const exp = Number(expStr);
    return Date.now() < exp;
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
        this.loadMapItems(mapBounds);
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
        break;
      }
      case 'crag': {
        this.sector.set(null);
        this.route.set(null);
        break;
      }
      case 'sector': {
        this.topo.set(null);
        break;
      }
    }
  }
}
