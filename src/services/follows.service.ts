import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class FollowsService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);

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

    this.toast.success('messages.toasts.userUnfollowed');
    return true;
  }
  async getFollowing(userId: string): Promise<any[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const { data: follows, error: followsError } = await this.supabase.client
      .from('user_follows')
      .select('followed_user_id')
      .eq('user_id', userId);

    if (followsError || !follows || follows.length === 0) {
      if (followsError)
        console.error(
          '[FollowsService] getFollowing follows error',
          followsError,
        );
      return [];
    }

    const followedIds = follows.map((f: any) => f.followed_user_id);
    const { data: profiles, error: profilesError } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .in('id', followedIds);

    if (profilesError) {
      console.error(
        '[FollowsService] getFollowing profiles error',
        profilesError,
      );
      return [];
    }

    return profiles || [];
  }

  async getFollowers(userId: string): Promise<any[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const { data: follows, error: followsError } = await this.supabase.client
      .from('user_follows')
      .select('user_id')
      .eq('followed_user_id', userId);

    if (followsError || !follows || follows.length === 0) {
      if (followsError)
        console.error(
          '[FollowsService] getFollowers follows error',
          followsError,
        );
      return [];
    }

    const followerIds = follows.map((f: any) => f.user_id);
    const { data: profiles, error: profilesError } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .in('id', followerIds);

    if (profilesError) {
      console.error(
        '[FollowsService] getFollowers profiles error',
        profilesError,
      );
      return [];
    }

    return profiles || [];
  }
}
