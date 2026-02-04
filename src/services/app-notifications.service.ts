import { inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import {
  NotificationInsertDto,
  NotificationWithActor,
  UserProfileDto,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AppNotificationsService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly unreadCount = signal(0);

  async getNotifications(): Promise<NotificationWithActor[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('notifications')
      .select('*, actor:user_profiles!notifications_actor_id_fkey(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[AppNotificationsService] getNotifications error', error);
      return [];
    }

    const typedData = data as unknown as (NotificationWithActor & {
      actor: UserProfileDto | UserProfileDto[];
      resource_id: number;
    })[];

    // Fetch related resource info (e.g. ascent route name)
    const notifications = typedData.map((d) => ({
      ...d,
      actor: Array.isArray(d.actor) ? d.actor[0] : d.actor,
    }));

    // Collect ascent IDs to fetch route names
    const ascentIds = notifications
      .filter(
        (n) => (n.type === 'like' || n.type === 'comment') && n.resource_id,
      )
      .map((n) => Number(n.resource_id));

    if (ascentIds.length > 0) {
      const { data: ascents } = await this.supabase.client
        .from('route_ascents')
        .select('id, routes(name)')
        .in('id', ascentIds);

      if (ascents) {
        const ascentMap = new Map(
          ascents.map((a) => [a.id, (a.routes as any)?.name]),
        );
        notifications.forEach((n) => {
          if ((n.type === 'like' || n.type === 'comment') && n.resource_id) {
            const routeName = ascentMap.get(Number(n.resource_id));
            if (routeName) {
              (n as any).resource_name = routeName;
            }
          }
        });
      }
    }

    return notifications;
  }

  async createNotification(payload: NotificationInsertDto): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    // Don't notify yourself
    if (payload.user_id === payload.actor_id) return;

    const { error } = await this.supabase.client
      .from('notifications')
      .insert(payload);

    if (error) {
      console.error(
        '[AppNotificationsService] createNotification error',
        error,
      );
    } else {
      // We could emit something here or rely on polling/realtime
    }
  }

  async markAsRead(id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[AppNotificationsService] markAsRead error', error);
    } else {
      this.refreshUnreadCount();
    }
  }

  async markAllAsRead(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('[AppNotificationsService] markAllAsRead error', error);
    } else {
      this.unreadCount.set(0);
    }
  }

  async refreshUnreadCount(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { count, error } = await this.supabase.client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (!error) {
      this.unreadCount.set(count ?? 0);
    }
  }

  watchNotifications(
    callback: (payload: NotificationInsertDto) => void,
  ): RealtimeChannel | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const userId = this.supabase.authUserId();
    if (!userId) return null;

    return this.supabase.client
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as NotificationInsertDto);
        },
      )
      .subscribe();
  }
}
