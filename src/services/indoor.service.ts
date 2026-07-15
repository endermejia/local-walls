import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { IndoorCenterFormComponent } from '../components/forms/indoor-center-form';
import IndoorRouteFormComponent from '../components/forms/indoor-route-form';
import TopoFormComponent from '../components/forms/topo-form';
import {
  IndoorCenterDto,
  IndoorVoucherDto,
  IndoorVoucherPurchaseDto,
  IndoorRouteDto,
  IndoorTopoDto,
  IndoorSaleDto,
  IndoorInventoryDto,
  IndoorRouteWithExtras,
  IndoorAscentDto,
  IndoorAscentInsertDto,
  IndoorAscentWithExtras,
  EquipperDto,
  IndoorTopoQueryRow,
  IndoorAscentQueryRow,
  IndoorTopoRouteWithRoute,
  IndoorTopoListItem,
} from '../models';
import type { TopoPath } from '../models/topo.model';
import { ToastService } from './toast.service';
import { handleErrorToast } from '../utils';

type CenterRouteQuery = IndoorRouteDto & {
  ascents: Pick<IndoorAscentDto, 'id' | 'type' | 'user_id' | 'rate'>[];
  equippers: { equipper: EquipperDto | null }[];
  topo_routes: { topo: Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> | null }[];
};

@Injectable({
  providedIn: 'root',
})
export class IndoorService {
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  private readonly platformId = inject(PLATFORM_ID);
  loading = signal(false);

  /** Signals to outdoor/indoor consumers that routes should be reloaded */
  reloadCenterRoutes(): void {
    this.global.indoorRoutesReloadTick.update((v) => v + 1);
  }

