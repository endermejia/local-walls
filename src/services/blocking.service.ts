import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class BlockingService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);

  readonly blockChange = signal<number>(0);

  private notifyChange() {
    this.blockChange.update((v) => v + 1);
  }

  async isBlocked(targetUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { data, error } = await this.supabase.client
      .from('user_blocks' as any)
      .select('id')
      .eq('blocker_id', userId)
      .eq('blocked_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('[BlockingService] isBlocked error', error);
      return false;
    }

    return !!data;
  }

  async block(targetUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.supabase.client
      .from('user_blocks' as any)
      .insert({
        blocker_id: userId,
        blocked_id: targetUserId,
      });

    if (error) {
      console.error('[BlockingService] block error', error);
      this.toast.error('messages.errorBlock');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.userBlocked');
    return true;
  }

  async unblock(targetUserId: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.supabase.client
      .from('user_blocks' as any)
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', targetUserId);

    if (error) {
      console.error('[BlockingService] unblock error', error);
      this.toast.error('messages.errorUnblock');
      return false;
    }

    this.notifyChange();
    this.toast.success('messages.toasts.userUnblocked');
    return true;
  }
}
