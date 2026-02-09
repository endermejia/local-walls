import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject, tap } from 'rxjs';

import {
  AscentDialogData,
  AscentType,
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentUpdateDto,
  RouteAscentWithExtras,
  RouteWithExtras,
  UserProfileDto,
  RouteAscentCommentDto,
  RouteAscentCommentInsertDto,
} from '../models';

import AscentFormComponent from '../forms/ascent-form';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { AppNotificationsService } from './app-notifications.service';
import { AscentCommentsDialogComponent } from '../dialogs/ascent-comments-dialog';

@Injectable({ providedIn: 'root' })
export class AscentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly notificationsService = inject(AppNotificationsService);

  readonly ascentInfo = computed<
    Record<
      AscentType | 'default',
      { icon: string; background: string; backgroundSubtle: string }
    >
  >(() => {
    const info: Record<
      AscentType | 'default',
      { icon: string; background: string; backgroundSubtle: string }
    > = {
      os: {
        icon: '@tui.eye',
        background: 'var(--tui-status-positive)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      f: {
        icon: '@tui.zap',
        background: 'var(--tui-status-warning)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      rp: {
        icon: '@tui.circle',
        background: 'var(--tui-status-negative)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      default: {
        icon: '@tui.circle',
        background: 'var(--tui-neutral-fill)',
        backgroundSubtle: 'transparent',
      },
    };
    return info;
  });

  async getAscentById(id: number): Promise<RouteAscentWithExtras | null> {
    if (!id || isNaN(id) || id <= 0) return null;
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .select(
        `
        *,
        route:routes(
          *,
          crag:crags(
            slug,
            name,
            area_id,
            area:areas(slug, name)
          )
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('[AscentsService] getAscentById error', error);
      return null;
    }

    const a = data;

    // Fetch user separately
    const { data: user } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .eq('id', a.user_id)
      .maybeSingle();

    let mappedRoute: RouteWithExtras | undefined = undefined;
    if (a.route) {
      const routeRaw = Array.isArray(a.route) ? a.route[0] : a.route;
      const routeData = routeRaw as unknown as Record<string, unknown>;
      const cragData = (
        Array.isArray(routeData['crag'])
          ? routeData['crag'][0]
          : routeData['crag']
      ) as Record<string, unknown> | undefined;
      const areaData = (
        Array.isArray(cragData?.['area'])
          ? cragData?.['area'][0]
          : cragData?.['area']
      ) as Record<string, unknown> | undefined;

      mappedRoute = {
        ...(routeData as unknown as RouteWithExtras),
        area_id: cragData?.['area_id'] as number,
        crag_slug: cragData?.['slug'] as string,
        crag_name: cragData?.['name'] as string,
        area_slug: areaData?.['slug'] as string,
        area_name: areaData?.['name'] as string,
      } as RouteWithExtras;
    }

    return {
      ...a,
      user: (user as UserProfileDto) || undefined,
      route: mappedRoute,
    } as RouteAscentWithExtras;
  }

  async uploadPhoto(ascentId: number, file: File): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const toBase64 = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

    try {
      const base64 = await toBase64(file);
      await this.supabase.whenReady();
      const { error } = await this.supabase.client.functions.invoke(
        'upload-route-ascent-photo',
        {
          body: {
            file_name: file.name,
            content_type: file.type,
            base64,
          },
          headers: {
            'ascent-id': ascentId.toString(),
          },
        },
      );

      if (error) throw error;

      this.toast.success('messages.toasts.ascentUpdated');
      this.refreshResources(ascentId);
    } catch (e) {
      console.error('[AscentsService] uploadPhoto error', e);
      throw e;
    }
  }

  async deletePhoto(ascentId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client.functions.invoke(
      'delete-route-ascent-photo',
      {
        headers: {
          'ascent-id': ascentId.toString(),
        },
      },
    );

    if (error) {
      console.error('[AscentsService] deletePhoto error', error);
      throw error;
    }

    this.refreshResources(ascentId);
  }

  openAscentForm(data: AscentDialogData): Observable<boolean> {
    return this.dialogs
      .open<boolean>(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant(
          data.ascentData ? 'ascent.edit' : 'ascent.new',
        ),
        size: 'm',
        data,
        dismissible: false,
      })
      .pipe(
        tap((res) => {
          if (res === null || res) {
            void this.refreshResources();
          }
        }),
      );
  }

  async create(
    payload: Omit<RouteAscentInsertDto, 'created_at' | 'id'>,
  ): Promise<RouteAscentDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AscentsService] create error', error);
      throw error;
    }
    this.refreshResources();
    this.toast.success('messages.toasts.ascentCreated');
    return data as RouteAscentDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<RouteAscentUpdateDto, 'id' | 'created_at'>>,
  ): Promise<RouteAscentDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AscentsService] update error', error);
      throw error;
    }
    this.refreshResources(id, payload as Partial<RouteAscentWithExtras>);
    this.toast.success('messages.toasts.ascentUpdated');
    return data as RouteAscentDto;
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();

    // 1. Delete photo from storage via Edge Function if exists
    // We do this BEFORE deleting the record so the function can verify ownership
    const { data: ascent } = await this.supabase.client
      .from('route_ascents')
      .select('photo_path')
      .eq('id', id)
      .maybeSingle();

    try {
      if (ascent?.photo_path) {
        await this.deletePhoto(id);
      }
    } catch (e) {
      console.warn(
        '[AscentsService] Could not delete photo during ascent deletion',
        e,
      );
    }

    const { error } = await this.supabase.client
      .from('route_ascents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AscentsService] delete error', error);
      throw error;
    }

    // Update resources by removing the ascent
    const removeFn = (
      data: { items: RouteAscentWithExtras[]; total: number } | undefined,
    ) => {
      if (!data) return { items: [], total: 0 };
      const newItems = data.items.filter((item) => item.id !== id);
      if (newItems.length === data.items.length) return data;
      return {
        items: newItems,
        total: Math.max(0, data.total - 1),
      };
    };
    this.global.userAscentsResource.update(removeFn);
    this.global.routeAscentsResource.update(removeFn);

    this.refreshResources();
    this.toast.success('messages.toasts.ascentDeleted');
    return true;
  }

  private readonly ascentLikesUpdate$ = new Subject<{
    ascentId: number;
    user_liked: boolean;
    likes_count: number;
  }>();

  private readonly ascentCommentsUpdate$ = new Subject<number>();

  get ascentLikesUpdate() {
    return this.ascentLikesUpdate$.asObservable();
  }

  get ascentCommentsUpdate() {
    return this.ascentCommentsUpdate$.asObservable();
  }

  async toggleLike(ascentId: number): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client.rpc(
      'toggle_route_ascent_like',
      {
        p_route_ascent_id: ascentId,
      },
    );
    if (error) {
      console.error('[AscentsService] toggleLike error', error);
      throw error;
    }

    if (data) {
      void this.triggerLikeNotification(ascentId);
    }

    return data;
  }

  private async triggerLikeNotification(ascentId: number) {
    const { data: ascent } = await this.supabase.client
      .from('route_ascents')
      .select('user_id')
      .eq('id', ascentId)
      .single();

    if (ascent) {
      await this.notificationsService.createNotification({
        user_id: ascent.user_id,
        actor_id: this.supabase.authUserId()!,
        type: 'like',
        resource_id: ascentId.toString(),
      });
    }
  }

  async getLikesInfo(ascentId: number): Promise<{
    likes_count: number;
    user_liked: boolean;
  }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { likes_count: 0, user_liked: false };
    }
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();

    const { error, count } = await this.supabase.client
      .from('route_ascent_likes')
      .select('id', { count: 'exact', head: true })
      .eq('route_ascent_id', ascentId);

    if (error) {
      console.error('[AscentsService] getLikesInfo count error', error);
      throw error;
    }

    let user_liked = false;
    if (userId) {
      const { data: likeData, error: likeError } = await this.supabase.client
        .from('route_ascent_likes')
        .select('id')
        .eq('route_ascent_id', ascentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (likeError) {
        console.error(
          '[AscentsService] getLikesInfo like status error',
          likeError,
        );
      }
      user_liked = !!likeData;
    }

    return {
      likes_count: count ?? 0,
      user_liked,
    };
  }

  async getLikesPaginated(
    ascentId: number,
    page = 0,
    pageSize = 20,
    query = '',
  ): Promise<{ items: UserProfileDto[]; total: number }> {
    if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };
    await this.supabase.whenReady();

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const likesQuery = this.supabase.client
      .from('route_ascent_likes')
      .select('user_id', { count: 'exact' })
      .eq('route_ascent_id', ascentId)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: likesData, error: likesError, count } = await likesQuery;

    if (likesError) {
      console.error('[AscentsService] getLikesPaginated error', likesError);
      throw likesError;
    }

    if (!likesData || likesData.length === 0) {
      return { items: [], total: 0 };
    }

    const userIds = likesData.map((d) => d.user_id);
    let profilesQuery = this.supabase.client
      .from('user_profiles')
      .select('*')
      .in('id', userIds);

    if (query) {
      profilesQuery = profilesQuery.ilike('name', `%${query}%`);
    }

    const { data: profilesData, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error(
        '[AscentsService] getLikesPaginated profiles error',
        profilesError,
      );
      throw profilesError;
    }

    // Sort profiles back to match the order of likes (created_at desc)
    const profileMap = new Map(profilesData?.map((p) => [p.id, p]));
    const sortedProfiles = userIds
      .map((id) => profileMap.get(id))
      .filter((p): p is UserProfileDto => !!p);

    return {
      items: sortedProfiles,
      total: count || 0,
    };
  }

  async getCommentsCount(ascentId: number): Promise<number> {
    if (!isPlatformBrowser(this.platformId)) return 0;
    await this.supabase.whenReady();

    const { error, count } = await this.supabase.client
      .from('route_ascent_comments')
      .select('id', { count: 'exact', head: true })
      .eq('route_ascent_id', ascentId);

    if (error) {
      console.error('[AscentsService] getCommentsCount error', error);
      throw error;
    }

    return count ?? 0;
  }

  async getLastComment(
    ascentId: number,
  ): Promise<
    (RouteAscentCommentDto & { user_profiles: UserProfileDto }) | null
  > {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();

    const { data: comment, error: commentError } = await this.supabase.client
      .from('route_ascent_comments')
      .select('*')
      .eq('route_ascent_id', ascentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (commentError || !comment) {
      if (commentError)
        console.error('[AscentsService] getLastComment error', commentError);
      return null;
    }

    const { data: user, error: userError } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .eq('id', comment.user_id)
      .maybeSingle();

    if (userError || !user) {
      return null;
    }

    return {
      ...comment,
      user_profiles: user as UserProfileDto,
    };
  }

  async getComments(
    ascentId: number,
  ): Promise<(RouteAscentCommentDto & { user_profiles: UserProfileDto })[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const { data: commentsData, error: commentsError } =
      await this.supabase.client
        .from('route_ascent_comments')
        .select('*')
        .eq('route_ascent_id', ascentId)
        .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('[AscentsService] getComments error', commentsError);
      throw commentsError;
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const { data: profilesData, error: profilesError } =
      await this.supabase.client
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

    if (profilesError) {
      console.error(
        '[AscentsService] getComments profiles error',
        profilesError,
      );
      throw profilesError;
    }

    const profileMap = new Map(profilesData?.map((p) => [p.id, p]));

    return commentsData
      .map((comment) => ({
        ...comment,
        user_profiles: profileMap.get(comment.user_id)!,
      }))
      .filter((c) => !!c.user_profiles);
  }

  async addComment(
    ascentId: number,
    comment: string,
  ): Promise<RouteAscentCommentDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();

    const userId = this.supabase.authUserId();
    if (!userId) return null;

    const payload: RouteAscentCommentInsertDto = {
      route_ascent_id: ascentId,
      user_id: userId,
      comment,
    };

    const { data, error } = await this.supabase.client
      .from('route_ascent_comments')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[AscentsService] addComment error', error);
      throw error;
    }

    if (data) {
      void this.triggerCommentNotification(ascentId);
    }

    this.refreshComments(ascentId);

    return data;
  }

  private async triggerCommentNotification(ascentId: number) {
    const { data: ascent } = await this.supabase.client
      .from('route_ascents')
      .select('user_id')
      .eq('id', ascentId)
      .single();

    if (ascent) {
      await this.notificationsService.createNotification({
        user_id: ascent.user_id,
        actor_id: this.supabase.authUserId()!,
        type: 'comment',
        resource_id: ascentId.toString(),
      });
    }
  }

  async deleteComment(ascentId: number, commentId: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client
      .from('route_ascent_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('[AscentsService] deleteComment error', error);
      throw error;
    }

    this.refreshComments(ascentId);

    return true;
  }

  refreshComments(ascentId: number): void {
    this.ascentCommentsUpdate$.next(ascentId);
  }

  openCommentsDialog(ascentId: number): Observable<void> {
    return this.dialogs.open<void>(
      new PolymorpheusComponent(AscentCommentsDialogComponent),
      {
        data: { ascentId },
        label: this.translate.instant('labels.comments'),
        size: 'm',
      },
    );
  }

  refreshResources(
    ascentId?: number,
    changes?: Partial<RouteAscentWithExtras>,
  ): void {
    if (ascentId && changes) {
      if (
        changes.user_liked !== undefined &&
        changes.likes_count !== undefined
      ) {
        this.ascentLikesUpdate$.next({
          ascentId,
          user_liked: changes.user_liked,
          likes_count: changes.likes_count,
        });
      }

      const updateFn = (
        data: { items: RouteAscentWithExtras[]; total: number } | undefined,
      ) => {
        if (!data) return { items: [], total: 0 };
        return {
          ...data,
          items: data.items.map((item) =>
            item.id === ascentId ? { ...item, ...changes } : item,
          ),
        };
      };

      this.global.userAscentsResource.update(updateFn);
      this.global.routeAscentsResource.update(updateFn);
    } else {
      this.global.userAscentsResource.reload();
      this.global.routeAscentsResource.reload();
    }

    this.global.routeDetailResource.reload();
    this.global.cragRoutesResource.reload();
    this.global.topoDetailResource.reload();
    this.global.userProjectsResource.reload();
    this.global.userTotalAscentsCountResource.reload();
  }
}
