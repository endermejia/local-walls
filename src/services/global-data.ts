import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { TuiTablePaginationEvent } from '@taiga-ui/addon-table';
import { TuiBreakpointService } from '@taiga-ui/core';
import {
  TUI_ENGLISH_LANGUAGE,
  TUI_SPANISH_LANGUAGE,
  TuiLanguage,
} from '@taiga-ui/i18n';

import { TranslateService } from '@ngx-translate/core';
import { map, merge, startWith } from 'rxjs';

import {
  AppNotificationsService,
  BrowserNotificationService,
  LocalStorage,
  MessagingService,
  SupabaseService,
  UserProfilesService,
} from '../services';

import { mapCragToDetail } from '../utils';

import {
  AmountByEveryGrade,
  AppRoles,
  AreaListItem,
  BreadcrumbItem,
  ClimbingKinds,
  CragDetail,
  CragListItem,
  CragWithJoins,
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
  PaginatedAscents,
  ParkingDto,
  RouteAscentWithExtras,
  TopoListItem,
  RouteWithExtras,
  Theme,
  Themes,
  TopoDetail,
  TopoRouteWithRoute,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
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
  private readonly notificationsService = inject(AppNotificationsService);
  private readonly messagingService = inject(MessagingService);
  private readonly browserNotifications = inject(BrowserNotificationService);
  private readonly userProfilesService = inject(UserProfilesService);
  private breakpointService = inject(TuiBreakpointService);

  readonly isMobile = toSignal(
    this.breakpointService.pipe(map((b) => b === 'mobile')),
    { initialValue: false },
  );

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  // Loading/Status state
  readonly error: WritableSignal<string | null> = signal(null);

  // ---- Topo photo version for cache busting ----
  readonly topoPhotoVersion: WritableSignal<number> = signal(0);

  // ---- Language ----
  readonly i18nTick: WritableSignal<number> = signal(0);
  selectedLanguage: Signal<Language> = computed(
    () => this.userProfile()?.language || Languages.ES,
  );
  tuiLanguage: Signal<TuiLanguage> = computed(() =>
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
        name: 'nav.my-areas',
        icon: '@tui.list',
        fn: () => this.router.navigateByUrl('/my-areas'),
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
          fn: () => this.router.navigateByUrl('/area'),
        },
      ],
      config,
    } satisfies OptionsData;
  });

  // ---- Breadcrumbs ----
  breadcrumbs: Signal<BreadcrumbItem[]> = computed<BreadcrumbItem[]>(() => {
    this.i18nTick();
    const items: BreadcrumbItem[] = [
      { caption: 'labels.areas', routerLink: ['/area'] },
    ];

    const area = this.selectedArea();
    const crag = this.selectedCrag();
    const topo = this.topoDetailResource.value();
    const route = this.routeDetailResource.value();

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

  // ---- Auth (roles) ----
  readonly userProfile = computed(() => this.supabase.userProfile());
  readonly userRole = computed(() => this.supabase.userRole());
  readonly editingMode: WritableSignal<boolean> = signal(false);
  private readonly editingModeStorageKey = 'editing_mode_v1';

  readonly isAdmin = computed(
    () => this.editingMode() && this.userRole() === AppRoles.ADMIN,
  );
  readonly isEquipper = computed(
    () => this.editingMode() && this.userRole() === AppRoles.EQUIPPER,
  );

  readonly isActualAdmin = computed(() => this.userRole() === AppRoles.ADMIN);
  readonly isActualEquipper = computed(
    () => this.userRole() === AppRoles.EQUIPPER,
  );
  readonly isUserAdminOrEquipper = computed(
    () => this.isActualAdmin() || this.isActualEquipper(),
  );
  readonly equipperAreas = this.supabase.equipperAreas;

  readonly unreadNotificationsCount = this.notificationsService.unreadCount;
  readonly unreadMessagesCount = this.messagingService.unreadMessagesCount;

  readonly isAllowedEquipper = (areaId: number | undefined) => {
    if (this.isAdmin()) return true;
    if (!areaId || !this.editingMode()) return false;
    return this.isEquipper() && this.equipperAreas().includes(areaId);
  };

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
        if (climbingKinds.has(ClimbingKinds.BOULDER)) category = 1;
        else if (climbingKinds.has(ClimbingKinds.MULTIPITCH)) category = 2;

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
          topos_count: (c.topos || []).length,
          shade_morning: shadeMorning,
          shade_afternoon: shadeAfternoon,
          shade_all_day: shadeMorning && shadeAfternoon,
          sun_all_day: !shadeMorning && !shadeAfternoon,
          avg_rating: 0,
          liked: isLiked,
        } as MapCragItem;
      });

      return {
        items: supabaseCragItems,
        counts: {
          locations: supabaseCragItems.length,
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
      if (!bounds) return [];

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
              if (typeof r.grade === 'number') {
                const g = r.grade as VERTICAL_LIFE_GRADES;
                grades[g] = (grades[g] || 0) + 1;
              }
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
          throw error;
        }
        return (data as AreaListItem[]) ?? [];
      } catch (e) {
        console.error('[GlobalData] areaListResource exception', e);
        return [];
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
          throw error;
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

  readonly areaToposResource = resource({
    params: () => this.selectedAreaSlug(),
    loader: async ({
      params: areaSlug,
    }): Promise<(TopoListItem & { crag_slug: string })[]> => {
      if (!areaSlug || !isPlatformBrowser(this.platformId)) return [];
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

        return (data || []).map((t) => {
          const grades: AmountByEveryGrade = {};
          (t.topo_routes || []).forEach((tr) => {
            const g = tr.route?.grade;
            if (typeof g === 'number' && g >= 0) {
              grades[g as VERTICAL_LIFE_GRADES] =
                (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
            }
          });

          return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            photo: t.photo,
            shade_morning: t.shade_morning,
            shade_afternoon: t.shade_afternoon,
            shade_change_hour: t.shade_change_hour,
            grades,
            crag_slug: t.crags.slug,
          };
        });
      } catch (e) {
        console.error('[GlobalData] areaToposResource exception', e);
        return [];
      }
    },
  });

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
          throw error;
        }

        const topo_routes: TopoRouteWithRoute[] = [];
        const seenRouteIds = new Set<number>();

        if (data.topo_routes) {
          for (const tr of data.topo_routes) {
            if (!seenRouteIds.has(tr.route_id)) {
              seenRouteIds.add(tr.route_id);
              topo_routes.push({
                ...tr,
                route: {
                  ...tr.route,
                  own_ascent: tr.route.own_ascent?.[0] || null,
                  project: !!tr.route.project?.[0],
                },
              });
            }
          }
        }

        return {
          ...data,
          topo_routes,
        };
      } catch (e) {
        console.error('[GlobalData] topoDetailResource exception', e);
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
      try {
        await this.supabase.whenReady();
        const userId = this.supabase.authUser()?.id;
        let query = this.supabase.client
          .from('crags')
          .select(
            `
            *,
            liked:crag_likes(id),
            area: areas!inner ( id, name, slug ),
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

        return mapCragToDetail(data as CragWithJoins);
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
              name,
              area_id,
              area:areas(slug, name)
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
          throw error;
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
                area_id: r.crag?.area_id,
                crag_slug: r.crag?.slug,
                crag_name: r.crag?.name,
                area_slug: r.crag?.area?.slug,
                area_name: r.crag?.area?.name,
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
  profileActiveTab: WritableSignal<number> = signal(0);

  readonly userProjectsResource = resource({
    params: () => this.profileUserId(),
    loader: async ({ params: userId }): Promise<RouteWithExtras[]> => {
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
                area_id,
                area:areas(slug, name)
              ),
              ascents:route_ascents(rate)
            )
          `,
          )
          .eq('user_id', userId);

        if (error) {
          console.error('[GlobalData] userProjectsResource error', error);
          throw error;
        }

        return data
          .map((item) => {
            const r = item.route;
            if (!r) return null;
            const rates =
              r.ascents?.map((a) => a.rate).filter((rate) => rate != null) ??
              [];
            const rating =
              rates.length > 0
                ? rates.reduce((a, b) => a + b, 0) / rates.length
                : 0;

            const { crag, ascents, liked, project, ...rest } = r;
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
              ascent_count: ascents?.length ?? 0,
            } as RouteWithExtras;
          })
          .filter((r): r is RouteWithExtras => !!r);
      } catch (e) {
        console.error('[GlobalData] userProjectsResource exception', e);
        return [];
      }
    },
  });

  // ---- Pagination for Ascents Table ----
  readonly ascentsPage = signal(0);
  readonly ascentsSize = signal(10);
  readonly ascentsDateFilter = signal<string | null>(null);
  readonly ascentsQuery = signal<string | null>(null);
  readonly ascentsSort = signal<'date' | 'grade'>('date');

  onAscentsPagination({ page, size }: TuiTablePaginationEvent): void {
    this.ascentsPage.set(page);
    this.ascentsSize.set(size);
  }

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
            route:routes!inner (
              *,
              liked:route_likes(id),
              project:route_projects(id),
              crag:crags(
                slug,
                name,
                area_id,
                area:areas(slug, name)
              )
            )
          `,
            { count: 'exact' },
          )
          .eq('user_id', userId);

        if (queryText) {
          query = query.ilike('route.name', `%${queryText}%`);
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
          const allGradeIds = Object.keys(VERTICAL_LIFE_TO_LABEL)
            .map(Number)
            .sort((a, b) => a - b);
          const allowedGrades = allGradeIds.slice(minIdx, maxIdx + 1);
          query = query.in('route.grade', allowedGrades);
        }

        // Categories filter
        if (categories.length > 0) {
          const idxToKind: Record<number, string> = {
            0: ClimbingKinds.SPORT,
            1: ClimbingKinds.BOULDER,
            2: ClimbingKinds.MULTIPITCH,
          };
          const allowedKinds = categories
            .map((i) => idxToKind[i])
            .filter(Boolean);
          query = query.in('route.climbing_kind', allowedKinds);
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
          const { route, ...ascentRest } = a;
          let mappedRoute: RouteWithExtras | undefined = undefined;

          if (route) {
            const { crag, liked, project, ...routeRest } = route;
            mappedRoute = {
              ...routeRest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              area_id: crag?.area_id,
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
              id,
              name,
              slug,
              area:areas(id, name, slug)
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
          throw error;
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
          area_id: r.crag?.area?.id,
          area_name: r.crag?.area?.name,
          area_slug: r.crag?.area?.slug,
          rating,
          ascent_count: r.ascents?.length ?? 0,
          climbed: (r.own_ascent?.length ?? 0) > 0,
          own_ascent: r.own_ascent?.[0],
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
      routeId: this.routeDetailResource.value()?.id,
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

        // 1. Fetch ascents for the route with count
        const {
          data: ascents,
          error: ascentsError,
          count,
        } = await this.supabase.client
          .from('route_ascents')
          .select('*', { count: 'exact' })
          .eq('route_id', routeId)
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
            .select('*')
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
        const currentRoute = this.routeDetailResource.value();
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
      map(() => true),
      startWith(false),
    ),
  );

  constructor() {
    effect(() => {
      if (this.langUpdateTrigger()) {
        this.i18nTick.update((v) => v + 1);
      }
    });

    // Hydrate last map bounds from storage on a browser
    try {
      const rawEditingMode = this.localStorage.getItem(
        this.editingModeStorageKey,
      );
      if (rawEditingMode) {
        this.editingMode.set(rawEditingMode === 'true');
      }

      const rawBounds = this.localStorage.getItem(this.mapBoundsStorageKey);
      if (rawBounds) {
        const parsed = JSON.parse(rawBounds) as MapBounds;
        this.mapBounds.set(parsed);
      }

      const rawGradeRange = this.localStorage.getItem(
        this.areaListGradeRangeKey,
      );
      if (rawGradeRange) {
        const parsed = JSON.parse(rawGradeRange);
        if (Array.isArray(parsed) && parsed.length === 2) {
          const [a, b] = parsed;
          const clamp = (v: number) =>
            Math.max(
              0,
              Math.min(ORDERED_GRADE_VALUES.length - 1, Math.round(v)),
            );
          this.areaListGradeRange.set([clamp(a), clamp(b)]);
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
    } catch {
      // ignore corrupted viewport state
    }

    // Persist editing mode changes
    effect(() => {
      this.localStorage.setItem(
        this.editingModeStorageKey,
        String(this.editingMode()),
      );
    });

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

    // Persist filters
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
      const selectedLanguage = this.selectedLanguage();
      if (selectedLanguage) {
        this.translate.use(selectedLanguage);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.browserNotifications.bindUserGesture();

      if (Notification.permission === 'default') {
        const requestPermission = () => {
          void this.browserNotifications.requestPermission();
          window.removeEventListener('click', requestPermission);
        };
        window.addEventListener('click', requestPermission);
      } else {
        void this.browserNotifications.requestPermission();
      }
    }

    // Refresh unread counts when user changes and setup Realtime
    effect((onCleanup) => {
      const userId = this.supabase.authUserId();
      if (userId) {
        void this.notificationsService.refreshUnreadCount();
        void this.messagingService.refreshUnreadCount();

        const nSub = this.notificationsService.watchNotifications((notif) => {
          console.log('[GlobalData] Notification received:', notif);
          void this.notificationsService.refreshUnreadCount();

          // Browser notification for general notifications
          if (notif.actor_id) {
            void this.userProfilesService
              .getUserProfile(notif.actor_id)
              .then((actor) => {
                const title = actor?.name || 'Topo';
                let body = '';
                switch (notif.type) {
                  case 'like':
                    body = this.translate.instant('notifications.likedAscent');
                    break;
                  case 'comment':
                    body = this.translate.instant(
                      'notifications.commentedAscent',
                    );
                    break;
                }
                if (body) {
                  console.log(
                    '[GlobalData] Showing browser notification:',
                    title,
                    body,
                  );
                  this.browserNotifications.show(title, { body });
                  if (typeof document !== 'undefined' && document.hidden) {
                    this.browserNotifications.playSound();
                    this.browserNotifications.flashTitle(title);
                  }
                } else {
                  console.warn(
                    '[GlobalData] Unknown notification type or missing body:',
                    notif.type,
                  );
                }
              });
          }
        });

        const mSub = this.messagingService.watchUnreadCount((msg) => {
          console.log('[GlobalData] Message received:', msg);
          void this.messagingService.refreshUnreadCount();

          // Only show if not from me
          if (msg.sender_id !== userId) {
            void this.userProfilesService
              .getUserProfile(msg.sender_id!)
              .then((sender) => {
                const title = sender?.name || 'Chat';
                console.log(
                  '[GlobalData] Showing chat notification:',
                  title,
                  msg.text,
                );
                this.browserNotifications.show(title, {
                  body: msg.text,
                });
                if (typeof document !== 'undefined' && document.hidden) {
                  this.browserNotifications.playSound();
                  this.browserNotifications.flashTitle(title);
                }
              });
          }
        });

        onCleanup(() => {
          nSub?.unsubscribe();
          mSub?.unsubscribe();
        });
      }
    });
  }

  resetDataByPage(
    page: 'explore' | 'area-list' | 'area' | 'crag' | 'topo' | 'route' | 'home',
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
      case 'home': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        this.profileActiveTab.set(0);
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
