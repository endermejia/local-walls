import {
  computed,
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
  protected readonly flagPipe = new TuiFlagPipe();

  selectedLanguage: WritableSignal<'es' | 'en'> = signal('en');
  selectedTheme: WritableSignal<'light' | 'dark'> = signal('dark');

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
        icon: `@tui.${this.selectedTheme() === 'dark' ? 'sun' : 'moon'}`,
        fn: () => this.switchTheme(),
      },
      {
        name: 'auth.logout',
        icon: '@tui.log-out',
        fn: () => this.logout(),
      },
    ],
  }));

  searchPopular: WritableSignal<string[]> = signal(['GitHub', 'LinkedIn']);
  searchData: WritableSignal<SearchData> = signal({});

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

  zones: WritableSignal<Zone[]> = signal([
    {
      id: 'z1',
      name: 'Valencia',
      description: 'Zona mediterránea',
      cragIds: ['c1'],
    },
    {
      id: 'z2',
      name: 'Alicante',
      description: 'Costa Blanca',
      cragIds: ['c2'],
    },
  ]);

  crags: WritableSignal<Crag[]> = signal([
    {
      id: 'c1',
      name: 'Chulilla',
      description: 'Limestone canyon',
      ubication: { lat: 39.652, lng: -0.889 },
      parkings: ['p1'],
      approach: 20,
      zoneId: 'z1',
    },
    {
      id: 'c2',
      name: 'Sella',
      description: 'Classic multi-sector crag',
      ubication: { lat: 38.612, lng: -0.268 },
      parkings: ['p2'],
      approach: 10,
      zoneId: 'z2',
    },
  ]);

  parkings: WritableSignal<Parking[]> = signal([
    {
      id: 'p1',
      name: 'Parking Chulilla',
      ubication: { lat: 39.653, lng: -0.891 },
      cragId: 'c1',
      capacity: 50,
    },
    {
      id: 'p2',
      name: 'Parking Sella',
      ubication: { lat: 38.613, lng: -0.269 },
      cragId: 'c2',
      capacity: 30,
    },
  ]);

  topos: WritableSignal<Topo[]> = signal([
    { id: 't1', name: 'Topo Chulilla', cragId: 'c1', topoRouteIds: ['tr1'] },
    { id: 't2', name: 'Topo Sella', cragId: 'c2', topoRouteIds: ['tr2'] },
  ]);

  routesData: WritableSignal<Route[]> = signal([
    { id: 'r1', name: 'La Danza del Tigre', grade: '7b' },
    { id: 'r2', name: 'Torrente', grade: '6c+' },
  ]);

  topoRoutes: WritableSignal<TopoRoute[]> = signal([
    { id: 'tr1', number: 1, routeId: 'r1', topoId: 't1' },
    { id: 'tr2', number: 2, routeId: 'r2', topoId: 't2' },
  ]);

  ascents: WritableSignal<Ascent[]> = signal([]);

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

  selectedCragTopos = computed(() => {
    const id = this.selectedCragId();
    if (!id) return [] as Topo[];
    return this.topos().filter((t) => t.cragId === id);
  });

  zonesNotLiked = computed(() => {
    const likedIds = new Set(this.appUser()?.likedZones ?? []);
    return this.zones().filter((z) => !likedIds.has(z.id));
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
  isZoneLiked(id: string): boolean {
    return new Set(this.appUser()?.likedZones ?? []).has(id);
  }
  isCragLiked(id: string): boolean {
    return new Set(this.appUser()?.likedCrags ?? []).has(id);
  }
  isTopoLiked(id: string): boolean {
    return new Set(this.appUser()?.likedTopos ?? []).has(id);
  }
  isRouteLiked(id: string): boolean {
    return new Set(this.appUser()?.likedRoutes ?? []).has(id);
  }

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
