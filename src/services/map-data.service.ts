import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import {
  AmountByEveryGrade,
  ClimbingKinds,
  MapAreaItem,
  MapBounds,
  MapCragItem,
  MapIndoorCenterItem,
  MapIndoorCenterRaw,
  MapIndoorRouteRaw,
  MapIndoorTopoRaw,
  MapItem,
  MapResponse,
  ParkingDto,
  VERTICAL_LIFE_GRADES,
} from '../models';
import { SupabaseService } from './supabase.service';
import { LocalStorage } from './local-storage';

@Injectable({ providedIn: 'root' })
export class MapDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly localStorage = inject(LocalStorage);

  readonly mapActive: WritableSignal<boolean> = signal(false);
  mapBounds: WritableSignal<MapBounds | null> = signal(null);
  private readonly mapBoundsStorageKey = 'map_bounds_v1';

  selectedMapCragItem: WritableSignal<MapCragItem | null> = signal(null);
  selectedMapParkingItem: WritableSignal<ParkingDto | null> = signal(null);

  /** Resource for fetching map items based on bounds. */
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
      if (this.indoorFeatureEnabled) {
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
                slug: t.id,
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

  /** Items currently visible in the viewport defined by mapBounds. */
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

  /** Resource for fetching parkings in the map based on bounds. */
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
        return [];
      }

      return data as ParkingDto[];
    },
  });

  /** Resource for fetching areas in the map based on bounds. */
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
      } catch {
        return [];
      }
    },
  });

  private indoorFeatureEnabled = false;

  setIndoorFeature(enabled: boolean): void {
    this.indoorFeatureEnabled = enabled;
  }

  hydrateMapBounds(): void {
    try {
      const rawBounds = this.localStorage.getItem(this.mapBoundsStorageKey);
      if (rawBounds) {
        this.mapBounds.set(JSON.parse(rawBounds));
      }
    } catch {
      // Silent fail
    }
  }

  persistMapBounds(): void {
    try {
      const bounds = this.mapBounds();
      if (bounds) {
        this.localStorage.setItem(
          this.mapBoundsStorageKey,
          JSON.stringify(bounds),
        );
      }
    } catch {
      // Silent fail
    }
  }
}
