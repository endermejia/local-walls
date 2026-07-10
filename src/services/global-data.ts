import { isPlatformBrowser } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
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
import { FavoritesService } from './favorites.service';
import { MessagingService } from './messaging.service';
import { PushService } from './push.service';
import { SupabaseService } from './supabase.service';

import {
  AmountByEveryGrade,
  AreaDto,
  AreaListItem,
  AscentType,
  AscentTypes,
  BreadcrumbItem,
  ClimbingKind,
  ClimbingKinds,
  CragDetail,
  CragDto,
  CragListItem,
  CragWithJoins,
  EquipperDto,
  LABEL_TO_VERTICAL_LIFE,
  Language,
  Languages,
  MapAreaItem,
  MapBounds,
  MapCragItem,
  MapIndoorCenterItem,
  MapIndoorCenterRaw,
  MapIndoorRouteRaw,
  MapIndoorTopoRaw,
  MapItem,
  MapResponse,
  ORDERED_GRADE_VALUES,
  PaginatedAscents,
  ParkingDto,
  RouteAscentDto,
  RouteAscentWithExtras,
  RouteDto,
  RouteWithExtras,
  Theme,
  Themes,
  TopoDetail,
  TopoListItem,
  TopoPath,
  TopoRouteWithRoute,
  UserProfileDto,
  VERTICAL_LIFE_GRADES,
  IndoorCenterDto,
  IndoorRouteWithExtras,
} from '../models';