  async getAllCenters(): Promise<IndoorCenterDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as IndoorCenterDto[];
    } finally {
      this.loading.set(false);
    }
  }

  openIndoorCenterForm(data?: {
    centerData?: Partial<IndoorCenterDto>;
  }): Promise<boolean> {
    const isEdit = !!data?.centerData?.id;
    return firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(IndoorCenterFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'indoor.editTitle' : 'indoor.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.global.indoorCentersResource.reload();
        return true;
      }
      return false;
    });
  }

  async createCenter(
    payload: Omit<IndoorCenterDto, 'id' | 'created_at'>,
  ): Promise<IndoorCenterDto | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_centers')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorCenterDto;
  }

  async getCenterBySlug(slug: string): Promise<IndoorCenterDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as IndoorCenterDto | null;
    } finally {
      this.loading.set(false);
    }
  }

  async getCenterVouchers(centerId: string): Promise<IndoorVoucherDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_vouchers')
      .select('*')
      .eq('center_id', centerId)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  async getUserActiveVouchers(
    userId: string,
    centerId: string,
  ): Promise<IndoorVoucherPurchaseDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_voucher_purchases')
      .select('*, voucher:indoor_vouchers(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('indoor_vouchers.center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async getCenterRoutes(
    centerId: string,
    showLegacy = false,
  ): Promise<IndoorRouteWithExtras[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    let query = this.supabase.client
      .from('indoor_routes')
      .select(
        '*, equippers:indoor_route_equippers(equipper:equippers(*)), ascents:indoor_ascents(id, type, user_id, rate), topo_routes:indoor_topo_routes(topo:indoor_topos(id, name, legacy))',
      )
      .eq('center_id', centerId);

    if (!showLegacy) {
      query = query.or('legacy.eq.false,legacy.is.null');
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return [];

    const userId = this.global.userProfile()?.id;
    const routes = data as unknown as CenterRouteQuery[];
    return routes.map((route) => {
      const ratedAscents = route.ascents.filter(
        (ascent) => ascent.rate !== null && ascent.rate > 0,
      );
      const totalRating = ratedAscents.reduce(
        (sum, ascent) => sum + (ascent.rate || 0),
        0,
      );
      const rating =
        ratedAscents.length > 0 ? totalRating / ratedAscents.length : 0;

      return {
        ...route,
        equippers: route.equippers
          .map((entry) => entry.equipper)
          .filter((equipper): equipper is EquipperDto => equipper !== null),
        topos: route.topo_routes
          .map((entry) => entry.topo)
          .filter(
            (topo): topo is Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> =>
              topo !== null,
          ),
        own_ascent: userId
          ? (route.ascents.find((ascent) => ascent.user_id === userId) ?? null)
          : null,
        ascent_count: route.ascents.length,
        rating: rating || null,
      };
    }) as IndoorRouteWithExtras[];
  }

  async getCenterTopos(
    centerId: string,
    showLegacyTopos = false,
  ): Promise<IndoorTopoListItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    let query = this.supabase.client
      .from('indoor_topos')
      .select(
        '*, indoor_topo_routes ( route:indoor_routes ( id, grade, ascents:indoor_ascents(id, user_id) ) )',
      )
      .eq('center_id', centerId);

    if (!showLegacyTopos) {
      query = query.or('legacy.eq.false,legacy.is.null');
    }

    const { data, error } = await query;
    if (error) throw error;

    const userId = this.global.userProfile()?.id;
    return (data || []).map((t) => {
      const row = t as unknown as IndoorTopoQueryRow;
      const grades: Record<number, number> = {};
      const topoRoutes = row.indoor_topo_routes || [];
      let ownAscentsCount = 0;
      for (const tr of topoRoutes) {
        const grade = tr.route?.grade;
        if (grade !== undefined && grade !== null) {
          grades[grade] = (grades[grade] || 0) + 1;
        }
        if (userId && tr.route?.ascents?.some((a) => a.user_id === userId)) {
          ownAscentsCount++;
        }
      }
      return {
        ...row,
        photo: row.image_url,
        grades,
        total_routes: topoRoutes.length,
        own_ascents_count: ownAscentsCount,
        slug: row.id,
        shade_afternoon: false,
        shade_change_hour: null,
        shade_morning: false,
      };
    });
  }

  async checkIn(purchaseId: string): Promise<boolean> {
    const { data: purchase, error: purchaseError } = await this.supabase.client
      .from('indoor_voucher_purchases')
      .select('remaining_sessions')
      .eq('id', purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    if (
      purchase.remaining_sessions !== null &&
      purchase.remaining_sessions <= 0
    ) {
      throw new Error('No sessions remaining');
    }

    const { error: usageError } = await this.supabase.client
      .from('indoor_voucher_usage')
      .insert({ purchase_id: purchaseId });

    if (usageError) throw usageError;

    if (purchase.remaining_sessions !== null) {
      const { error: updateError } = await this.supabase.client
        .from('indoor_voucher_purchases')
        .update({
          remaining_sessions: purchase.remaining_sessions - 1,
          status:
            purchase.remaining_sessions - 1 === 0 ? 'exhausted' : 'active',
        })
        .eq('id', purchaseId);

      if (updateError) throw updateError;
    }

    return true;
  }

  // Admin methods
  async updateCenter(
    centerId: string,
    updates: Partial<IndoorCenterDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_centers')
      .update(updates)
      .eq('id', centerId);

    if (error) throw error;
    return true;
  }

  async deleteCenter(centerId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_centers')
      .delete()
      .eq('id', centerId);

    if (error) throw error;
    this.global.indoorCentersResource.reload();
    return true;
  }

  async getSales(centerId: string): Promise<IndoorSaleDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_sales')
      .select('*')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInventory(centerId: string): Promise<IndoorInventoryDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_inventory')
      .select('*')
      .eq('center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async uploadAsset(centerId: string, file: File): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `centers/${centerId}/${fileName}`;

    const { data, error } = await this.supabase.client.storage
      .from('indoor-assets')
      .upload(filePath, file);

    if (error) throw error;
    return data.path;
  }

  // Indoor Routes management
  async createRoute(
    payload: Omit<IndoorRouteDto, 'id' | 'created_at'>,
  ): Promise<IndoorRouteDto | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorRouteDto;
  }

  async updateRoute(
    id: string,
    updates: Partial<IndoorRouteDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_routes')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteRoute(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.toast.success('messages.toasts.routeDeleted');
    return true;
  }

  // Indoor Topos management
  async createTopo(
    payload: Omit<IndoorTopoDto, 'id' | 'created_at'>,
  ): Promise<IndoorTopoDto | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_topos')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorTopoDto;
  }

  async updateTopo(
    id: string,
    updates: Partial<IndoorTopoDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_topos')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteTopo(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_topos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  openIndoorRouteForm(
    centerId: string,
    routeData?: IndoorRouteDto,
  ): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(IndoorRouteFormComponent),
        {
          label: this.translate.instant(routeData ? 'edit' : 'create'),
          size: 'm',
          data: { centerId, routeData },
          dismissible: false,
        },
      ),
      { defaultValue: false },
    );
  }

  async openIndoorTopoForm(
    centerId: string,
    topoData?: IndoorTopoDto,
  ): Promise<boolean> {
    let initialRoutes: IndoorRouteDto[] & { path?: TopoPath | null }[] = [];
    if (topoData) {
      try {
        await this.supabase.whenReady();
        const { data } = await this.supabase.client
          .from('indoor_topo_routes')
          .select(
            `
            *,
            route: indoor_routes!inner (*)
          `,
          )
          .eq('topo_id', topoData.id)
          .order('number', { ascending: true });

        if (data) {
          initialRoutes = data.map((tr: unknown) => {
            const row = tr as IndoorTopoRouteWithRoute;
            return { ...row.route, path: row.path } as IndoorRouteDto & {
              path?: TopoPath | null;
            };
          });
        }
      } catch (e) {
        console.error('[IndoorService] Error loading initial topo routes:', e);
      }
    }

    return firstValueFrom(
      this.dialogs.open<boolean>(new PolymorpheusComponent(TopoFormComponent), {
        label: this.translate.instant(
          topoData ? 'topos.editTitle' : 'topos.newTitle',
        ),
        size: 'l',
        data: {
          type: 'indoor',
          centerId,
          indoorTopoData: topoData,
          initialRoutes,
          initialRouteIds: initialRoutes.map((r) => r.id),
        },
        dismissible: false,
      }),
      { defaultValue: false },
    );
  }

  // Indoor Vouchers management
  async createVoucher(
    payload: Omit<IndoorVoucherDto, 'id' | 'created_at'>,
  ): Promise<IndoorVoucherDto | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_vouchers')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorVoucherDto;
  }

  async updateVoucher(
    id: string,
    updates: Partial<IndoorVoucherDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_vouchers')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteVoucher(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_vouchers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Equipper & Ascent methods for Indoor Routes
  async getRouteBySlug(
    centerSlug: string,
    routeSlug: string,
  ): Promise<IndoorRouteWithExtras | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .select('*, center:indoor_centers!inner(name, slug)')
      .eq('slug', routeSlug)
      .eq('center.slug', centerSlug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const route = data as IndoorRouteDto & {
      center?: { name: string; slug: string } | null;
    };
    const equippers = await this.getRouteEquippers(route.id);
    return {
      ...route,
      center_name: route.center?.name,
      center_slug: route.center?.slug,
      equippers,
    } as IndoorRouteWithExtras;
  }

  async getRouteEquippers(routeId: string): Promise<EquipperDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_route_equippers')
      .select('equipper:equippers(*)')
      .eq('route_id', routeId);
    if (error) throw error;
    return (data ?? [])
      .map((item) => item.equipper)
      .filter((equipper): equipper is EquipperDto => equipper !== null);
  }

  async setRouteEquippers(
    routeId: string,
    equippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    try {
      const equipperIds: number[] = [];
      const stringEquippers = equippers
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim());

      const existingEquipperMap = new Map<string, number>();

      if (stringEquippers.length > 0) {
        const orQuery = stringEquippers
          .map((name) => `name.ilike.${name.replace(/,/g, '\\,')}`)
          .join(',');

        const { data: existing, error: existingError } =
          await this.supabase.client
            .from('equippers')
            .select('id, name')
            .or(orQuery);

        if (existingError) throw existingError;

        if (existing) {
          for (const eq of existing) {
            existingEquipperMap.set(eq.name.toLowerCase(), eq.id);
          }
        }

        const toCreateNames = Array.from(
          new Set(
            stringEquippers.filter(
              (name) => !existingEquipperMap.has(name.toLowerCase()),
            ),
          ),
        );

        if (toCreateNames.length > 0) {
          const payloads = toCreateNames.map((name) => ({ name }));
          const { data: created, error: createError } =
            await this.supabase.client
              .from('equippers')
              .insert(payloads)
              .select('id, name');

          if (createError) throw createError;

          if (created) {
            for (const eq of created) {
              existingEquipperMap.set(eq.name.toLowerCase(), eq.id);
            }
          }
        }
      }

      for (const item of equippers) {
        if (typeof item === 'string') {
          const id = existingEquipperMap.get(item.trim().toLowerCase());
          if (id !== undefined) equipperIds.push(id);
        } else {
          equipperIds.push(Number(item.id));
        }
      }

      // Sync junction table
      await this.supabase.client
        .from('indoor_route_equippers')
        .delete()
        .eq('route_id', routeId);

      if (equipperIds.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('indoor_route_equippers')
          .insert(
            equipperIds.map((id) => ({ route_id: routeId, equipper_id: id })),
          );

        if (insertError) throw insertError;
      }
    } catch (e) {
      console.error('[IndoorService] setRouteEquippers error', e);
      throw e;
    }
  }

  async getRouteAscents(routeId: string): Promise<IndoorAscentWithExtras[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_ascents')
      .select(
        '*, route:indoor_routes(id, name, color, climbing_kind, grade, center:indoor_centers(id, name, slug)), user_profile:user_profiles(id, name, avatar)',
      )
      .eq('route_id', routeId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((ascent) => {
      const row = ascent as unknown as IndoorAscentQueryRow;
      return {
        ...row,
        route: row.route
          ? {
              ...row.route,
              center_slug: row.route.center?.slug,
              center_name: row.route.center?.name,
            }
          : undefined,
        user: row.user_profile,
      } as IndoorAscentWithExtras;
    });
  }

  async getCenterAscents(centerId: string): Promise<IndoorAscentWithExtras[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    // First, let's get all route IDs for this center
    const { data: routes, error: routesError } = await this.supabase.client
      .from('indoor_routes')
      .select('id')
      .eq('center_id', centerId);

    if (routesError) throw routesError;
    if (!routes || routes.length === 0) return [];

    const routeIds = routes.map((r) => r.id);

    // Then get all ascents for these route IDs
    const { data, error } = await this.supabase.client
      .from('indoor_ascents')
      .select(
        '*, route:indoor_routes(id, name, color, climbing_kind, grade, center:indoor_centers(id, name, slug)), user_profile:user_profiles(id, name, avatar)',
      )
      .in('route_id', routeIds)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((ascent) => {
      const row = ascent as unknown as IndoorAscentQueryRow;
      return {
        ...row,
        route: row.route
          ? {
              ...row.route,
              center_slug: row.route.center?.slug,
              center_name: row.route.center?.name,
            }
          : undefined,
        user: row.user_profile,
      } as IndoorAscentWithExtras;
    });
  }

  async createRouteAscent(payload: {
    route_id: string;
    user_id: string;
    attempts?: number | null;
    private_ascent?: boolean | null;
    rate?: number | null;
    recommended?: boolean | null;
    grade?: number | null;
    video_url?: string | null;
    photo_path?: string | null;
    type: string;
    date: string;
    notes?: string;
  }): Promise<IndoorAscentWithExtras> {
    const { data, error } = await this.supabase.client
      .from('indoor_ascents')
      .insert(payload)
      .select(
        '*, route:indoor_routes(id, name, color, climbing_kind, grade, center:indoor_centers(id, name, slug)), user_profile:user_profiles(id, name, avatar)',
      )
      .single();

    if (error) throw error;
    this.reloadCenterRoutes();
    this.toast.success('messages.toasts.ascentCreated');
    const row = data as unknown as IndoorAscentQueryRow;
    return {
      ...row,
      route: row.route
        ? {
            ...row.route,
            center_slug: row.route.center?.slug,
            center_name: row.route.center?.name,
          }
        : undefined,
      user: row.user_profile,
    } as IndoorAscentWithExtras;
  }

  async updateRouteAscent(
    id: string,
    updates: {
      type?: string;
      date?: string;
      notes?: string;
      attempts?: number | null;
      private_ascent?: boolean | null;
      rate?: number | null;
      recommended?: boolean | null;
      grade?: number | null;
      video_url?: string | null;
      photo_path?: string | null;
    },
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('indoor_ascents')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    this.reloadCenterRoutes();
    this.toast.success('messages.toasts.ascentUpdated');
  }

  async uploadAscentPhoto(userId: string, file: File): Promise<string | null> {
    await this.supabase.whenReady();
    const ext = file.name.split('.').pop();
    const fileName = `ascents/${userId}_${Date.now()}.${ext}`;
    const { error } = await this.supabase.client.storage
      .from('indoor-assets')
      .upload(fileName, file);

    if (error) {
      console.error('[IndoorService] error uploading photo:', error);
      throw error;
    }
    return fileName;
  }

  async deleteRouteAscent(ascentId: string): Promise<void> {
    const { data: ascent, error: fetchError } = await this.supabase.client
      .from('indoor_ascents')
      .select('*')
      .eq('id', ascentId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!ascent) return;

    const { error } = await this.supabase.client
      .from('indoor_ascents')
      .delete()
      .eq('id', ascentId);

    if (error) throw error;

    this.toast.showWithUndo('messages.toasts.ascentDeleted', () => {
      this.supabase.client
        .from('indoor_ascents')
        .insert(ascent as unknown as IndoorAscentInsertDto)
        .then(({ error: undoError }) => {
          if (undoError) {
            handleErrorToast(undoError, this.toast);
          } else {
            this.reloadCenterRoutes();
            this.global.routeDetailResource.reload();
            this.global.topoDetailResource.reload();
          }
        });
    });

    this.reloadCenterRoutes();
  }
}
