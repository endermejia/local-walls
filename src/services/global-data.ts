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
import { countRoutesByGrade } from '../utils';
import type {
  SearchData,
  OptionsData,
  Zone,
  Parking,
  Crag,
  Topo,
  Route,
  TopoRoute,
  Ascent,
  User,
  IconName,
  RoutesByGrade,
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

  // Loading/Status state
  readonly loaded = signal(true);
  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal(null);

  selectedLanguage: WritableSignal<'es' | 'en'> = signal('es');
  selectedTheme: WritableSignal<'light' | 'dark'> = signal('light');

  tuiLanguage: Signal<
    typeof TUI_SPANISH_LANGUAGE | typeof TUI_ENGLISH_LANGUAGE
  > = computed(() =>
    this.selectedLanguage() === 'es'
      ? TUI_SPANISH_LANGUAGE
      : TUI_ENGLISH_LANGUAGE,
  );

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
  searchData: WritableSignal<SearchData> = signal({});
  private readonly i18nTick: WritableSignal<number> = signal(0);

  private readonly buildSearchData = effect(() => {
    this.i18nTick();
    const zones = this.zones();
    const crags = this.crags();
    const routes = this.routesData();

    const t = (key: string) => this.translate.instant(key);
    const zonesLabel = t('labels.zones');
    const cragsLabel = t('labels.crags');
    const routesLabel = t('labels.routes');

    const zoneNameById = new Map(zones.map((z) => [z.id, z.name] as const));

    const search: SearchData = {
      [zonesLabel]: zones.map((z) => ({
        href: `/zone/${z.id}`,
        title: z.name,
        subtitle: `${z.cragIds?.length ?? 0} ${t('labels.crags')}`,
        icon: '@tui.map-pinned',
      })),
      [cragsLabel]: crags.map((c) => ({
        href: `/crag/${c.id}`,
        title: c.name,
        subtitle: zoneNameById.get(c.zoneId) ?? '',
        icon: '@tui.mountain',
      })),
      [routesLabel]: routes.map((r) => ({
        href: `/route/${r.id}`,
        title: r.name,
        subtitle: r.grade ?? '',
        icon: '@tui.route',
      })),
    };

    this.searchData.set(search);
  });

  appUser: WritableSignal<User | null> = signal({
    id: 'u1',
    name: 'Climber One',
    picture: 'https://placehold.co/48x48',
    likedRoutes: [],
    likedCrags: [],
    likedZones: ['z1'],
    likedTopos: [],
    ascents: [],
  });

  zones: WritableSignal<Zone[]> = signal([]);
  crags: WritableSignal<Crag[]> = signal([]);
  parkings: WritableSignal<Parking[]> = signal([]);
  topos: WritableSignal<Topo[]> = signal([]);
  routesData: WritableSignal<Route[]> = signal([]);
  topoRoutes: WritableSignal<TopoRoute[]> = signal([]);
  ascents: WritableSignal<Ascent[]> = signal([]);

  // ---- CRUD helpers ----
  // Zones
  addZone(zone: Zone): void {
    this.zones.set([...this.zones(), zone]);
  }
  // Crags
  addCrag(crag: Crag): void {
    this.crags.set([...this.crags(), crag]);
    // also reflect in zone.cragIds
    this.zones.set(
      this.zones().map((z) =>
        z.id === crag.zoneId
          ? {
              ...z,
              cragIds: Array.from(new Set([...(z.cragIds ?? []), crag.id])),
            }
          : z,
      ),
    );
  }
  // Topos
  addTopo(topo: Topo): void {
    this.topos.set([...this.topos(), topo]);
  }
  // Routes
  addRoute(route: Route): void {
    this.routesData.set([...this.routesData(), route]);
  }
  // TopoRoutes
  addTopoRoute(tr: TopoRoute): void {
    this.topoRoutes.set([...this.topoRoutes(), tr]);
    // reflect in topo.topoRouteIds
    this.topos.set(
      this.topos().map((t) =>
        t.id === tr.topoId
          ? {
              ...t,
              topoRouteIds: Array.from(
                new Set([...(t.topoRouteIds ?? []), tr.id]),
              ),
            }
          : t,
      ),
    );
  }

  // ---- Remote loading (8a.nu) ----
  async loadZonesAndCragsFromBounds(bounds: {
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
      const locations = await this.verticalLifeApi.getMapLocations(bounds);
      const zonesIndex = new Map(this.zones().map((z) => [z.id, z] as const));
      const cragsIndex = new Map(this.crags().map((c) => [c.id, c] as const));
      for (const loc of locations) {
        const zoneId = String(loc.id);
        if (!zonesIndex.has(zoneId)) {
          const z: Zone = {
            id: zoneId,
            name: loc.name,
            cragIds: [],
            slug: loc.slug,
            countrySlug: loc.country_slug,
          };
          this.addZone(z);
          zonesIndex.set(zoneId, z);
        }
        const cragId = loc.slug;
        if (!cragsIndex.has(cragId)) {
          const c: Crag = {
            id: cragId,
            name: loc.name,
            location: { lat: loc.latitude, lng: loc.longitude },
            parkings: [],
            zoneId,
          };
          this.addCrag(c);
          cragsIndex.set(cragId, c);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadZoneById(zoneId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    if (this.zones().some((z) => z.id === zoneId)) return;
    try {
      this.loading.set(true);
      const locations = await this.verticalLifeApi.getMapLocations({
        south_west_latitude: -90,
        south_west_longitude: -180,
        north_east_latitude: 90,
        north_east_longitude: 180,
        zoom: 5,
        page_index: 0,
        page_size: 20,
      });
      const target = locations.find((l) => String(l.id) === String(zoneId));
      if (!target) return;
      const z: Zone = {
        id: String(target.id),
        name: target.name,
        cragIds: [],
        slug: target.slug,
        countrySlug: target.country_slug,
      };
      if (!this.zones().some((x) => x.id === z.id)) {
        this.addZone(z);
      }
      const cragId = target.slug;
      if (!this.crags().some((c) => c.id === cragId)) {
        const c: Crag = {
          id: cragId,
          name: target.name,
          location: { lat: target.latitude, lng: target.longitude },
          parkings: [],
          zoneId: z.id,
        };
        this.addCrag(c);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCragRoutes(cragId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined')
      return;
    const crag = this.crags().find((c) => c.id === cragId);
    if (!crag) return;
    const zone = this.zones().find((z) => z.id === crag.zoneId);
    const country = zone?.countrySlug || 'spain';
    const cragSlug = crag.id;
    try {
      this.loading.set(true);
      const res = await this.verticalLifeApi.getRoutesByCrag(
        country,
        cragSlug,
        { pageIndex: 0, sortField: 'totalascents', order: 'desc' },
      );
      let topo = this.topos().find((t) => t.cragId === cragId);
      if (!topo) {
        topo = {
          id: `topo-${cragId}`,
          name: `${crag.name}`,
          cragId,
          topoRouteIds: [],
        };
        this.addTopo(topo);
      }
      const routeIndex = new Map(
        this.routesData().map((r) => [r.id, r] as const),
      );
      let nextNumber =
        this.topoRoutes().filter((tr) => tr.topoId === topo!.id).length + 1;
      for (const item of res.items ?? []) {
        const routeId = String(item.zlaggableId);
        if (!routeIndex.has(routeId)) {
          const r: Route = {
            id: routeId,
            name: item.zlaggableName,
            grade: item.difficulty,
            url_8anu: undefined,
          };
          this.addRoute(r);
          routeIndex.set(routeId, r);
        }
        const already = this.topoRoutes().some(
          (x) => x.topoId === topo!.id && x.routeId === routeId,
        );
        if (!already) {
          this.addTopoRoute({
            id: `${topo!.id}-${routeId}`,
            number: nextNumber++,
            routeId,
            topoId: topo!.id,
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  cragRoutesByGrade = computed(() => {
    void this.topos();
    void this.topoRoutes();
    void this.routesData();
    return (cragId: string): RoutesByGrade => {
      const topos = this.topos().filter((t) => t.cragId === cragId);
      if (!topos.length) return {} as RoutesByGrade;
      const topoIds = new Set(topos.map((t) => t.id));
      const routeIds = new Set(
        this.topoRoutes()
          .filter((tr) => topoIds.has(tr.topoId))
          .map((tr) => tr.routeId),
      );
      return countRoutesByGrade(routeIds, this.routesData());
    };
  });

  zoneRoutesByGrade = computed(() => {
    void this.crags();
    void this.topos();
    void this.topoRoutes();
    void this.routesData();
    return (zoneId: string): RoutesByGrade => {
      const cragIds = new Set(
        this.crags()
          .filter((c) => c.zoneId === zoneId)
          .map((c) => c.id),
      );
      if (cragIds.size === 0) return {} as RoutesByGrade;
      const topos = this.topos().filter((t) => cragIds.has(t.cragId));
      if (!topos.length) return {} as RoutesByGrade;
      const topoIds = new Set(topos.map((t) => t.id));
      const routeIds = new Set(
        this.topoRoutes()
          .filter((tr) => topoIds.has(tr.topoId))
          .map((tr) => tr.routeId),
      );
      return countRoutesByGrade(routeIds, this.routesData());
    };
  });

  routesByGradeForSelectedZone = computed(() => {
    const zId = this.selectedZoneId();
    if (!zId) return {} as RoutesByGrade;
    return this.zoneRoutesByGrade()(zId);
  });

  routesByGradeForSelectedCrag = computed(() => {
    const cId = this.selectedCragId();
    if (!cId) return {} as RoutesByGrade;
    return this.cragRoutesByGrade()(cId);
  });

  topoRoutesByGrade = computed(() => {
    void this.topoRoutes();
    void this.routesData();
    return (topoId: string): RoutesByGrade => {
      const routeIds = new Set(
        this.topoRoutes()
          .filter((tr) => tr.topoId === topoId)
          .map((tr) => tr.routeId),
      );
      if (routeIds.size === 0) return {} as RoutesByGrade;
      return countRoutesByGrade(routeIds, this.routesData());
    };
  });

  selectedZoneId: WritableSignal<string | null> = signal(null);
  selectedCragId: WritableSignal<string | null> = signal(null);
  selectedTopoId: WritableSignal<string | null> = signal(null);
  selectedRouteId: WritableSignal<string | null> = signal(null);

  likedZones = computed(() => {
    const user = this.appUser();
    const liked = new Set(user?.likedZones ?? []);
    return this.zones().filter((z) => liked.has(z.id));
  });

  zonesSorted = computed(() => {
    const likedIds = new Set(this.appUser()?.likedZones ?? []);
    return [...this.zones()].sort(
      (a, b) =>
        +!likedIds.has(a.id) - +!likedIds.has(b.id) ||
        a.name.localeCompare(b.name),
    );
  });

  selectedZoneCrags = computed(() => {
    const id = this.selectedZoneId();
    if (!id) return [] as Crag[];
    return this.crags().filter((c) => c.zoneId === id);
  });

  zoneNameById = computed(() => {
    const map = new Map(this.zones().map((z) => [z.id, z.name] as const));
    return (id: string) => map.get(id) ?? '';
  });

  selectedCragTopos = computed(() => {
    const id = this.selectedCragId();
    if (!id) return [] as Topo[];
    return this.topos().filter((t) => t.cragId === id);
  });

  setSelectedZone(id: string | null) {
    this.selectedZoneId.set(id);
  }

  setSelectedCrag(id: string | null) {
    this.selectedCragId.set(id);
  }

  setSelectedTopo(id: string | null) {
    this.selectedTopoId.set(id);
  }

  setSelectedRoute(id: string | null) {
    this.selectedRouteId.set(id);
  }

  // ---- Likes helpers ----
  isZoneLiked = computed(() => {
    const liked = new Set(this.appUser()?.likedZones ?? []);
    return (id: string) => liked.has(id);
  });
  isCragLiked = computed(() => {
    const liked = new Set(this.appUser()?.likedCrags ?? []);
    return (id: string) => liked.has(id);
  });
  isTopoLiked = computed(() => {
    const liked = new Set(this.appUser()?.likedTopos ?? []);
    return (id: string) => liked.has(id);
  });
  isRouteLiked = computed(() => {
    const liked = new Set(this.appUser()?.likedRoutes ?? []);
    return (id: string) => liked.has(id);
  });

  private toggleInList(list: string[] | undefined, id: string): string[] {
    const s = new Set(list ?? []);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    return Array.from(s);
  }

  toggleLikeZone(id: string): void {
    const user = this.appUser();
    if (!user) return;
    const likedZones = this.toggleInList(user.likedZones, id);
    this.appUser.set({ ...user, likedZones });
  }

  toggleLikeCrag(id: string): void {
    const user = this.appUser();
    if (!user) return;
    const likedCrags = this.toggleInList(user.likedCrags, id);
    this.appUser.set({ ...user, likedCrags });
  }

  toggleLikeTopo(id: string): void {
    const user = this.appUser();
    if (!user) return;
    const likedTopos = this.toggleInList(user.likedTopos ?? [], id);
    this.appUser.set({ ...user, likedTopos });
  }

  toggleLikeRoute(id: string): void {
    const user = this.appUser();
    if (!user) return;
    const likedRoutes = this.toggleInList(user.likedRoutes, id);
    this.appUser.set({ ...user, likedRoutes });
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

  iconSrc: Signal<(name: IconName) => string> = computed(() => {
    const theme = this.selectedTheme();
    return (name: IconName) => `/image/${name}-${theme}.svg`;
  });
}