import { LocalStorage } from './local-storage';
import { mapCragToDetail, triggerThemeTransition } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private readonly favorites = inject(FavoritesService);
  private readonly messagingService = inject(MessagingService);
  private readonly notificationsService = inject(AppNotificationsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly push = inject(PushService);
  private readonly supabase = inject(SupabaseService);
  private breakpointService = toObservable(inject(TUI_BREAKPOINT));
  private localStorage = inject(LocalStorage);
  private translate = inject(TranslateService);

  readonly isMobile = toSignal(
    this.breakpointService.pipe(map((b) => b === 'mobile')),
    { initialValue: false },
  );

  // Loading/Status state
  readonly error: WritableSignal<string | null> = signal(null);
  readonly isNavLoading: WritableSignal<boolean> = signal(false);
  readonly showCart: WritableSignal<boolean> = signal(false);

  // ---- Topo photo version for cache busting ----
  readonly topoPhotoVersion: WritableSignal<number> = signal(0);

  // ---- Language ----
  readonly i18nTick: WritableSignal<number> = signal(0);
  readonly selectedLanguage: Signal<Language> = computed(
    () => this.userProfile()?.language || Languages.ES,
  );

  /**
   * Represents the language that is AFTER being successfully loaded and applied.
   */
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
        // Use English for EN, VA, EU if they don't have a native Taiga language package
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
  readonly indoorFeature = signal(true);
  readonly canEditAsAdmin = computed(
    () => this.editingMode() && this.isAdmin(),
  );
  readonly isAreaAdmin = computed(() => this.adminAreas().length > 0);
  readonly isIndoorAdmin = computed(() => this.adminIndoorCenters().length > 0);

  readonly adminAreas = computed(() => this.supabase.adminAreas());
  readonly adminIndoorCenters = computed(() =>
    this.supabase.adminIndoorCenters(),
  );

  /** Resource that fetches the area IDs for which the current user has a pending admin request */
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
        console.error('[GlobalData] pendingAdminRequestsResource error', error);
        return [] as number[];
      }
      return (data ?? []).map((r) => r.area_id);
    },
  });

  /** Set of area IDs for which the current user already has a pending admin request */

  private getCachedData<T>(key: string, defaultValue: T): T {
    if (!isPlatformBrowser(this.platformId)) return defaultValue;
    const cached = this.localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        console.error('[GlobalData] Cache parse error for key:', key);
      }
    }
    return defaultValue;
  }

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

  /** Helper to check if any area can be edited by current user */
  readonly checkAreaEditPermission = (
    area: AreaListItem | AreaDto | null | undefined,
  ) => {
    if (this.canEditAsAdmin() || this.areaAdminPermissions()[area?.id ?? -1])
      return true;
    const userId = this.userProfile()?.id;
    if (!area || !userId || !this.editingMode()) return false;
    const isCreator = area.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(area.created_at);
  };

  /** Computed for the currently selected area */
  readonly canEditArea = computed(() =>
    this.checkAreaEditPermission(this.selectedArea()),
  );

  /** Helper to check if any crag can be edited by current user */
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

  /** Computed for the currently selected crag */
  readonly canEditCrag = computed(() =>
    this.checkCragEditPermission(this.cragDetail()),
  );

  /** Helper to check if any route can be edited by current user */
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

  /** Computed for the currently selected route */
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
    if (!createdAt) return true; // If no date, allow for now (legacy or unsaved)
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

  // ---- Map ----
  readonly mapActive: WritableSignal<boolean> = signal(false);
  mapBounds: WritableSignal<MapBounds | null> = signal(null);
  private readonly mapBoundsStorageKey = 'map_bounds_v1';

  /**
   * Resource for fetching map items based on bounds.
   */
  readonly mapResource = resource({
    params: () => ({ bounds: this.mapBounds(), active: this.mapActive() }),
    loader: async ({ params: { bounds, active } }) => {
      if (
        !bounds ||
        !active ||
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
          topos (id, name, slug, shade_morning, shade_afternoon),
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
          grades[r.grade] = (grades[r.grade] || 0) + 1;
          if (r.climbing_kind) climbingKinds.add(r.climbing_kind);
        });

        let category = 0;
        if (climbingKinds.has(ClimbingKinds.BOULDER)) category = 1;
        else if (climbingKinds.has(ClimbingKinds.MULTIPITCH)) category = 2;

        const shadeMorning = (c.topos || []).some((t) => t.shade_morning);
        const shadeAfternoon = (c.topos || []).some((t) => t.shade_afternoon);

        const isLiked = (c.liked || []).length > 0;

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          latitude: Number(c.latitude) || 0,
          longitude: Number(c.longitude) || 0,
          area_name: c.area?.name || '',
          area_slug: c.area?.slug || '',
          grades,
          category,
          routes_count: totalRoutes,
          topos_count: (c.topos || []).length,
          topos: (c.topos || []).map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
          })),
          shade_morning: shadeMorning,
          shade_afternoon: shadeAfternoon,
          shade_all_day: shadeMorning && shadeAfternoon,
          sun_all_day: !shadeMorning && !shadeAfternoon,
          avg_rating: 0,
          liked: isLiked,
        } as MapCragItem;
      });

      let indoorItems: MapIndoorCenterItem[] = [];
      if (this.indoorFeature()) {
        const { data: sbIndoor, error: indoorError } =
          await this.supabase.client
            .from('indoor_centers')
            .select(
              `
              id, name, slug, latitude, longitude, city, country, avatar_url,
              routes:indoor_routes(grade, climbing_kind, legacy),
              topos:indoor_topos(id, name)
            `,
            )
            .gte('latitude', bounds.south_west_latitude)
            .lte('latitude', bounds.north_east_latitude)
            .gte('longitude', bounds.south_west_longitude)
            .lte('longitude', bounds.north_east_longitude);

        if (!indoorError && sbIndoor) {
          indoorItems = sbIndoor.map((c: MapIndoorCenterRaw) => {
            const grades: Record<number, number> = {};
            let activeRoutesCount = 0;
            (c.routes || []).forEach((r: MapIndoorRouteRaw) => {
              if (!r.legacy) {
                activeRoutesCount++;
                if (r.grade != null) {
                  grades[r.grade] = (grades[r.grade] || 0) + 1;
                }
              }
            });

            return {
              id: c.id,
              name: c.name,
              slug: c.slug,
              latitude: Number(c.latitude) || 0,
              longitude: Number(c.longitude) || 0,
              city: c.city || '',
              country: c.country || '',
              avatar_url: c.avatar_url || '',
              is_indoor: true,
              grades,
              routes_count: activeRoutesCount,
              topos: (c.topos || []).map((t: MapIndoorTopoRaw) => ({
                id: t.id,
                name: t.name,
              })),
            } as MapIndoorCenterItem;
          });
        }
      }

      const combinedItems: MapItem[] = [...supabaseCragItems, ...indoorItems];

      return {
        items: combinedItems,
        counts: {
          locations: combinedItems.length,
          map_collections: 0,
        },
      } as MapResponse;
    },
  });

  /**
   * Items currently visible in the viewport defined by mapBounds.
   * - Crags: included when their [lat,lng] is inside bounds.
   * - Areas: included when their bbox intersects bounds.
   */
  mapItemsOnViewport: Signal<MapItem[]> = computed(() => {
    const bounds = this.mapBounds();
    const items = this.mapResource.value()?.items || [];
    if (!bounds) return items;

    const south = bounds.south_west_latitude;
    const west = bounds.south_west_longitude;
    const north = bounds.north_east_latitude;
    const east = bounds.north_east_longitude;

    const pointIn = (lat: number, lng: number): boolean => {
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
      const inLat = lat >= south && lat <= north;
      const inLng =
        east >= west ? lng >= west && lng <= east : lng >= west || lng <= east;
      return inLat && inLng;
    };

    return [
      ...items.filter((it) => {
        if ('latitude' in it && 'longitude' in it) {
          const lat = it.latitude;
          const lng = it.longitude;
          return (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            pointIn(lat, lng)
          );
        }
        return false;
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
    params: () => ({ bounds: this.mapBounds(), active: this.mapActive() }),
    loader: async ({ params: { bounds, active } }) => {
      if (!bounds || !active) return [];

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
              routes (grade, climbing_kind),
              topos (shade_morning, shade_afternoon)
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
          const climbingKinds = new Set<string>();
          let shadeMorning = false;
          let shadeAfternoon = false;

          (a.crags || []).forEach((c) => {
            cragsCount++;
            (c.routes || []).forEach((r) => {
              const g = r.grade as VERTICAL_LIFE_GRADES;
              grades[g] = (grades[g] || 0) + 1;
              if (r.climbing_kind) {
                climbingKinds.add(r.climbing_kind);
              }
            });
            if ((c.topos || []).some((t) => t.shade_morning)) {
              shadeMorning = true;
            }
            if ((c.topos || []).some((t) => t.shade_afternoon)) {
              shadeAfternoon = true;
            }
          });

          const isLiked = (a.liked || []).length > 0;

          return {
            id: a.id,
            name: a.name,
            slug: a.slug,
            liked: isLiked,
            grades,
            crags_count: cragsCount,
            climbing_kind: Array.from(climbingKinds),
            shade_morning: shadeMorning,
            shade_afternoon: shadeAfternoon,
            shade_all_day: shadeMorning && shadeAfternoon,
            sun_all_day: !shadeMorning && !shadeAfternoon,
            area_type: 0,
          } as MapAreaItem;
        });
      } catch (e) {
        console.error('[GlobalData] areasMapResource exception', e);
        return [];
      }
    },
  });

  // ---- Area List Filters (Persisted) ----
  private readonly areaListGradeRangeKey = 'area_list_grade_range_v1';
  private readonly areaListCategoriesKey = 'area_list_categories_v1';
  private readonly areaListShadeKey = 'area_list_shade_v1';
  private readonly areaListShowIndoorKey = 'area_list_show_indoor_v1';
  private readonly areaListShowOutdoorKey = 'area_list_show_outdoor_v1';

  areaListGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  areaListCategories: WritableSignal<number[]> = signal([]);
  areaListShade: WritableSignal<
    ('shade_morning' | 'shade_afternoon' | 'shade_all_day' | 'sun_all_day')[]
  > = signal([]);
  areaListShowIndoor: WritableSignal<boolean> = signal(false);
  areaListShowOutdoor: WritableSignal<boolean> = signal(true);
  selectedIndoorCenter: WritableSignal<IndoorCenterDto | null> = signal(null);
  selectedIndoorRoute: WritableSignal<IndoorRouteWithExtras | null> =
    signal(null);
  /** Increment to trigger indoor routes reload in the parent component */
  indoorRoutesReloadTick: WritableSignal<number> = signal(0);

  // ---- Feed List Filters (Persisted per session) ----
  private readonly feedGradeRangeKey = 'feed_grade_range_v1';
  private readonly feedCategoriesKey = 'feed_categories_v1';
  private readonly feedShowIndoorAscentsKey = 'feed_show_indoor_ascents_v1';

  feedGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  feedCategories: WritableSignal<number[]> = signal([]);
  feedShowIndoorAscents: WritableSignal<boolean> = signal(false);

  // ---- Liked / Favorites (Shared) ----
  readonly likedAreasResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_liked_areas_${userId}_v2`;
      try {
        await this.supabase.whenReady();
        const list = await this.favorites.getLikedAreas(userId);
        this.localStorage.setItem(cacheKey, JSON.stringify(list));
        return list;
      } catch (e) {
        console.warn(
          '[GlobalData] likedAreasResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as AreaListItem[];
          } catch {
            console.error('[GlobalData] Cache parse error');
          }
        }
        return [];
      }
    },
  });

  readonly likedCragsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_liked_crags_${userId}_v2`;
      try {
        await this.supabase.whenReady();
        const list = await this.favorites.getLikedCrags(userId);
        this.localStorage.setItem(cacheKey, JSON.stringify(list));
        return list;
      } catch (e) {
        console.warn(
          '[GlobalData] likedCragsResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as CragListItem[];
          } catch {
            console.error('[GlobalData] Cache parse error');
          }
        }
        return [];
      }
    },
  });

  readonly likedRoutesResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = `cached_liked_routes_${userId}_v2`;
      try {
        await this.supabase.whenReady();
        const list = await this.favorites.getLikedRoutes(userId);
        this.localStorage.setItem(cacheKey, JSON.stringify(list));
        return list;
      } catch (e) {
        console.warn(
          '[GlobalData] likedRoutesResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as RouteWithExtras[];
          } catch {
            console.error('[GlobalData] Cache parse error');
          }
        }
        return [];
      }
    },
  });

  readonly likedAreas = computed(() => {
    const val = this.likedAreasResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.getCachedData<AreaListItem[]>(
      `cached_liked_areas_${userId}_v2`,
      [],
    );
  });
  readonly likedCrags = computed(() => {
    const val = this.likedCragsResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.getCachedData<CragListItem[]>(
      `cached_liked_crags_${userId}_v2`,
      [],
    );
  });
  readonly likedRoutes = computed(() => {
    const val = this.likedRoutesResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.getCachedData<RouteWithExtras[]>(
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

      // Fetch equipper with user profile if available
      const { data, error } = await this.supabase.client
        .from('equippers')
        .select('*, user_profile:user_profiles(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[GlobalData] equipperDetailResource error', error);
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
        console.error('[GlobalData] equipperRoutesResource error', error);
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

          const rates =
            r.ascents
              ?.map((a) => a.rate)
              .filter((rate): rate is number => rate != null) ?? [];
          const rating =
            rates.length > 0
              ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length
              : 0;

          return {
            ...r,
            liked: (r.liked?.length ?? 0) > 0,
            project: (r.project?.length ?? 0) > 0,
            crag_name: r.crag?.name,
            crag_slug: r.crag?.slug,
            area_id: r.crag?.area?.id,
            area_name: r.crag?.area?.name,
            area_slug: r.crag?.area?.slug,
            rating,
            ascent_count:
              r.ascents?.filter((a) => a.type !== AscentTypes.ATTEMPT).length ??
              0,
            climbed:
              (r.own_ascent?.filter((a) => a.type !== AscentTypes.ATTEMPT)
                .length ?? 0) > 0,
            own_ascent: r.own_ascent?.sort((a, b) => {
              const isAttemptA = a.type === AscentTypes.ATTEMPT;
              const isAttemptB = b.type === AscentTypes.ATTEMPT;
              if (isAttemptA && !isAttemptB) return 1;
              if (!isAttemptA && isAttemptB) return -1;
              return 0;
            })[0],
            equippers:
              r.route_equippers
                ?.map((re: { equipper: EquipperDto }) => re.equipper)
                .filter((e): e is EquipperDto => !!e) || [],
            topos:
              r.topo_routes
                ?.map(
                  (tr: { topo: { id: number; name: string; slug: string } }) =>
                    tr.topo,
                )
                .filter(
                  (t): t is { id: number; name: string; slug: string } => !!t,
                ) || [],
          } as RouteWithExtras;
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
          .map((d: { route: IndoorRouteWithExtras | null }) => {
            const r = d.route;
            if (!r) return null;
            return {
              ...r,
              center_name: r.center?.name || '',
              center_slug: r.center?.slug || '',
              equippers: (r.equippers || [])
                .map((e: { equipper: EquipperDto }) => e.equipper)
                .filter(Boolean),
            } as IndoorRouteWithExtras;
          })
          .filter((r): r is IndoorRouteWithExtras => r !== null);
      } catch (e) {
        console.error('[GlobalData] equipperIndoorRoutesResource error', e);
        return [];
      }
    },
  });

  // ---- Areas ----
  selectedAreaSlug: WritableSignal<string | null> = signal(null);
  selectedArea: Signal<AreaListItem | null> = computed(() => {
    const slug = this.selectedAreaSlug();
    return slug ? this.areasList().find((a) => a.slug === slug) || null : null;
  });
  /**
   * List of areas (RPC get_areas_list)
   * SSR-safe: on server returns [] and does not access browser APIs.
   */
  readonly areasListResource = resource({
    params: () => ({ user: this.userProfile() }),
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) {
        return [] as AreaListItem[];
      }
      const cacheKey = 'cached_areas_list_v2';
      try {
        await this.supabase.whenReady();
        const { data, error } =
          await this.supabase.client.rpc('get_areas_list');
        if (error) {
          throw error;
        }
        const list = (data as AreaListItem[]) ?? [];
        this.localStorage.setItem(cacheKey, JSON.stringify(list));
        return list;
      } catch (e) {
        console.warn(
          '[GlobalData] areaListResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as AreaListItem[];
          } catch {
            console.error('[GlobalData] Cache parse error');
          }
        }
        return [];
      }
    },
  });
  readonly areasList: Signal<AreaListItem[]> = computed(() => {
    const val = this.areasListResource.value();
    if (val !== undefined) return val;
    return this.getCachedData<AreaListItem[]>('cached_areas_list_v2', []);
  });

  // ---- Indoor Centers ----
  readonly indoorCentersResource = resource({
    params: () => ({ user: this.userProfile() }),
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) {
        return [] as IndoorRouteWithExtras[];
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
            if (g >= 0) {
              grades[g as VERTICAL_LIFE_GRADES] =
                (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
            }
          });
          return {
            ...c,
            routes_count: c.routes?.length || 0,
            grades,
          };
        });
      } catch (e) {
        console.error('[GlobalData] indoorCentersResource error', e);
        return [];
      }
    },
  });

  indoorCentersList: Signal<MapIndoorCenterItem[]> = computed(
    () => this.indoorCentersResource.value() ?? [],
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
      const cacheKey = `cached_crags_list_${areaSlug}_v2`;
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .rpc('get_crags_list')
          .eq('area_slug', areaSlug);

        if (error) {
          console.error('[GlobalData] cragsListResource error', error);
          throw error;
        }
        const list =
          (data?.map((c) => ({
            ...c,
            grades: c.grades as unknown as AmountByEveryGrade,
            topos: c.topos as unknown as {
              id: number;
              name: string;
              slug: string;
            }[],
          })) as CragListItem[]) ?? [];
        this.localStorage.setItem(cacheKey, JSON.stringify(list));
        return list;
      } catch (e) {
        console.warn(
          '[GlobalData] cragsListResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as CragListItem[];
          } catch {
            console.error('[GlobalData] Cache parse error');
          }
        }
        return [];
      }
    },
  });
  readonly cragsList: Signal<CragListItem[]> = computed(() => {
    const val = this.cragsListResource.value();
    if (val !== undefined) return val;
    const areaSlug = this.selectedAreaSlug();
    if (!areaSlug) return [];
    return this.getCachedData<CragListItem[]>(
      `cached_crags_list_${areaSlug}_v2`,
      [],
    );
  });

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
  selectedCenterSlug: WritableSignal<string | null> = signal(null);

  readonly areaToposResource = resource({
    params: () => ({
      areaSlug: this.selectedAreaSlug(),
      centerSlug: this.selectedCenterSlug(),
    }),
    loader: async ({
      params,
    }): Promise<(TopoListItem & { crag_slug: string })[]> => {
      const { areaSlug, centerSlug } = params;
      if (!isPlatformBrowser(this.platformId)) return [];

      if (centerSlug) {
        try {
          await this.supabase.whenReady();
          const { data: center } = await this.supabase.client
            .from('indoor_centers')
            .select('id')
            .eq('slug', centerSlug)
            .single();
          if (!center) return [];

          const { data, error } = await this.supabase.client
            .from('indoor_topos')
            .select('*, indoor_topo_routes ( route:indoor_routes ( grade ) )')
            .eq('center_id', center.id);

          if (error) throw error;

          return (data || []).map((t) => {
            const grades: Record<number, number> = {};
            const topoRoutes = t.indoor_topo_routes || [];
            for (const tr of topoRoutes) {
              const grade = tr.route?.grade;
              if (grade !== undefined && grade !== null) {
                grades[grade] = (grades[grade] || 0) + 1;
              }
            }
            return {
              id: t.id,
              name: t.name,
              slug: t.id,
              crag_slug: '',
              photo: t.image_url,
              grades,
            };
          }) as MapIndoorCenterItem[];
        } catch (e) {
          console.error('[GlobalData] areaToposResource indoor error', e);
          return [];
        }
      }

      if (!areaSlug) return [];
      const cacheKey = `cached_area_topos_${areaSlug}_v2`;
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('topos')
          .select(
            '*, crags!inner(slug, areas!inner(slug)), topo_routes(route:routes(grade))',
          )
          .eq('crags.areas.slug', areaSlug);

        if (error) {
          console.error('[GlobalData] areaToposResource error', error);
          throw error;
        }

        const result = (data || []).map((t) => {
          const grades: AmountByEveryGrade = {};
          (t.topo_routes || []).forEach((tr) => {
            const g = tr.route?.grade;
            if (g >= 0) {
              grades[g as VERTICAL_LIFE_GRADES] =
                (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
            }
          });

          return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            crag_slug: t.crags?.slug || '',
            grades,
            photo: t.photo,
            shade_morning: t.shade_morning,
            shade_afternoon: t.shade_afternoon,
            shade_change_hour: t.shade_change_hour,
            route_ids: (t.topo_routes || []).map(
              (tr: { route_id: number }) => tr.route_id,
            ),
          };
        });

        this.localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      } catch (e) {
        console.warn(
          '[GlobalData] areaToposResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as (TopoListItem & {
              crag_slug: string;
            })[];
          } catch {
            return [];
          }
        }
        return [];
      }
    },
  });

  readonly topoDetailResource = resource({
    params: () => this.selectedTopoId(),
    loader: async ({ params: id }): Promise<TopoDetail | null> => {
      if (!id) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      const cacheKey = `cached_topo_detail_${id}_v1`;
      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        const isIndoor = isNaN(Number(id));

        if (isIndoor) {
          // 1. Fetch indoor topo
          const { data: topo, error: topoErr } = await this.supabase.client
            .from('indoor_topos')
            .select(
              `
              *,
              center: indoor_centers!inner (
                id, name, slug
              )
            `,
            )
            .eq('id', id)
            .single();
          if (topoErr) throw topoErr;

          // 2. Fetch indoor_topo_routes mapped to their indoor_routes details and user ascents
          const { data: trs, error: trsErr } = await this.supabase.client
            .from('indoor_topo_routes')
            .select(
              `
              *,
              route: indoor_routes!inner (
                id, name, slug, grade, climbing_kind, color,
                own_ascent: indoor_ascents!left (*)
              )
            `,
            )
            .eq('topo_id', id)
            .eq('route.own_ascent.user_id', userId ?? '')
            .order('number', { ascending: true });

          if (trsErr) throw trsErr;

          const topo_routes: { route_id: number; route: RouteWithExtras }[] =
            [];
          const seenRouteIds = new Set<string>();

          if (trs) {
            for (const tr of trs) {
              if (!seenRouteIds.has(tr.route_id)) {
                seenRouteIds.add(tr.route_id);

                // Sort ascents to prioritize real ascents over attempts
                const ascents = (tr.route.own_ascent || []) as RouteAscentDto[];
                ascents.sort((a, b) => {
                  const isAttemptA = a.type === 'attempt';
                  const isAttemptB = b.type === 'attempt';
                  if (isAttemptA && !isAttemptB) return 1;
                  if (!isAttemptA && isAttemptB) return -1;
                  return (
                    new Date(b.date || 0).getTime() -
                    new Date(a.date || 0).getTime()
                  );
                });
                const bestAscent = ascents[0] || null;

                topo_routes.push({
                  topo_id: tr.topo_id,
                  route_id: tr.route_id,
                  number: tr.number,
                  path: tr.path,
                  route: {
                    id: tr.route.id,
                    name: tr.route.name,
                    slug: tr.route.slug,
                    grade: tr.route.grade,
                    climbing_kind: tr.route.climbing_kind,
                    color: tr.route.color,
                    own_ascent: bestAscent,
                    project: false,
                  },
                });
              }
            }
          }

          const result: TopoDetail = {
            id: topo.id,
            name: topo.name,
            photo: topo.image_url,
            climbing_kind: topo.climbing_kind,
            legacy: topo.legacy,
            center_id: topo.center_id,
            topo_routes,
            crag: topo.center
              ? {
                  id: 0,
                  name: topo.center.name,
                  slug: topo.center.slug,
                  area_id: 0,
                  user_creator_id: null,
                  area: {
                    is_public: true,
                    price: null,
                    purchased: true,
                  },
                }
              : undefined,
          };
          this.localStorage.setItem(cacheKey, JSON.stringify(result));
          return result;
        }

        const { data, error } = await this.supabase.client
          .from('topos')
          .select(
            `
            *,
            crag: crags!inner (
              id, name, slug, area_id, user_creator_id,
              area: areas!inner (
                id, name, slug, is_public, price, purchased:area_purchases(id)
              )
            ),
            topo_routes (
              *,
              route: routes (
                id, name, slug, grade, height, climbing_kind,
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
          throw error;
        }

        const topo_routes: TopoRouteWithRoute[] = [];
        const seenRouteIds = new Set<number>();

        if (data.topo_routes) {
          for (const tr of data.topo_routes) {
            if (!seenRouteIds.has(tr.route_id)) {
              seenRouteIds.add(tr.route_id);

              // Sort ascents to prioritize real ascents over attempts
              const ascents = tr.route.own_ascent || [];
              const bestAscent =
                ascents.sort((a, b) => {
                  const isAttemptA = a.type === AscentTypes.ATTEMPT;
                  const isAttemptB = b.type === AscentTypes.ATTEMPT;
                  if (isAttemptA && !isAttemptB) return 1;
                  if (!isAttemptA && isAttemptB) return -1;
                  return 0; // Maintain order otherwise (or sort by type/date preference)
                })[0] || null;

              topo_routes.push({
                topo_id: tr.topo_id,
                route_id: tr.route_id,
                number: tr.number,
                path: tr.path as TopoPath,
                route: {
                  ...tr.route,
                  own_ascent: bestAscent,
                  project: !!tr.route.project?.[0],
                },
              });
            }
          }
        }

        const result: TopoDetail = {
          ...data,
          topo_routes,
          crag: data.crag
            ? {
                ...data.crag,
                area: {
                  ...data.crag.area,
                  purchased: (data.crag.area.purchased?.length ?? 0) > 0,
                },
              }
            : undefined,
        } as unknown as TopoDetail;
        this.localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      } catch (e) {
        console.warn(
          '[GlobalData] topoDetailResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as TopoDetail;
          } catch {
            return null;
          }
        }
        return null;
      }
    },
  });

  readonly cragDetailResource = resource({
    params: () => ({
      cragSlug: this.selectedCragSlug(),
      areaSlug: this.selectedAreaSlug(),
    }),
    loader: async ({
      params: { cragSlug, areaSlug },
    }): Promise<CragDetail | null> => {
      if (!cragSlug || !areaSlug) return null;
      if (!isPlatformBrowser(this.platformId)) return null;
      const cacheKey = `cached_crag_detail_${areaSlug}_${cragSlug}_v2`;
      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        let query = this.supabase.client
          .from('crags')
          .select(
            `
            *,
            eight_anu_sector_slugs,
            liked:crag_likes(id),
            area: areas!inner (
              id, name, slug, eight_anu_crag_slugs,
              is_public, price, stripe_account_id,
              purchased:area_purchases(id)
            ),
            crag_parkings (
              parking: parkings (*)
            ),
             topos (
               *,
               topo_routes (
                 route_id,
                 route: routes (
                   grade
                 )
               )
             )
          `,
          )
          .eq('slug', cragSlug)
          .eq('area.slug', areaSlug);

        if (userId) {
          query = query.eq('liked.user_id', userId);
        }

        const { data, error } = await query.single();

        if (error) {
          console.error('[GlobalData] cragDetailResource error', error);
          throw error;
        }

        const result = mapCragToDetail(data as CragWithJoins);
        this.localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      } catch (e) {
        console.warn(
          '[GlobalData] cragDetailResource error/offline, trying cache',
          e,
        );
        const cached = this.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as CragDetail;
          } catch {
            console.error('[GlobalData] Cache parse error');
          }
        }
        return null;
      }
    },
  });

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
      params: { cragId, filterTopos },
    }): Promise<RouteWithExtras[]> => {
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
          console.error('[GlobalData] cragRoutesResource error', error);
          throw error;
        }

        return (
          data.map((r) =>
            (() => {
              const rates =
                (r as unknown as { ascents: { rate: number }[] }).ascents
                  ?.map((a) => a.rate)
                  .filter((rate): rate is number => rate != null) ?? [];
              const rating =
                rates.length > 0
                  ? rates.reduce(
                      (a: number, b: number) => (a ?? 0) + (b ?? 0),
                      0,
                    ) / rates.length
                  : null;

              return {
                ...r,
                liked: (r.liked?.length ?? 0) > 0,
                project: (r.project?.length ?? 0) > 0,
                area_id: r.crag?.area_id,
                crag_slug: r.crag?.slug,
                crag_name: r.crag?.name,
                area_slug: r.crag?.area?.slug,
                area_name: r.crag?.area?.name,
                rating,
                ascent_count:
                  r.ascents?.filter(
                    (a: Partial<RouteAscentDto>) =>
                      a.type !== AscentTypes.ATTEMPT,
                  ).length ?? 0,
                climbed:
                  (r.own_ascent?.filter((a) => a.type !== AscentTypes.ATTEMPT)
                    .length ?? 0) > 0,
                own_ascent: r.own_ascent?.sort((a, b) => {
                  const isAttemptA = a.type === AscentTypes.ATTEMPT;
                  const isAttemptB = b.type === AscentTypes.ATTEMPT;
                  if (isAttemptA && !isAttemptB) return 1;
                  if (!isAttemptA && isAttemptB) return -1;
                  return 0;
                })[0],
                topos: filterTopos
                  ? []
                  : r.topo_routes
                      ?.map((tr: { topo: unknown }) => tr.topo)
                      .filter((t: unknown) => !!t) || [],
                equippers:
                  r.route_equippers
                    ?.map((re: { equipper: unknown }) => re.equipper)
                    .filter(Boolean) || [],
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
  profileActiveTab: WritableSignal<number> = signal(0);

  readonly userProjectsResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<RouteWithExtras[]> => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        const currentUserId = this.supabase.authUser()?.id;

        // Fetch routes that are projects for this specific user
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
          console.error('[GlobalData] userProjectsResource error', error);
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
            const rates =
              r.ascents
                ?.map((a) => a.rate)
                .filter((rate): rate is number => rate != null) ?? [];
            const rating =
              rates.length > 0
                ? rates.reduce((a: number, b: number) => a + b, 0) /
                  rates.length
                : 0;

            const { crag, ascents, liked, project, own_ascent, ...rest } = r;
            return {
              ...rest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              area_id: crag?.area_id,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.area?.slug,
              area_name: crag?.area?.name,
              rating,
              ascent_count:
                ascents?.filter(
                  (a: Partial<RouteAscentDto>) =>
                    a.type !== AscentTypes.ATTEMPT,
                ).length ?? 0,
              climbed:
                (own_ascent?.filter((a) => a.type !== AscentTypes.ATTEMPT)
                  .length ?? 0) > 0,
              own_ascent: own_ascent?.sort((a, b) => {
                const isAttemptA = a.type === AscentTypes.ATTEMPT;
                const isAttemptB = b.type === AscentTypes.ATTEMPT;
                if (isAttemptA && !isAttemptB) return 1;
                if (!isAttemptA && isAttemptB) return -1;
                return 0;
              })[0],
            } as RouteWithExtras;
          })
          .filter((r): r is RouteWithExtras => !!r);
      } catch (e) {
        console.error('[GlobalData] userProjectsResource exception', e);
        return [];
      }
    },
  });

  readonly firstAscentYearResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return null;
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
      } catch (e) {
        console.error('[GlobalData] firstAscentYearResource error', e);
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

  // ---- Pagination for Ascents Table ----
  readonly ascentsPage = signal(0);
  readonly ascentsSize = signal(10);
  readonly ascentsDateFilter = signal<string | null>(null);
  readonly ascentsQuery = signal<string | null>(null);
  readonly ascentsSort = signal<'date' | 'grade'>('date');

  readonly userAscentsResource = resource({
    params: () => ({
      userId: this.profileUserId(),
      page: this.ascentsPage(),
      size: this.ascentsSize(),
      dateFilter: this.ascentsDateFilter(),
      query: this.ascentsQuery(),
      grades: this.areaListGradeRange(),
      categories: this.areaListCategories(),
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
        sort,
      } = params;
      if (!userId || !isPlatformBrowser(this.platformId))
        return { items: [], total: 0 };
      try {
        await this.supabase.whenReady();
        const from = page * size;
        const to = from + size - 1;

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
          if (dateFilter === 'last12') {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            query = query.gte('date', twelveMonthsAgo.toISOString());
          } else if (dateFilter !== 'all') {
            // dateFilter is a year string
            query = query
              .gte('date', `${dateFilter}-01-01`)
              .lte('date', `${dateFilter}-12-31`);
          }
        }

        // Grade range filter
        const [minIdx, maxIdx] = grades;
        if (minIdx > 0 || maxIdx < ORDERED_GRADE_VALUES.length - 1) {
          const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
          const allowedDbGrades = allowedLabels
            .map((label) => LABEL_TO_VERTICAL_LIFE[label])
            .filter((g): g is number => g !== undefined);
          if (!allowedDbGrades.includes(0)) {
            allowedDbGrades.push(0);
          }
          query = query.in('grade', allowedDbGrades);
        }

        // Categories filter
        if (categories.length > 0) {
          const idxToKind: Record<number, string> = {
            0: ClimbingKinds.SPORT,
            1: ClimbingKinds.BOULDER,
            2: ClimbingKinds.MULTIPITCH,
          };
          const allowedKinds = categories
            .map((i: number) => idxToKind[i])
            .filter(Boolean);
          query = query.in(
            'routes.climbing_kind',
            allowedKinds as ClimbingKind[],
          );
        }

        const currentUserId = this.supabase.authUser()?.id;
        if (currentUserId) {
          query = query
            .eq('routes.liked.user_id', currentUserId)
            .eq('routes.project.user_id', currentUserId);
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

        if (error) {
          console.error('[GlobalData] userAscentsResource error', error);
          throw error;
        }

        const items = data.map((a) => {
          const { routes: route, ...ascentRest } = a;
          let mappedRoute: RouteWithExtras | undefined = undefined;

          if (route) {
            const { crags: crag, liked, project, ...routeRest } = route;
            const rates =
              (
                route as RouteDto & {
                  ascents: { rate: number | null }[];
                }
              ).ascents
                ?.map((a) => a.rate)
                .filter((rate): rate is number => rate != null) ?? [];
            const rating =
              rates.length > 0
                ? rates.reduce((a: number, b: number) => a + b, 0) /
                  rates.length
                : 0;

            mappedRoute = {
              ...routeRest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              crag_id: route.crag_id,
              created_at: route.created_at,
              eight_anu_route_slugs: route.eight_anu_route_slugs,
              height: route.height,
              user_creator_id: route.user_creator_id,
              area_id: crag?.area_id,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.areas?.slug,
              area_name: crag?.areas?.name,
              rating,
              ascent_count:
                (
                  route as RouteDto & {
                    ascents: { type: AscentType }[];
                  }
                ).ascents?.filter((a) => a.type !== AscentTypes.ATTEMPT)
                  .length ?? 0,
            } as RouteWithExtras;
          }

          return {
            ...ascentRest,
            route: mappedRoute,
          } as RouteAscentWithExtras;
        });

        return { items, total: count ?? 0 };
      } catch (e) {
        console.error('[GlobalData] userAscentsResource exception', e);
        return { items: [], total: 0 };
      }
    },
  });

  readonly userTotalAscentsCountResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<number | undefined> => {
      if (!userId || !isPlatformBrowser(this.platformId)) return undefined;
      try {
        await this.supabase.whenReady();
        const { count, error } = await this.supabase.client
          .from('route_ascents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) {
          console.error(
            '[GlobalData] userTotalAscentsCountResource error',
            error,
          );
          return undefined;
        }
        return count ?? undefined;
      } catch (e) {
        console.error(
          '[GlobalData] userTotalAscentsCountResource exception',
          e,
        );
        return undefined;
      }
    },
  });

  readonly routeDetailResource = resource({
    params: () => ({
      cragId: this.cragDetail()?.id,
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
              id,
              name,
              slug,
              area:areas(id, name, slug)
            ),
            ascents:route_ascents(rate, type),
            own_ascent:route_ascents(*),
            topo_routes(topo:topos(id, name, slug))
          `,
          )
          .eq('crag_id', cragId)
          .eq('slug', routeSlug);

        if (userId) {
          query = query
            .eq('own_ascent.user_id', userId)
            .eq('project.user_id', userId)
            .eq('liked.user_id', userId);
        }

        const { data, error } = await query.single();

        if (error) {
          console.error('[GlobalData] routeDetailResource error', error);
          throw error;
        }

        const r = data;
        const rates =
          r.ascents
            ?.map((a) => a.rate)
            .filter((rate): rate is number => rate != null) ?? [];
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
          area_id: r.crag?.area?.id,
          area_name: r.crag?.area?.name,
          area_slug: r.crag?.area?.slug,
          rating,
          ascent_count:
            r.ascents?.filter(
              (a: Partial<RouteAscentDto>) => a.type !== AscentTypes.ATTEMPT,
            ).length ?? 0,
          climbed:
            (r.own_ascent?.filter((a) => a.type !== AscentTypes.ATTEMPT)
              .length ?? 0) > 0,
          own_ascent: r.own_ascent?.sort((a, b) => {
            const isAttemptA = a.type === AscentTypes.ATTEMPT;
            const isAttemptB = b.type === AscentTypes.ATTEMPT;
            if (isAttemptA && !isAttemptB) return 1;
            if (!isAttemptA && isAttemptB) return -1;
            return 0;
          })[0],
          topos:
            r.topo_routes
              ?.map((tr: { topo: unknown }) => tr.topo)
              .filter((t: unknown) => !!t) || [],
          key: `${cragId}:${routeSlug}`,
        } as RouteWithExtras & { area_id?: number; key: string };
      } catch (e) {
        console.error('[GlobalData] routeDetailResource exception', e);
        return null;
      }
    },
  });

  readonly routeAscentsResource = resource({
    params: () => ({
      routeId: this.routeDetail()?.id,
      page: this.ascentsPage(),
      size: this.ascentsSize(),
    }),
    loader: async ({ params }): Promise<PaginatedAscents> => {
      const { routeId, page, size } = params;
      if (!routeId) return { items: [], total: 0 };
      if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };
      try {
        await this.supabase.whenReady();
        const from = page * size;
        const to = from + size - 1;

        const {
          data: ascents,
          error: ascentsError,
          count,
        } = await this.supabase.client
          .from('route_ascents')
          .select('*', { count: 'exact' })
          .eq('route_id', routeId)
          .neq('type', AscentTypes.ATTEMPT)
          .order('date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (ascentsError) {
          console.error(
            '[GlobalData] routeAscentsResource error',
            ascentsError,
          );
          return { items: [], total: 0 };
        }

        if (!ascents || ascents.length === 0) return { items: [], total: 0 };

        // 2. Fetch unique user profiles for these ascents
        const userIds = [...new Set(ascents.map((a) => a.user_id))];
        const { data: profiles, error: profilesError } =
          await this.supabase.client
            .from('user_profiles')
            .select('id, name, avatar')
            .in('id', userIds);

        if (profilesError) {
          console.error(
            '[GlobalData] routeAscentsResource profiles error',
            profilesError,
          );
          // Return ascents without user info if profiles fail
          return {
            items: ascents as RouteAscentWithExtras[],
            total: count ?? 0,
          };
        }

        // 3. Map profiles back to ascents
        const profileMap = new Map(profiles?.map((p) => [p.id, p]));
        const currentRoute = this.routeDetail();
        const items = ascents.map(
          (a) =>
            ({
              ...a,
              user: profileMap.get(a.user_id),
              route: currentRoute ?? undefined,
            }) as RouteAscentWithExtras,
        );

        return { items, total: count ?? 0 };
      } catch (e) {
        console.error('[GlobalData] routeAscentsResource exception', e);
        return { items: [], total: 0 };
      }
    },
  });

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
          console.error('[GlobalData] adminParkingsResource error', error);
          return [];
        }
        return (data as ParkingDto[]) ?? [];
      } catch (e) {
        console.error('[GlobalData] adminParkingsResource exception', e);
        return [];
      }
    },
  });
  // ---- Computed wrappers for SWR caching ----

  readonly areaTopos = computed(() => {
    const val = this.areaToposResource.value();
    if (val !== undefined)
      return val as (TopoListItem & { crag_slug: string })[];
    return this.getCachedData<(TopoListItem & { crag_slug: string })[]>(
      `cached_area_topos_${this.selectedAreaSlug()}_v2`,
      [],
    );
  });

  readonly topoDetail = computed(() => {
    const val = this.topoDetailResource.value();
    if (val !== undefined) return val as TopoDetail | null;
    return this.getCachedData<TopoDetail | null>(
      `cached_topo_detail_${this.selectedTopoId()}_v1`,
      null,
    );
  });

  readonly cragDetail = computed(() => {
    const val = this.cragDetailResource.value();
    if (val !== undefined) return val as CragDetail | null;
    return this.getCachedData<CragDetail | null>(
      `cached_crag_detail_${this.selectedAreaSlug()}_${this.selectedCragSlug()}_v2`,
      null,
    );
  });

  readonly cragRoutes = computed(() => {
    const val = this.cragRoutesResource.value();
    if (val !== undefined) return val as RouteWithExtras[];
    return this.getCachedData<RouteWithExtras[]>(
      `cached_crag_routes_${this.selectedCragSlug()}_v2`,
      [],
    );
  });

  readonly userProjects = computed(() => {
    const val = this.userProjectsResource.value();
    if (val !== undefined) return val as RouteWithExtras[];
    return this.getCachedData<RouteWithExtras[]>(
      `cached_user_projects_${this.supabase.authUserId()}_v2`,
      [],
    );
  });

  readonly routeDetail = computed(() => {
    const val = this.routeDetailResource.value();
    if (val !== undefined) return val as RouteWithExtras | null;
    return this.getCachedData<RouteWithExtras | null>(
      `cached_route_detail_${this.selectedRouteSlug()}_v2`,
      null,
    );
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
    // Initialize supported languages for ngx-translate
    this.translate.addLangs(Object.values(Languages));

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

      const rawBounds = this.localStorage.getItem(this.mapBoundsStorageKey);
      if (rawBounds) {
        this.mapBounds.set(JSON.parse(rawBounds));
      }

      const rawGradeRange = this.localStorage.getItem(
        this.areaListGradeRangeKey,
      );
      if (rawGradeRange) {
        const parsed = JSON.parse(rawGradeRange);
        if (Array.isArray(parsed) && parsed.length === 2) {
          this.areaListGradeRange.set(parsed as [number, number]);
        }
      }

      const rawCategories = this.localStorage.getItem(
        this.areaListCategoriesKey,
      );
      if (rawCategories) {
        this.areaListCategories.set(JSON.parse(rawCategories));
      }

      const rawShade = this.localStorage.getItem(this.areaListShadeKey);
      if (rawShade) {
        this.areaListShade.set(JSON.parse(rawShade));
      }

      const rawShowIndoor = this.localStorage.getItem(
        this.areaListShowIndoorKey,
      );
      if (rawShowIndoor !== null) {
        this.areaListShowIndoor.set(rawShowIndoor === 'true');
      }

      const rawShowOutdoor = this.localStorage.getItem(
        this.areaListShowOutdoorKey,
      );
      if (rawShowOutdoor !== null) {
        this.areaListShowOutdoor.set(rawShowOutdoor === 'true');
      }

      const rawFeedGradeRange = this.localStorage.getItem(
        this.feedGradeRangeKey,
      );
      if (rawFeedGradeRange) {
        const parsed = JSON.parse(rawFeedGradeRange);
        if (Array.isArray(parsed) && parsed.length === 2) {
          this.feedGradeRange.set(parsed as [number, number]);
        }
      }

      const rawFeedCategories = this.localStorage.getItem(
        this.feedCategoriesKey,
      );
      if (rawFeedCategories) {
        this.feedCategories.set(JSON.parse(rawFeedCategories));
      }

      const rawIndoor = this.localStorage.getItem(
        this.feedShowIndoorAscentsKey,
      );
      if (rawIndoor !== null) {
        this.feedShowIndoorAscents.set(rawIndoor === 'true');
      }

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
    } catch (e) {
      console.warn('[GlobalData] Hydrate error', e);
    }

    // Persist state to localStorage via effects
    effect(() => {
      this.localStorage.setItem(
        this.editingModeStorageKey,
        String(this.editingMode()),
      );
    });

    effect(() => {
      const bounds = this.mapBounds();
      if (bounds) {
        this.localStorage.setItem(
          this.mapBoundsStorageKey,
          JSON.stringify(bounds),
        );
      }
    });

    effect(() => {
      this.localStorage.setItem(
        this.areaListGradeRangeKey,
        JSON.stringify(this.areaListGradeRange()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.areaListCategoriesKey,
        JSON.stringify(this.areaListCategories()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.areaListShadeKey,
        JSON.stringify(this.areaListShade()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.areaListShowIndoorKey,
        String(this.areaListShowIndoor()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.areaListShowOutdoorKey,
        String(this.areaListShowOutdoor()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.feedGradeRangeKey,
        JSON.stringify(this.feedGradeRange()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.feedCategoriesKey,
        JSON.stringify(this.feedCategories()),
      );
    });

    effect(() => {
      this.localStorage.setItem(
        this.feedShowIndoorAscentsKey,
        String(this.feedShowIndoorAscents()),
      );
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
          error: (err) =>
            console.error(
              `[GlobalData] Error switching to ${selectedLanguage}:`,
              err,
            ),
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
    this.ascentsPage.set(0);
    this.ascentsSize.set(10);
    this.ascentsDateFilter.set(null);
    this.ascentsQuery.set(null);
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
