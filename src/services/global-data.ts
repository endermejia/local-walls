import { isPlatformBrowser } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';

import { TUI_BREAKPOINT } from '@taiga-ui/core';
import {
  TUI_ENGLISH_LANGUAGE,
  TUI_FRENCH_LANGUAGE,
  TUI_GERMAN_LANGUAGE,
  TUI_ITALIAN_LANGUAGE,
  TUI_SPANISH_LANGUAGE,
  TuiLanguage,
} from '@taiga-ui/i18n';

import { TranslateService } from '@ngx-translate/core';

import { map, merge, startWith } from 'rxjs';

import { AppNotificationsService } from './app-notifications.service';
import { CacheService } from './cache.service';
import { FavoritesService } from './favorites.service';
import { MessagingService } from './messaging.service';
import { PushService } from './push.service';
import { SupabaseService } from './supabase.service';
import { FilterStateService } from './filter-state.service';
import { MapDataService } from './map-data.service';
import { TopoDataService } from './topo-data.service';
import { ProfileDataService } from './profile-data.service';

import {
  AreaListItem,
  AscentType,
  BreadcrumbItem,
  CragDetail,
  CragDto,
  CragListItem,
  EquipperDto,
  Language,
  Languages,
  MapIndoorCenterItem,
  MapIndoorCenterRaw,
  MapIndoorRouteRaw,
  ParkingDto,
  Theme,
  Themes,
  UserProfileDto,
  IndoorCenterDto,
  IndoorRouteWithExtras,
  AmountByEveryGrade,
  VERTICAL_LIFE_GRADES,
  RouteAscentDto,
  RouteDto,
  RouteWithExtras,
} from '../models';

import { LocalStorage } from './local-storage';
import {
  triggerThemeTransition,
  mapRouteToExtras,
  RawRouteData,
} from '../utils';
import { resource } from '@angular/core';

/**
 * GlobalData is now a facade that delegates to domain services.
 * It maintains full backward compatibility while the domain services
 * are being adopted by consumers.
 *
 * New code should inject the domain services directly:
 * - FilterStateService for filter state
 * - MapDataService for map data
 * - TopoDataService for topo/crag/route data
 * - ProfileDataService for profile and ascents data
 */
