import {
  computed,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TuiFlagPipe } from '@taiga-ui/core';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorage } from './local-storage';
import { ApiService } from './api.service';
import { TUI_ENGLISH_LANGUAGE, TUI_SPANISH_LANGUAGE } from '@taiga-ui/i18n';
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
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private translate = inject(TranslateService);
  private localStorage = inject(LocalStorage);
  private router = inject(Router);
  private api = inject(ApiService);
  protected readonly flagPipe = new TuiFlagPipe();

  selectedLanguage: WritableSignal<'es' | 'en'> = signal('es');
  selectedTheme: WritableSignal<'light' | 'dark'> = signal('light');

  // Computed signal for Taiga UI language based on selectedLanguage
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

    // translate group labels
    const t = (key: string) => this.translate.instant(key);
    const zonesLabel = t('labels.zones');
    const cragsLabel = t('labels.crags');
    const routesLabel = t('labels.routes');

    // quick helper for zone name by id
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

  // ---- Climbing App State (signals) ----
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

  // Sync from ApiService when data is loaded (browser side)
  private readonly syncFromApi = effect(() => {
    if (this.api.loaded()) {
      this.zones.set(this.api.zones());
      this.crags.set(this.api.crags());
      this.parkings.set(this.api.parkings());
      this.topos.set(this.api.topos());
      this.routesData.set(this.api.routes());
      this.topoRoutes.set(this.api.topoRoutes());
    }
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
    // Rebuild search labels when translations load or language changes
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

  // Themed icon source as a computed signal
  iconSrc = computed(() => {
    const theme = this.selectedTheme();
    return (name: 'crag' | 'route' | 'topo' | 'zone' | '8anu') =>
      `/image/${name}-${theme}.svg`;
  });
}
