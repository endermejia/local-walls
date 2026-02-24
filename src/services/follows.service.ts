import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { UserProfileDto } from '../models';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class FollowsService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);

  readonly followChange = signal<number>(0);

  private notifyChange() {
    this.followChange.update((v) => v + 1);
  }

  private async getAllIds(
    targetColumn: string,
    filterColumn: string,
    filterValue: string,
  ): Promise<string[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const allIds: string[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('user_follows')
        .select(targetColumn)
        .eq(filterColumn, filterValue)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('[FollowsService] getAllIds error', error);
        return [];
      }

      if (data && data.length > 0) {
        allIds.push(
          ...(data as unknown as Record<string, unknown>[]).map(
            (row) => row[targetColumn] as string,
          ),
        );
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
    return allIds;
  }

  async follow(followedUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.supabase.client.from('user_follows').insert({
      user_id: userId,
      followed_user_id: followedUserId,
    });

    if (error) {
      console.error('[FollowsService] follow error', error);
      this.toast.error('messages.errorFollow');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.userFollowed');
    return true;
  }

  async unfollow(followedUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.supabase.client
      .from('user_follows')
      .delete()
      .eq('user_id', userId)
      .eq('followed_user_id', followedUserId);

    if (error) {
      console.error('[FollowsService] unfollow error', error);
      this.toast.error('messages.errorUnfollow');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.userUnfollowed');
    return true;
  }

  async getFollowersCount(userId: string): Promise<number> {
    if (!isPlatformBrowser(this.platformId)) return 0;
    const { count, error } = await this.supabase.client
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_user_id', userId);

    if (error) {
      console.error('[FollowsService] getFollowersCount error', error);
      return 0;
    }
    return count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    if (!isPlatformBrowser(this.platformId)) return 0;
    const { count, error } = await this.supabase.client
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('[FollowsService] getFollowingCount error', error);
      return 0;
    }
    return count || 0;
  }

  async getFollowedIds(): Promise<string[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    return this.getAllIds('followed_user_id', 'user_id', userId);
  }

  async getFollowersPaginated(
    userId: string,
    page: number,
    pageSize: number,
    query?: string,
  ): Promise<{ items: UserProfileDto[]; total: number }> {
    if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };

    // 1. Get all follower IDs (no pagination here to allow filtering by name in next step)
    const followerIds = await this.getAllIds(
      'user_id',
      'followed_user_id',
      userId,
    );

    if (followerIds.length === 0) {
      return { items: [], total: 0 };
    }

    // 2. Fetch profiles with filtering and pagination
    let dbQuery = this.supabase.client
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .in('id', followerIds);

    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    const {
      data: items,
      error: profilesError,
      count: total,
    } = await dbQuery
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('name', { ascending: true });

    if (profilesError) {
      console.error(
        '[FollowsService] getFollowersPaginated profiles error',
        profilesError,
      );
      return { items: [], total: 0 };
    }

    return { items: (items as UserProfileDto[]) || [], total: total || 0 };
  }

  async getFollowingPaginated(
    userId: string,
    page: number,
    pageSize: number,
    query?: string,
  ): Promise<{ items: UserProfileDto[]; total: number }> {
    if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };

    // 1. Get all followed user IDs
    const followedIds = await this.getAllIds(
      'followed_user_id',
      'user_id',
      userId,
    );

    if (followedIds.length === 0) {
      return { items: [], total: 0 };
    }

    // 2. Fetch profiles with filtering and pagination
    let dbQuery = this.supabase.client
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .in('id', followedIds);

    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    const {
      data: items,
      error: profilesError,
      count: total,
    } = await dbQuery
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('name', { ascending: true });

    if (profilesError) {
      console.error(
        '[FollowsService] getFollowingPaginated profiles error',
        profilesError,
      );
      return { items: [], total: 0 };
    }

    return { items: (items as UserProfileDto[]) || [], total: total || 0 };
  }
}
