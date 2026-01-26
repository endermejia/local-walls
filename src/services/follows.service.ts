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

  async isFollowing(followedUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { data, error } = await this.supabase.client
      .from('user_follows')
      .select('id')
      .eq('user_id', userId)
      .eq('followed_user_id', followedUserId)
      .maybeSingle();

    if (error) {
      console.error('[FollowsService] isFollowing error', error);
      return false;
    }

    return !!data;
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

    const { data, error } = await this.supabase.client
      .from('user_follows')
      .select('followed_user_id')
      .eq('user_id', userId);

    if (error) {
      console.error('[FollowsService] getFollowedIds error', error);
      return [];
    }

    return data?.map((f) => f.followed_user_id) || [];
  }

  async getFollowersPaginated(
    userId: string,
    page: number,
    pageSize: number,
    query?: string,
  ): Promise<{ items: UserProfileDto[]; total: number }> {
    if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };

    // 1. Get all follower IDs (no pagination here to allow filtering by name in next step)
    const { data: follows, error: followsError } = await this.supabase.client
      .from('user_follows')
      .select('user_id')
      .eq('followed_user_id', userId);

    if (followsError || !follows || follows.length === 0) {
      if (followsError)
        console.error(
          '[FollowsService] getFollowersPaginated IDs error',
          followsError,
        );
      return { items: [], total: 0 };
    }

    const followerIds = follows.map((f) => f.user_id);

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
    const { data: follows, error: followsError } = await this.supabase.client
      .from('user_follows')
      .select('followed_user_id')
      .eq('user_id', userId);

    if (followsError || !follows || follows.length === 0) {
      if (followsError)
        console.error(
          '[FollowsService] getFollowingPaginated IDs error',
          followsError,
        );
      return { items: [], total: 0 };
    }

    const followedIds = follows.map((f) => f.followed_user_id);

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