@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private readonly cache = inject(CacheService);
  private readonly favorites = inject(FavoritesService);
  private readonly messagingService = inject(MessagingService);
  private readonly notificationsService = inject(AppNotificationsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly push = inject(PushService);
  private readonly supabase = inject(SupabaseService);
  private breakpointService = toObservable(inject(TUI_BREAKPOINT));
  private localStorage = inject(LocalStorage);
  private translate = inject(TranslateService);

  // Domain services
  readonly filterState = inject(FilterStateService);
  readonly mapData = inject(MapDataService);
  readonly topoData = inject(TopoDataService);
  readonly profileData = inject(ProfileDataService);

  readonly isMobile = toSignal(
    this.breakpointService.pipe(map((b) => b === 'mobile')),
    { initialValue: false },
  );

  // Loading/Status state
  readonly error: WritableSignal<string | null> = signal(null);
  readonly isNavLoading: WritableSignal<boolean> = signal(false);
  readonly showCart: WritableSignal<boolean> = signal(false);
  readonly isOffline = signal(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  readonly topoPhotoVersion: WritableSignal<number> = signal(0);

  // ---- Language ----
  readonly i18nTick: WritableSignal<number> = signal(0);
  readonly selectedLanguage: Signal<Language> = computed(
    () => this.userProfile()?.language || Languages.ES,
  );

  readonly currentLang = toSignal(
    this.translate.onLangChange.pipe(map((e) => e.lang as Language)),
    { initialValue: this.translate.currentLang as Language },
  );

  tuiLanguage: Signal<TuiLanguage> = computed(() => {
    const lang = this.selectedLanguage();
    switch (lang) {
      case Languages.ES:
        return TUI_SPANISH_LANGUAGE;
      case Languages.DE:
        return TUI_GERMAN_LANGUAGE;
      case Languages.FR:
        return TUI_FRENCH_LANGUAGE;
      case Languages.IT:
        return TUI_ITALIAN_LANGUAGE;
      default:
        return TUI_ENGLISH_LANGUAGE;
    }
  });

  // ---- Theme ----
  readonly theme = signal<Theme>(Themes.LIGHT);
  readonly selectedTheme = this.theme.asReadonly();

  setTheme(newTheme: Theme, event?: MouseEvent) {
    if (this.theme() === newTheme) return;
    void triggerThemeTransition(event, () => {
      this.theme.set(newTheme);
    });
  }

  // ---- Breadcrumbs ----
  breadcrumbs: Signal<BreadcrumbItem[]> = computed<BreadcrumbItem[]>(() => {
    this.i18nTick();
    const indoorCenter = this.selectedIndoorCenter();
    const indoorRoute = this.selectedIndoorRoute();
    const topo = this.topoDetail();
    if (indoorCenter) {
      const items: BreadcrumbItem[] = [
        { caption: 'indoor.title', routerLink: ['/indoor'] },
        {
          caption: indoorCenter.name,
          routerLink: ['/indoor', indoorCenter.slug],
        },
      ];
      if (topo && topo.center_id === indoorCenter.id) {
        items.push({
          caption: topo.name,
          routerLink: ['/indoor', indoorCenter.slug, 'topo', topo.id],
        });
      }
      if (indoorRoute) {
        items.push({
          caption: indoorRoute.name,
          routerLink: ['/indoor', indoorCenter.slug, 'route', indoorRoute.slug],
        });
      }
      return items;
    }

    const items: BreadcrumbItem[] = [
      { caption: 'areas', routerLink: ['/area'] },
    ];

    const area = this.selectedArea();
    const crag = this.selectedCrag();
    const route = this.routeDetail();

    if (area) {
      items.push({
        caption: area.name,
        routerLink: ['/area', area.slug],
      });
      if (crag) {
        items.push({
          caption: crag.name,
          routerLink: ['/area', area.slug, crag.slug],
        });
        if (topo) {
          items.push({
            caption: topo.name,
            routerLink: ['/area', area.slug, crag.slug, 'topo', topo.id],
          });
        }
        if (route) {
          items.push({
            caption: route.name,
            routerLink: ['/area', area.slug, crag.slug, route.slug],
          });
        }
      }
    }

    return items.filter((i) => !!i.caption);
  });

  slicedBreadcrumbs: Signal<BreadcrumbItem[]> = computed(() =>
    this.breadcrumbs().slice(0, -1),
  );

  // Notifications and messages
  readonly unreadNotificationsCount = this.notificationsService.unreadCount;
  readonly unreadMessagesCount = this.messagingService.unreadMessagesCount;

  // ---- Auth (roles) ----
  readonly userProfile = computed(() => this.supabase.userProfile());
  readonly editingMode = signal(false);
  private readonly editingModeStorageKey = 'editing_mode_v2';

  readonly isAdmin = computed(() => !!this.userProfile()?.is_admin);
  readonly merchandisingFeature = computed(() => this.isAdmin());
  readonly indoorFeature = computed(() => this.isAdmin());
  readonly canEditAsAdmin = computed(
    () => this.editingMode() && this.isAdmin(),
  );
  readonly isAreaAdmin = computed(() => this.adminAreas().length > 0);
  readonly isIndoorAdmin = computed(() => this.adminIndoorCenters().length > 0);

  readonly adminAreas = computed(() => this.supabase.adminAreas());
  readonly adminIndoorCenters = computed(() =>
    this.supabase.adminIndoorCenters(),
  );

  readonly pendingAdminRequestsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [] as number[];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('area_admin_requests')
        .select('area_id')
        .eq('user_id', userId);
      if (error) {
        return [] as number[];
      }
      return (data ?? []).map((r) => r.area_id);
    },
  });

  readonly pendingAdminRequestAreaIds = computed(
    () => new Set(this.pendingAdminRequestsResource.value() ?? []),
  );

  readonly canEditAsAreaAdmin = computed(
    () => this.editingMode() && this.isAreaAdmin(),
  );

  readonly areaAdminPermissions = computed(() => {
    const isAdmin = this.canEditAsAdmin();
    const isEditing = this.editingMode();
    const areas = this.adminAreas();

    const res: Record<number, boolean> = {};
    if (isEditing) {
      areas.forEach((id) => (res[id] = true));
    }

    return isAdmin ? new Proxy(res, { get: () => true }) : res;
  });

  readonly indoorAdminPermissions = computed(() => {
    const isAdmin = this.canEditAsAdmin();
    const isEditing = this.editingMode();
    const centers = this.adminIndoorCenters();

    const res: Record<string, boolean> = {};
    if (isEditing) {
      centers.forEach((id) => (res[id] = true));
    }

    return isAdmin ? new Proxy(res, { get: () => true }) : res;
  });

  readonly checkAreaEditPermission = (
    area:
      | AreaListItem
      | {
          id: number;
          user_creator_id?: string | null;
          created_at?: string | null;
        }
      | null
      | undefined,
  ) => {
    if (this.canEditAsAdmin() || this.areaAdminPermissions()[area?.id ?? -1])
      return true;
    const userId = this.userProfile()?.id;
    if (!area || !userId || !this.editingMode()) return false;
    const isCreator = area.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(area.created_at);
  };

  readonly canEditArea = computed(() =>
    this.checkAreaEditPermission(this.selectedArea()),
  );

  readonly checkCragEditPermission = (
    crag: CragListItem | CragDetail | null | undefined,
  ) => {
    if (
      this.canEditAsAdmin() ||
      this.areaAdminPermissions()[crag?.area_id ?? -1]
    )
      return true;
    const userId = this.userProfile()?.id;
    if (!crag || !userId || !this.editingMode()) return false;
    const isCreator = crag.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(crag.created_at);
  };

  readonly canEditCrag = computed(() =>
    this.checkCragEditPermission(this.cragDetail()),
  );

  readonly checkRouteEditPermission = (
    route: RouteWithExtras | null | undefined,
  ) => {
    if (
      this.canEditAsAdmin() ||
      this.areaAdminPermissions()[route?.area_id ?? -1]
    )
      return true;
    const userId = this.userProfile()?.id;
    if (!route || !userId || !this.editingMode()) return false;
    const isCreator = route.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(route.created_at);
  };

  readonly canEditRoute = computed(() =>
    this.checkRouteEditPermission(this.routeDetail()),
  );

  readonly canEditCragRoutes = computed(() => {
    const res: Record<number, boolean> = {};
    const routes = this.cragRoutes() ?? [];
    routes.forEach((r: RouteWithExtras) => {
      res[r.id] = this.checkRouteEditPermission(r);
    });
    return res;
  });

  private isWithinOneWeek(createdAt: string | null | undefined): boolean {
    if (!createdAt) return true;
    const date = new Date(createdAt);
    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - date.getTime() < oneWeekInMs;
  }

  readonly userAvatar = computed(() =>
    this.supabase.buildAvatarUrl(this.userProfile()?.avatar),
  );

  // ---- Audio Preferences ----
  readonly messageSoundEnabled: WritableSignal<boolean> = signal(true);
  readonly notificationSoundEnabled: WritableSignal<boolean> = signal(false);

  // ---- Delegated to MapDataService ----
  readonly mapActive = this.mapData.mapActive;
  mapBounds = this.mapData.mapBounds;
  readonly mapResource = this.mapData.mapResource;
  mapItemsOnViewport = this.mapData.mapItemsOnViewport;
  selectedMapCragItem = this.mapData.selectedMapCragItem;
  selectedMapParkingItem = this.mapData.selectedMapParkingItem;
  readonly parkingsMapResource = this.mapData.parkingsMapResource;
  readonly areasMapResource = this.mapData.areasMapResource;

  // ---- Delegated to FilterStateService ----
  areaListGradeRange = this.filterState.areaListGradeRange;
  areaListCategories = this.filterState.areaListCategories;
  areaListShade = this.filterState.areaListShade;
  areaListShowIndoor = this.filterState.areaListShowIndoor;
  areaListShowOutdoor = this.filterState.areaListShowOutdoor;

  feedGradeRange = this.filterState.feedGradeRange;
  feedCategories = this.filterState.feedCategories;
  feedShowIndoorAscents = this.filterState.feedShowIndoorAscents;

  // ---- Indoor Centers ----
  selectedIndoorCenter: WritableSignal<IndoorCenterDto | null> = signal(null);
  selectedIndoorRoute: WritableSignal<IndoorRouteWithExtras | null> =
    signal(null);
  indoorRoutesReloadTick: WritableSignal<number> = signal(0);

  // ---- Liked / Favorites (Shared) ----
  readonly likedAreasResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_liked_areas_${userId}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          return this.favorites.getLikedAreas(userId);
        },
        { fallbackValue: [], logTag: 'GlobalData' },
      );
    },
  });

  readonly likedCragsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_liked_crags_${userId}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          return this.favorites.getLikedCrags(userId);
        },
        { fallbackValue: [], logTag: 'GlobalData' },
      );
    },
  });

  readonly likedRoutesResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_liked_routes_${userId}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          return this.favorites.getLikedRoutes(userId);
        },
        { fallbackValue: [], logTag: 'GlobalData' },
      );
    },
  });

  readonly likedAreas = computed(() => {
    const val = this.likedAreasResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.cache.get<AreaListItem[]>(
      `cached_liked_areas_${userId}_v2`,
      [],
    );
  });
  readonly likedCrags = computed(() => {
    const val = this.likedCragsResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.cache.get<CragListItem[]>(
      `cached_liked_crags_${userId}_v2`,
      [],
    );
  });
  readonly likedRoutes = computed(() => {
    const val = this.likedRoutesResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.cache.get<RouteWithExtras[]>(
      `cached_liked_routes_${userId}_v2`,
      [],
    );
  });

  readonly likedAreaIds = computed(() =>
    this.likedAreas().map((a: AreaListItem) => a.id),
  );
  readonly likedCragIds = computed(() =>
    this.likedCrags().map((c: CragListItem) => c.id),
  );
  readonly likedRouteIds = computed(() =>
    this.likedRoutes().map((r: RouteWithExtras) => r.id),
  );

  // ---- Equippers ----
  selectedEquipperId: WritableSignal<number | null> = signal(null);

  readonly equipperDetailResource = resource({
    params: () => this.selectedEquipperId(),
    loader: async ({ params: id }) => {
      if (!id || !isPlatformBrowser(this.platformId)) return null;
      await this.supabase.whenReady();

      const { data, error } = await this.supabase.client
        .from('equippers')
        .select('*, user_profile:user_profiles(*)')
        .eq('id', id)
        .single();

      if (error) {
        return null;
      }

      return data as unknown as EquipperDto & {
        user_profile: UserProfileDto | null;
      };
    },
  });

  readonly equipperRoutesResource = resource({
    params: () => this.selectedEquipperId(),
    loader: async ({ params: id }) => {
      if (!id || !isPlatformBrowser(this.platformId)) return [];
      await this.supabase.whenReady();
      const userId = this.supabase.authUser()?.id;

      let query = this.supabase.client.from('route_equippers').select(
        `
          route:routes (
            *,
            liked:route_likes(id),
            project:route_projects(id),
            ascents:route_ascents(rate, type),
            own_ascent:route_ascents(*),
            crag:crags (
              *,
              area:areas (*)
            ),
            route_equippers(equipper:equippers(*)),
            topo_routes(topo:topos(id, name, slug))
          )
        `,
      );

      if (userId) {
        query = query
          .eq('route.own_ascent.user_id', userId)
          .eq('route.project.user_id', userId)
          .eq('route.liked.user_id', userId);
      }

      const { data, error } = await query.eq('equipper_id', id);

      if (error) {
        return [];
      }

      return (data || [])
        .map((d) => {
          const r = d.route as
            | (RouteDto & {
                liked: { id: number }[];
                project: { id: number }[];
                ascents: { rate: number | null; type: AscentType }[];
                own_ascent: RouteAscentDto[];
                crag:
                  | (CragDto & {
                      area: { id: number; name: string; slug: string } | null;
                    })
                  | null;
                route_equippers: { equipper: EquipperDto }[];
                topo_routes: {
                  topo: { id: number; name: string; slug: string };
                }[];
              })
            | null;
          if (!r) return null;

          return mapRouteToExtras(r as unknown as RawRouteData, {
            areaIdSource: 'crag.area.id',
            includeEquippers: true,
            includeTopos: true,
          }) as RouteWithExtras;
        })
        .filter((r): r is RouteWithExtras => !!r);
    },
  });

  readonly equipperIndoorRoutesResource = resource({
    params: () => this.selectedEquipperId(),
    loader: async ({ params: id }) => {
      if (!id || !isPlatformBrowser(this.platformId)) return [];
      await this.supabase.whenReady();
      try {
        const { data, error } = await this.supabase.client
          .from('indoor_route_equippers')
          .select(
            `
            route:indoor_routes (
              *,
              center:indoor_centers (
                name,
                slug
              ),
              equippers:indoor_route_equippers(equipper:equippers(*))
            )
          `,
          )
          .eq('equipper_id', id);

        if (error) throw error;

        return (data || [])
          .map((d) => {
            const r = d.route as
              | (Record<string, unknown> & {
                  equippers?: { equipper: EquipperDto }[];
                  center?: { name: string; slug: string };
                })
              | null;
            if (!r) return null;
            return {
              ...r,
              center_name: r.center?.name || '',
              center_slug: r.center?.slug || '',
              equippers: (r.equippers || [])
                .map((e) => e.equipper)
                .filter(Boolean),
            } as IndoorRouteWithExtras;
          })
          .filter((r): r is IndoorRouteWithExtras => r !== null);
      } catch {
        return [];
      }
    },
  });

  // ---- Delegated to TopoDataService ----
  selectedAreaSlug = this.topoData.selectedAreaSlug;
  selectedArea: Signal<AreaListItem | null> = computed(() => {
    const slug = this.selectedAreaSlug();
    return slug ? this.areasList().find((a) => a.slug === slug) || null : null;
  });
  readonly areasListResource = resource({
    params: () => ({ user: this.userProfile() }),
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) {
        return [] as AreaListItem[];
      }
      const cacheKey = 'cached_areas_list_v2';
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const { data, error } =
            await this.supabase.client.rpc('get_areas_list');
          if (error) {
            throw error;
          }
          return ((data as AreaListItem[]) ?? []) as AreaListItem[];
        },
        { fallbackValue: [], logTag: 'GlobalData' },
      );
    },
  });
  readonly areasList: Signal<AreaListItem[]> = computed(() => {
    const val = this.areasListResource.value();
    if (val !== undefined) return val;
    return this.cache.get<AreaListItem[]>('cached_areas_list_v2', []);
  });

  readonly indoorCentersResource = resource({
    params: () => ({ user: this.userProfile() }),
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) {
        return [] as MapIndoorCenterItem[];
      }
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('indoor_centers')
          .select(
            '*, topos:indoor_topos(id, name), routes:indoor_routes(grade)',
          )
          .order('name');

        if (error) throw error;

        return (data || []).map((c: MapIndoorCenterRaw) => {
          const grades: AmountByEveryGrade = {};
          (c.routes || []).forEach((r: MapIndoorRouteRaw) => {
            const g = r.grade;
            if (g != null && g >= 0) {
              grades[g as VERTICAL_LIFE_GRADES] =
                (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
            }
          });
          return {
            ...c,
            routes_count: c.routes?.length || 0,
            grades,
          } as MapIndoorCenterItem;
        });
      } catch {
        return [];
      }
    },
  });

  indoorCentersList: Signal<MapIndoorCenterItem[]> = computed(
    () => this.indoorCentersResource.value() ?? [],
  );

  selectedCragSlug = this.topoData.selectedCragSlug;
  selectedCrag: Signal<CragListItem | null> = computed(() => {
    const slug = this.selectedCragSlug();
    if (!slug) return null;
    const list = this.cragsList();
    return list.find((c) => c.slug === slug) ?? null;
  });
  readonly cragsListResource = this.topoData.cragsListResource;
  readonly cragsList = this.topoData.cragsList;

  selectedTopoId = this.topoData.selectedTopoId;
  selectedCenterSlug = this.topoData.selectedCenterSlug;

  readonly areaToposResource = this.topoData.areaToposResource;
  readonly areaTopos = this.topoData.areaTopos;

  readonly topoDetailResource = this.topoData.topoDetailResource;
  readonly topoDetail = this.topoData.topoDetail;

  readonly cragDetailResource = this.topoData.cragDetailResource;
  readonly cragDetail = this.topoData.cragDetail;

  readonly cragRoutesResource = resource({
    params: () => {
      const crag = this.cragDetail();
      const hasAccess = crag
        ? crag.is_public ||
          crag.purchased ||
          this.canEditAsAdmin() ||
          this.areaAdminPermissions()[crag.area_id]
        : false;
      return {
        cragId: crag?.id,
        cragSlug: crag?.slug,
        areaSlug: crag?.area_slug,
        filterTopos: crag
          ? !crag.is_public &&
            (crag.price === null || crag.price === 0) &&
            !hasAccess
          : false,
      };
    },
    loader: async ({
      params: { cragId, cragSlug, filterTopos },
    }): Promise<RouteWithExtras[]> => {
      if (!cragId) return [];
      if (!isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_crag_routes_${cragSlug}_v2`;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const userId = this.supabase.authUser()?.id;
          let query = this.supabase.client
            .from('routes')
            .select(
              `
              *,
              liked:route_likes(id),
              project:route_projects(id),
              ascents:route_ascents(rate, type),
              own_ascent:route_ascents(*),
              topo_routes(topo:topos(id, name, slug)),
              route_equippers(equipper:equippers(*)),
              crag:crags(
                slug,
                name,
                area_id,
                area:areas(slug, name)
              )
            `,
            )
            .eq('crag_id', cragId);

          if (userId) {
            query = query
              .eq('own_ascent.user_id', userId)
              .eq('project.user_id', userId)
              .eq('liked.user_id', userId);
          }

          const { data, error } = await query;

          if (error) {
            throw error;
          }

          return (
            data.map((r) =>
              mapRouteToExtras(r as unknown as RawRouteData, {
                areaIdSource: 'crag.area_id',
                ratingFallback: filterTopos ? null : 0,
                includeEquippers: true,
                includeTopos: true,
                filterTopos,
              }),
            ) ?? []
          );
        },
        { fallbackValue: [], logTag: 'GlobalData' },
      );
    },
  });

  readonly cragRoutes = computed(() => {
    const val = this.cragRoutesResource.value();
    if (val !== undefined) return val as RouteWithExtras[];
    return this.cache.get<RouteWithExtras[]>(
      `cached_crag_routes_${this.selectedCragSlug()}_v2`,
      [],
    );
  });

  // ---- Delegated to ProfileDataService ----
  selectedRouteSlug = this.topoData.selectedRouteSlug;
  profileUserId = this.profileData.profileUserId;
  profileActiveTab = this.profileData.profileActiveTab;

  readonly userProjectsResource = this.profileData.userProjectsResource;
  readonly userProjects = this.profileData.userProjects;

  readonly firstAscentYearResource = this.profileData.firstAscentYearResource;
  readonly effectiveStartingClimbingYear =
    this.profileData.effectiveStartingClimbingYear;

  readonly ascentsPage = this.profileData.ascentsPage;
  readonly ascentsSize = this.profileData.ascentsSize;
  readonly ascentsDateFilter = this.profileData.ascentsDateFilter;
  readonly ascentsQuery = this.profileData.ascentsQuery;
  readonly ascentsSort = this.profileData.ascentsSort;

  readonly userAscentsResource = this.profileData.userAscentsResource;
  readonly userTotalAscentsCountResource =
    this.profileData.userTotalAscentsCountResource;

  readonly routeDetailResource = this.topoData.routeDetailResource;
  readonly routeDetail = this.topoData.routeDetail;

  readonly routeAscentsResource = this.topoData.routeAscentsResource;

  readonly adminParkingsResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('parkings')
          .select('*')
          .order('name');
        if (error) {
          return [];
        }
        return (data as ParkingDto[]) ?? [];
      } catch {
        return [];
      }
    },
  });

  // ---- Error state for interceptor ----
  errorMessage: WritableSignal<string | null> = signal(null);
  setError(message: string | null) {
    this.errorMessage.set(message);
  }

  private readonly langUpdateTrigger = toSignal(
    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    ).pipe(
      map(() => Date.now()),
      startWith(0),
    ),
  );

  constructor() {
    this.translate.addLangs(Object.values(Languages));

    if (isPlatformBrowser(this.platformId)) {
      const onlineHandler = () => this.isOffline.set(false);
      const offlineHandler = () => this.isOffline.set(true);

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
    }

    effect(() => {
      if (this.langUpdateTrigger()) {
        this.i18nTick.update((v) => v + 1);
      }
    });

    // Hydrate state from localStorage
    try {
      const rawEditingMode = this.localStorage.getItem(
        this.editingModeStorageKey,
      );
      if (rawEditingMode) {
        this.editingMode.set(rawEditingMode === 'true');
      }

      this.mapData.hydrateMapBounds();

      const msgSound = this.localStorage.getItem('message_sound_enabled_v1');
      if (msgSound !== null) {
        this.messageSoundEnabled.set(msgSound === 'true');
      }

      const notifSound = this.localStorage.getItem(
        'notification_sound_enabled_v1',
      );
      if (notifSound !== null) {
        this.notificationSoundEnabled.set(notifSound === 'true');
      }
    } catch {
      // Silent fail on hydration
    }

    // Persist state to localStorage via effects
    effect(() => {
      this.localStorage.setItem(
        this.editingModeStorageKey,
        String(this.editingMode()),
      );
    });

    effect(() => {
      this.mapData.persistMapBounds();
    });

    effect(() => {
      this.localStorage.setItem(
        'message_sound_enabled_v1',
        String(this.messageSoundEnabled()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        'notification_sound_enabled_v1',
        String(this.notificationSoundEnabled()),
      );
    });

    // Language switching logic
    effect(() => {
      const selectedLanguage = this.selectedLanguage();
      if (selectedLanguage) {
        this.translate.use(selectedLanguage).subscribe({
          error: () => {
            // Silent fail on language change
          },
        });
      }
    });

    // Sync state from user profile
    effect(() => {
      const profile = this.userProfile();
      if (!profile) return;

      if (profile.theme) {
        untracked(() => this.theme.set(profile.theme as Theme));
      }
      if (profile.editing_mode !== null) {
        untracked(() => this.editingMode.set(!!profile.editing_mode));
      }
      if (profile.message_sound !== null) {
        untracked(() => this.messageSoundEnabled.set(!!profile.message_sound));
      }
      if (profile.notification_sound !== null) {
        untracked(() =>
          this.notificationSoundEnabled.set(!!profile.notification_sound),
        );
      }
    });

    // Automatically subscribe to push if supported
    effect(() => {
      const profile = this.userProfile();
      if (
        profile &&
        isPlatformBrowser(this.platformId) &&
        this.push.isSupported()
      ) {
        if (!this.push.isSubscribed()) {
          void this.push.subscribe();
        } else {
          void this.push.getCurrentSubscription().then((sub) => {
            if (sub) void this.push.saveSubscription(sub);
          });
        }
      }
    });

    // Refresh unread counts when user changes and setup Realtime
    effect((onCleanup) => {
      const userId = this.supabase.authUserId();
      if (userId) {
        void this.notificationsService.refreshUnreadCount();
        void this.messagingService.refreshUnreadCount();

        const nSub = this.notificationsService.watchNotifications(() => {
          void this.notificationsService.refreshUnreadCount();
        });

        const mSub = this.messagingService.watchUnreadCount(() => {
          void this.messagingService.refreshUnreadCount();
        });

        onCleanup(() => {
          nSub?.unsubscribe();
          mSub?.unsubscribe();
        });
      }
    });

    // Sync indoor feature flag with MapDataService so indoor centers are fetched
    effect(() => {
      this.mapData.setIndoorFeature(this.indoorFeature());
    });
  }

  resetDataByPage(
    page:
      | 'explore'
      | 'area-list'
      | 'area'
      | 'crag'
      | 'topo'
      | 'route'
      | 'home'
      | 'profile'
      | 'equipper',
  ): void {
    this.profileData.resetPagination();
    switch (page) {
      case 'explore': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        this.selectedMapCragItem.set(null);
        break;
      }
      case 'home':
      case 'profile':
      case 'equipper': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        if (page === 'home' || page === 'profile') {
          this.profileActiveTab.set(0);
        }
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
