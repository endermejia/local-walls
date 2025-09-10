import {
  computed,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { ClimbingSector, VerticalLifeApi } from './vertical-life-api';
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
  ClimbingTopo,
  IconName,
  MapCragItem,
  MapItem,
  MapResponse,
  OptionsData,
  SearchData,
} from '../models';
import { PageableResponse } from '../models/pagination.model';

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

  // Loading/Status state
  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal(null);

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
  // TODO: transform to use verticalLifeApi => getMapItemsBySearch
  searchData: WritableSignal<SearchData> = signal({});
  private readonly i18nTick: WritableSignal<number> = signal(0);

  // TODO: implement likes
  liked: WritableSignal<boolean> = signal(false);

  mapResponse: WritableSignal<MapResponse | null> = signal(null);
  mapItems: Signal<MapItem[]> = computed(() => this.mapResponse()?.items ?? []);
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
    } finally {
      this.loading.set(false);
    }
  }

  async loadMapItems(bounds: {
    south_west_latitude: number;
    south_west_longitude: number;
    north_east_latitude: number;
    north_east_longitude: number;
    zoom: number;
    page_index?: number;
    page_size?: number;
  }): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const mapResponse: MapResponse =
        await this.verticalLifeApi.getMapResponse(bounds);
      this.mapResponse.set(mapResponse);
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
    } finally {
      this.loading.set(false);
    }
  }

  async loadRoute(
    countrySlug: string,
    cragSlug: string,
    sectorSlug: string,
    zlaggableId: string,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    try {
      this.loading.set(true);
      const resp = await this.verticalLifeApi.getClimbingRoute(
        countrySlug,
        cragSlug,
        sectorSlug,
        zlaggableId,
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
}
