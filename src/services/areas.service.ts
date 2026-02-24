import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type {
  AreaDto,
  AreaInsertDto,
  AreaListItem,
  AreaUpdateDto,
  EightAnuRoute,
  RouteInsertDto,
} from '../models';
import { ClimbingKinds, LABEL_TO_VERTICAL_LIFE } from '../models';

import { slugify } from '../utils';

import { AreaFormComponent } from '../forms/area-form';
import { AreaUnifyComponent } from '../forms/area-unify';
import { EightAnuService } from './eight-anu.service';
import { GlobalData } from './global-data';
import { LocalStorage } from './local-storage';
import { NotificationService } from './notification.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AreasService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly localStorage = inject(LocalStorage);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly eightAnuService = inject(EightAnuService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  openAreaForm(data?: {
    areaData?: { id: number; name: string; slug: string };
  }): void {
    const isEdit = !!data?.areaData;
    const oldSlug = data?.areaData?.slug;
    void firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(AreaFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'areas.editTitle' : 'areas.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.global.areasListResource.reload();
        // Also reload global area detail if we are on that page?
        // Since we might navigate, we rely on router/resource reload.
        // But if we are on area list, reloads list.

        if (
          isEdit &&
          oldSlug &&
          typeof result === 'string' &&
          result !== oldSlug
        ) {
          if (this.global.selectedAreaSlug() === oldSlug) {
            void this.router.navigate(['/area', result]);
          }
        }
      }
    });
  }

  openUnifyAreas(areas?: AreaDto[] | AreaListItem[]): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(AreaUnifyComponent),
        {
          label: this.translate.instant('areas.unifyTitle'),
          size: 'm',
          data: areas,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.global.areasListResource.reload();
      }
      return result;
    });
  }

  async create(
    payload: Omit<AreaInsertDto, 'created_at' | 'id'>,
  ): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] create error', error);
      throw error;
    }
    this.global.areasListResource.reload();
    this.toast.success('messages.toasts.areaCreated');
    return data as AreaDto;
  }

  async update(
    id: number,
    payload: Omit<AreaUpdateDto, 'id' | 'created_at'>,
  ): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] update error', error);
      throw error;
    }
    this.global.areasListResource.reload();
    this.toast.success('messages.toasts.areaUpdated');
    return data as AreaDto;
  }

  async getById(id: number): Promise<{ data: AreaDto | null; error: unknown }> {
    if (!isPlatformBrowser(this.platformId)) return { data: null, error: null };
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as AreaDto, error };
  }

  async getAllAreasSimple(): Promise<
    { id: number; name: string; slug: string }[]
  > {
    if (!isPlatformBrowser(this.platformId)) return [];

    const cacheKey = 'cached_areas_simple_v1';

    try {
      await this.supabase.whenReady();

      let allAreas: { id: number; name: string; slug: string }[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await this.supabase.client
          .from('areas')
          .select('id, name, slug')
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allAreas = [...allAreas, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      this.localStorage.setItem(cacheKey, JSON.stringify(allAreas));
      return allAreas;
    } catch (e) {
      console.warn(
        '[AreasService] getAllAreasSimple error/offline, trying cache',
        e,
      );
      const cached = this.localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
      return [];
    }
  }

  async unify(
    targetAreaId: number,
    sourceAreaIds: number[],
    newName: string,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client.rpc('unify_areas', {
        p_target_area_id: targetAreaId,
        p_source_area_ids: sourceAreaIds,
        p_new_name: newName,
      });

      if (error) throw error;

      this.global.areasListResource.reload();
      this.toast.success('messages.toasts.areasUnified');
      return true;
    } catch (e) {
      console.error('[AreasService] unify error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /** Delete an area by id (client-only). Returns true if deleted. */
  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('areas')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[AreasService] delete error', error);
      throw error;
    }
    // Update global area list
    this.global.areasListResource.update((value) => {
      if (!value) return value;
      return value.filter((item) => item.id !== id);
    });
    this.toast.success('messages.toasts.areaDeleted');
    return true;
  }

  /** Toggle like for an area using Supabase RPC toggle_area_like */
  async toggleAreaLike(areaId: number): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      if (!areaId) {
        throw new Error(
          `[AreasService] toggleAreaLike invalid areaId: ${String(areaId)}`,
        );
      }
      const params = { p_area_id: areaId } as const;
      const { data, error } = await this.supabase.client.rpc(
        'toggle_area_like',
        params,
      );
      if (error) throw error;
      const liked = data;
      // Update global area list
      this.global.areasListResource.update((value) => {
        if (!value) return value;
        return value
          .map((item) => (item.id === areaId ? { ...item, liked } : item))
          .sort((a, b) => {
            // First sort by liked status (liked items first)
            if (a.liked && !b.liked) return -1;
            if (!a.liked && b.liked) return 1;
            // Then sort by name
            return a.name.localeCompare(b.name);
          });
      });
      this.toast.success(
        liked
          ? 'messages.toasts.favoriteAdded'
          : 'messages.toasts.favoriteRemoved',
      );
      return liked;
    } catch (e) {
      console.error('[AreasService] toggleAreaLike error', e);
      throw e;
    }
  }

  async syncAreaWith8a(areaId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { data: area, error } = await this.getById(areaId);

    if (error || !area) {
      this.toast.error('Error fetching area');
      return;
    }

    if (!area.eight_anu_crag_slugs || area.eight_anu_crag_slugs.length === 0) {
      this.toast.info('No 8a.nu slugs configured for this area');
      return;
    }

    this.loading.set(true);
    let totalRoutes = 0;
    const loaderClose$ = this.toast.showLoader('import8a.syncing');

    try {
      // Pre-fetch all crags for this area to avoid duplicates
      const { data: areaCrags } = await this.supabase.client
        .from('crags')
        .select('id, name, slug, eight_anu_sector_slugs')
        .eq('area_id', areaId);

      const existingCragsList = areaCrags || [];

      for (const cragSlug of area.eight_anu_crag_slugs) {
        // Determine country
        let countrySlug = 'spain'; // Default
        try {
          const searchResult = await this.eightAnuService.searchCrag(
            area.name,
            cragSlug,
          );
          if (searchResult?.countrySlug) {
            countrySlug = searchResult.countrySlug;
          }
        } catch (e) {
          console.warn('Error searching crag for country, using spain', e);
        }

        // Fetch routes
        const [sportRoutes, boulderRoutes] = await Promise.all([
          this.eightAnuService.getAllRoutes(
            'sportclimbing',
            countrySlug,
            cragSlug,
          ),
          this.eightAnuService.getAllRoutes(
            'bouldering',
            countrySlug,
            cragSlug,
          ),
        ]);

        const allRoutes = [...sportRoutes, ...boulderRoutes];
        if (allRoutes.length === 0) {
          continue;
        }

        // Group by sector
        const routesBySector = new Map<string, EightAnuRoute[]>();
        for (const route of allRoutes) {
          const sectorSlug = route.sectorSlug || 'unknown-sector';
          if (!routesBySector.has(sectorSlug)) {
            routesBySector.set(sectorSlug, []);
          }
          routesBySector.get(sectorSlug)!.push(route);
        }

        // Process groups
        for (const [sectorSlug, routes] of routesBySector.entries()) {
          const sectorName = routes[0].sectorName || sectorSlug;

          // Find or create Crag (Sector)
          let match = existingCragsList.find((c) =>
            c.eight_anu_sector_slugs?.includes(sectorSlug),
          );

          if (!match) {
            // Try to find by slug match (if sector name matches existing crag name/slug)
            const targetSlug = slugify(sectorName);
            match = existingCragsList.find((c) => c.slug === targetSlug);
          }

          let cragId: number;

          if (match) {
            cragId = match.id;
            // Update 8a slugs if needed
            if (!match.eight_anu_sector_slugs?.includes(sectorSlug)) {
              const newSlugs = [
                ...(match.eight_anu_sector_slugs || []),
                sectorSlug,
              ];
              await this.supabase.client
                .from('crags')
                .update({ eight_anu_sector_slugs: newSlugs })
                .eq('id', cragId);

              // Update in-memory list
              match.eight_anu_sector_slugs = newSlugs;
            }
          } else {
            // Create new crag
            const { data: newCrag, error: createError } =
              await this.supabase.client
                .from('crags')
                .insert({
                  area_id: areaId,
                  name: sectorName,
                  slug: slugify(sectorName),
                  eight_anu_sector_slugs: [sectorSlug],
                })
                .select('id, name, slug, eight_anu_sector_slugs')
                .single();

            if (createError) {
              console.error('Error creating crag', sectorName, createError);
              continue;
            }
            cragId = newCrag.id;
            existingCragsList.push(newCrag);
          }

          // Optimization: Bulk upsert routes
          // Check global 8a slugs to avoid duplicates
          const sectorRouteSlugs = routes.map((r) => r.zlaggableSlug);
          const existingRoutes: {
            id: number;
            crag_id: number;
            slug: string;
            eight_anu_route_slugs: string[] | null;
          }[] = [];

          if (sectorRouteSlugs.length > 0) {
            const CHUNK_SIZE = 50;
            for (let i = 0; i < sectorRouteSlugs.length; i += CHUNK_SIZE) {
              const chunk = sectorRouteSlugs.slice(i, i + CHUNK_SIZE);
              const { data } = await this.supabase.client
                .from('routes')
                .select('id, crag_id, slug, eight_anu_route_slugs')
                .overlaps('eight_anu_route_slugs', chunk);

              if (data) existingRoutes.push(...data);
            }
          }
          const upsertPayloads: RouteInsertDto[] = [];

          for (const route of routes) {
            const gradeLabel = this.eightAnuService.normalizeDifficulty(
              route.difficulty,
            );
            const gradeId = LABEL_TO_VERTICAL_LIFE[gradeLabel] ?? 0;
            const climbingKind =
              route.category === 1
                ? ClimbingKinds.BOULDER
                : ClimbingKinds.SPORT;

            // Find matching existing route
            const match = existingRoutes.find(
              (r) =>
                r.eight_anu_route_slugs &&
                r.eight_anu_route_slugs.includes(route.zlaggableSlug),
            );

            if (match) {
              upsertPayloads.push({
                id: match.id,
                crag_id: cragId,
                slug: match.slug,
                name: route.zlaggableName,
                grade: gradeId,
                climbing_kind: climbingKind,
              });
            } else {
              upsertPayloads.push({
                crag_id: cragId,
                slug: slugify(route.zlaggableName),
                eight_anu_route_slugs: [route.zlaggableSlug],
                name: route.zlaggableName,
                grade: gradeId,
                climbing_kind: climbingKind,
              });
            }
          }

          if (upsertPayloads.length > 0) {
            // Process in chunks of 100
            const chunkSize = 100;
            for (let i = 0; i < upsertPayloads.length; i += chunkSize) {
              const chunk = upsertPayloads.slice(i, i + chunkSize);
              const { error: upsertError } = await this.supabase.client
                .from('routes')
                .upsert(chunk);

              if (upsertError) {
                console.error('Error upserting routes chunk', upsertError);
              } else {
                totalRoutes += chunk.length;
              }
            }
          }
        }
      }

      this.notification.success(
        this.translate.instant('import8a.syncSuccess', {
          count: `<strong>${totalRoutes}</strong>`,
        }) + '.',
        'import8a.syncSuccessTitle',
        false,
      );
    } catch (e) {
      console.error('Sync error', e);
      this.toast.error('Error syncing with 8a.nu');
    } finally {
      this.loading.set(false);
      loaderClose$.next();
      loaderClose$.complete();
    }
  }
}
