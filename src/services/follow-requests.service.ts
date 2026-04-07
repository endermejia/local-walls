import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { PopulatedFollowRequestDto } from '../models';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class FollowRequestsService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);

  readonly requestsChange = signal<number>(0);

  private notifyChange() {
    this.requestsChange.update((v) => v + 1);
  }

  async requestFollow(followedUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.supabase.client
      .from('follow_requests')
      .insert({
        follower_id: userId,
        followed_id: followedUserId,
      });

    if (error) {
      console.error('[FollowRequestsService] requestFollow error', error);
      this.toast.error('messages.errorFollowRequest');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.followRequestSent');
    return true;
  }

  async cancelRequest(followedUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.supabase.client
      .from('follow_requests')
      .delete()
      .eq('follower_id', userId)
      .eq('followed_id', followedUserId);

    if (error) {
      console.error('[FollowRequestsService] cancelRequest error', error);
      this.toast.error('messages.errorCancelRequest');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.followRequestCanceled');
    return true;
  }

  async acceptRequestByFollower(followerId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    // First find the request id
    const { data } = await this.supabase.client
      .from('follow_requests')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!data?.id) return false;
    return this.acceptRequest(data.id);
  }

  async acceptRequest(requestId: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    const { error } = await this.supabase.client.rpc('accept_follow_request', {
      p_request_id: requestId,
    });

    if (error) {
      console.error('[FollowRequestsService] acceptRequest error', error);
      this.toast.error('messages.errorAcceptRequest');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.followRequestAccepted');
    return true;
  }

  async rejectRequest(requestId: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    const { error } = await this.supabase.client.rpc('reject_follow_request', {
      p_request_id: requestId,
    });

    if (error) {
      console.error('[FollowRequestsService] rejectRequest error', error);
      this.toast.error('messages.errorRejectRequest');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.followRequestRejected');
    return true;
  }

  async getPendingOutgoingRequestIds(): Promise<string[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('follow_requests')
      .select('followed_id')
      .eq('follower_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error(
        '[FollowRequestsService] getPendingOutgoingRequestIds error',
        error,
      );
      return [];
    }

    return (data || []).map((row) => row.followed_id);
  }

  async getPendingIncomingRequestIds(): Promise<string[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('follow_requests')
      .select('follower_id')
      .eq('followed_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error(
        '[FollowRequestsService] getPendingIncomingRequestIds error',
        error,
      );
      return [];
    }

    return (data || []).map((row) => row.follower_id);
  }

  async getIncomingRequestsCount(): Promise<number> {
    if (!isPlatformBrowser(this.platformId)) return 0;
    const userId = this.supabase.authUserId();
    if (!userId) return 0;

    const { count, error } = await this.supabase.client
      .from('follow_requests')
      .select('id', { count: 'exact', head: true })
      .eq('followed_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error(
        '[FollowRequestsService] getIncomingRequestsCount error',
        error,
      );
      return 0;
    }

    return count || 0;
  }

  async getIncomingRequestsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ items: PopulatedFollowRequestDto[]; total: number }> {
    if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };
    const userId = this.supabase.authUserId();
    if (!userId) return { items: [], total: 0 };

    const { data, error, count } = await this.supabase.client
      .from('follow_requests')
      .select('*, follower:follower_id(*)', { count: 'exact' })
      .eq('followed_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(
        '[FollowRequestsService] getIncomingRequestsPaginated error',
        error,
      );
      return { items: [], total: 0 };
    }

    return {
      items: (data as unknown as PopulatedFollowRequestDto[]) || [],
      total: count || 0,
    };
  }
}
