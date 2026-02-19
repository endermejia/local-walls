import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { RouteFormComponent } from '../forms/route-form';
import { RouteUnifyComponent } from '../forms/route-unify';

import { normalizeName } from '../utils';

import type {
  EquipperDto,
  RouteDto,
  RouteInsertDto,
  RouteUpdateDto,
  RouteWithExtras,
} from '../models';

import { GlobalData, SupabaseService, ToastService } from '../services';

export interface RouteSimple {
  id: number;
  name: string;
  crag_id: number;
  crag: { name: string; area_id: number } | null;
}

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  openRouteForm(data: {
    cragId?: number;
    routeData?: {
      id: number;
      crag_id: number;
      name: string;
      slug: string;
      grade: number;
      climbing_kind: string;
      height?: number | null;
    };
  }): void {
    const isEdit = !!data.routeData;
    const oldSlug = data.routeData?.slug;
    void firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(RouteFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'routes.editTitle' : 'routes.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.global.cragRoutesResource.reload();
        this.global.routeDetailResource.reload();

        if (
          isEdit &&
          oldSlug &&
          typeof result === 'string' &&
          result !== oldSlug
        ) {
          const areaSlug = this.global.selectedAreaSlug();
          const cragSlug = this.global.selectedCragSlug();
          if (
            areaSlug &&
            cragSlug &&
            this.global.selectedRouteSlug() === oldSlug
          ) {
            void this.router.navigate(['/area', areaSlug, cragSlug, result]);
          }
        }
      }
    });
  }

  openUnifyRoutes(routes?: RouteDto[]): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(RouteUnifyComponent),
        {
          label: this.translate.instant('routes.unifyTitle'),
          size: 'm',
          data: { candidates: routes },
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.global.cragRoutesResource.reload();
      }
      return result;
    });
  }

  async getRoutesAdmin(
    page: number,
    pageSize: number,
    query: string,
  ): Promise<{
    data: (RouteDto & { crag?: { name: string } })[];
    count: number;
  }> {
    if (!isPlatformBrowser(this.platformId)) return { data: [], count: 0 };
    await this.supabase.whenReady();

    let queryBuilder = this.supabase.client
      .from('routes')
      .select('*, crag:crags(name)', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await queryBuilder
      .range(from, to)
      .order('name');

    if (error) {
      console.error('[RoutesService] getRoutesAdmin error', error);
      return { data: [], count: 0 };
    }

    return {
      data: data as (RouteDto & { crag?: { name: string } })[],
      count: count || 0,
    };
  }

  async getRoutesByAreaSimple(areaId: number): Promise<RouteSimple[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    let allRoutes: RouteSimple[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select('id, name, crag_id, crag:crags!inner(name, area_id)')
        .eq('crag.area_id', areaId)
        .range(from, from + step - 1);

      if (error) {
        console.error('[RoutesService] getRoutesByAreaSimple error', error);
        break;
      }

      if (data && data.length > 0) {
        allRoutes = [...allRoutes, ...(data as unknown as RouteSimple[])];
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    return allRoutes;
  }

  async getAreasWithDuplicateRoutes(): Promise<
    { id: number; name: string; slug: string }[]
  > {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const areasWithDupes = new Map<
      number,
      { id: number; name: string; slug: string }
    >();
    const groups = new Map<string, number>(); // key: areaId-normalizedName, value: count

    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select('name, crag:crags!inner(area:areas!inner(id, name, slug))')
        .range(from, from + step - 1);

      if (error) {
        console.error(
          '[RoutesService] getAreasWithDuplicateRoutes error',
          error,
        );
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      for (const item of data) {
        const area = item.crag.area;
        const name = item.name || '';
        if (name.toUpperCase().trim() === 'N.N.') continue;

        const key = `${area.id}-${normalizeName(name)}`;
        const count = (groups.get(key) ?? 0) + 1;
        groups.set(key, count);

        if (count === 2) {
          areasWithDupes.set(area.id, area);
        }
      }

      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    }

    return Array.from(areasWithDupes.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async getAllDuplicateRoutesGroupedByArea(): Promise<
    {
      id: number;
      name: string;
      slug: string;
      duplicateGroups: RouteSimple[][];
    }[]
  > {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const areaMap = new Map<
      number,
      {
        id: number;
        name: string;
        slug: string;
        allRoutes: RouteSimple[];
      }
    >();

    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          'id, name, crag_id, crag:crags!inner(name, area_id, area:areas!inner(id, name, slug))',
        )
        .range(from, from + step - 1);

      if (error) {
        console.error(
          '[RoutesService] getAllDuplicateRoutesGroupedByArea error',
          error,
        );
        break;
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const area = item.crag.area;
        if (!areaMap.has(area.id)) {
          areaMap.set(area.id, { ...area, allRoutes: [] });
        }
        areaMap.get(area.id)!.allRoutes.push({
          id: item.id,
          name: item.name,
          crag_id: item.crag_id,
          crag: { name: item.crag.name, area_id: area.id },
        });
      }

      if (data.length < step) hasMore = false;
      else from += step;
    }

    const result: {
      id: number;
      name: string;
      slug: string;
      duplicateGroups: RouteSimple[][];
    }[] = [];

    for (const areaData of areaMap.values()) {
      const groups = new Map<string, RouteSimple[]>();
      for (const route of areaData.allRoutes) {
        if ((route.name || '').toUpperCase().trim() === 'N.N.') continue;
        const key = normalizeName(route.name);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(route);
      }

      const duplicateGroups = Array.from(groups.values()).filter(
        (g) => g.length > 1,
      );
      if (duplicateGroups.length > 0) {
        result.push({
          id: areaData.id,
          name: areaData.name,
          slug: areaData.slug,
          duplicateGroups,
        });
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async unify(
    targetRouteId: number,
    sourceRouteIds: number[],
    newName: string,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client.rpc('unify_routes', {
        p_target_route_id: targetRouteId,
        p_source_route_ids: sourceRouteIds,
        p_new_name: newName,
      });

      if (error) throw error;

      this.global.cragRoutesResource.reload();
      this.toast.success('messages.toasts.routesUnified');
      return true;
    } catch (e) {
      console.error('[RoutesService] unify error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getRouteEquippers(routeId: number): Promise<EquipperDto[]> {
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_equippers')
      .select('equipper:equippers(*)')
      .eq('route_id', routeId);
    if (error) {
      console.error('[RoutesService] getRouteEquippers error', error);
      return [];
    }
    return (data || []).map((d) => {
      const item = d as unknown as { equipper: EquipperDto };
      return item.equipper;
    });
  }

  async setRouteEquippers(
    routeId: number,
    equippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    try {
      // 1. Get or create all equippers to get their IDs
      const equipperIds: number[] = [];

      for (const item of equippers) {
        if (typeof item === 'string') {
          // Check if it already exists by name (case insensitive)
          const { data: existing } = await this.supabase.client
            .from('equippers')
            .select('id')
            .ilike('name', item.trim())
            .maybeSingle();

          if (existing) {
            equipperIds.push(existing.id);
          } else {
            // Create new
            const { data: created, error: createError } =
              await this.supabase.client
                .from('equippers')
                .insert({ name: item.trim() })
                .select('id')
                .single();

            if (createError) throw createError;
            if (created) equipperIds.push(created.id);
          }
        } else {
          equipperIds.push(item.id);
        }
      }

      // 2. Sync junction table
      // Remove all first (simplest approach)
      await this.supabase.client
        .from('route_equippers')
        .delete()
        .eq('route_id', routeId);

      // Insert new ones
      if (equipperIds.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('route_equippers')
          .insert(
            equipperIds.map((id) => ({ route_id: routeId, equipper_id: id })),
          );

        if (insertError) throw insertError;
      }
    } catch (e) {
      console.error('[RoutesService] setRouteEquippers error', e);
      throw e;
    }
  }

  async create(
    payload: Omit<RouteInsertDto, 'created_at' | 'id'>,
  ): Promise<RouteDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[RoutesService] create error', error);
      throw error;
    }
    // Refresh routes list for the current crag and current route
    this.global.cragRoutesResource.reload();
    this.global.routeDetailResource.reload();
    this.toast.success('messages.toasts.routeCreated');
    return data as RouteDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<RouteUpdateDto, 'id' | 'created_at'>>,
  ): Promise<RouteDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[RoutesService] update error', error);
      throw error;
    }
    this.global.cragRoutesResource.reload();
    this.global.routeDetailResource.reload();
    this.toast.success('messages.toasts.routeUpdated');
    return data as RouteDto;
  }

  async getById(
    id: number,
  ): Promise<{ data: RouteDto | null; error: unknown }> {
    if (!isPlatformBrowser(this.platformId)) return { data: null, error: null };
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as RouteDto, error };
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('routes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[RoutesService] delete error', error);
      throw error;
    }
    this.global.cragRoutesResource.reload();
    this.global.routeDetailResource.reload();
    this.toast.success('messages.toasts.routeDeleted');
    return true;
  }

  async toggleRouteLike(
    routeId: number,
    currentRoute?: RouteWithExtras,
  ): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'toggle_route_like',
        {
          p_route_id: routeId,
        },
      );
      if (error) throw error;

      const isLiked = data as boolean;

      this.toast.success(
        isLiked
          ? 'messages.toasts.favoriteAdded'
          : 'messages.toasts.favoriteRemoved',
      );

      this.syncResources(routeId, { liked: isLiked }, currentRoute);

      return isLiked;
    } catch (e) {
      console.error('[RoutesService] toggleRouteLike error', e);
      throw e;
    }
  }

  async removeRouteProject(routeId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('route_projects')
        .delete()
        .match({
          user_id: this.supabase.authUserId(),
          route_id: routeId,
        });

      if (error) throw error;

      this.toast.success('messages.toasts.projectRemoved');
      this.syncResources(routeId, { project: false });
    } catch (e) {
      console.error('[RoutesService] removeRouteProject error', e);
    }
  }

  async toggleRouteProject(
    routeId: number,
    currentRoute?: Partial<RouteWithExtras>,
  ): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'toggle_route_project',
        {
          p_route_id: routeId,
        },
      );
      if (error) throw error;

      const isProject = data as boolean;

      this.toast.success(
        isProject
          ? 'messages.toasts.projectAdded'
          : 'messages.toasts.projectRemoved',
      );

      this.syncResources(routeId, { project: isProject }, currentRoute);

      return isProject;
    } catch (e) {
      console.error('[RoutesService] toggleRouteProject error', e);
      throw e;
    }
  }

  private syncResources(
    routeId: number,
    changes: Partial<RouteWithExtras>,
    currentRoute?: Partial<RouteWithExtras>,
  ): void {
    const updateFn = (routes: RouteWithExtras[] | undefined) =>
      (routes ?? []).map((route) =>
        route.id === routeId ? { ...route, ...changes } : route,
      );

    // 1. Update cragRoutesResource
    this.global.cragRoutesResource.update(updateFn);

    // 2. Update userProjectsResource
    if (changes.project !== undefined) {
      const isProject = changes.project;
      this.global.userProjectsResource.update((current) => {
        if (isProject) {
          const exists = (current ?? []).find((route) => route.id === routeId);
          if (exists) return updateFn(current);
          if (currentRoute && 'liked' in currentRoute) {
            return [
              ...(current ?? []),
              {
                ...(currentRoute as RouteWithExtras),
                project: true,
              },
            ];
          }
          // If we don't have currentRoute, we might need to reload or just update if it existed.
          // For now, if it doesn't exist and we don't have the object, we can't add it optimistically with all data.
          // But in most cases where we toggle, we are in a context where we have the route data.
          return current;
        } else {
          return (current ?? []).filter((route) => route.id !== routeId);
        }
      });
    } else {
      this.global.userProjectsResource.update(updateFn);
    }

    // 3. Update routeDetailResource
    this.global.routeDetailResource.update((r) =>
      r?.id === routeId ? { ...r, ...changes } : r,
    );

    // 4. Update topoDetailResource
    this.global.topoDetailResource.update((current) => {
      if (!current) return current;
      return {
        ...current,
        topo_routes: current.topo_routes.map((tr) =>
          tr.route_id === routeId
            ? { ...tr, route: { ...tr.route, ...changes } }
            : tr,
        ),
      };
    });
  }
}
