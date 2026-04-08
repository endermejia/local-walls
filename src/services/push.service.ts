import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { ENV_VAPID_PUBLIC_KEY } from '../environments/environment';
import { SupabaseService } from './supabase.service';
import { Json } from '../models/supabase-generated';

@Injectable({
  providedIn: 'root',
})
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isSubscribed = signal<boolean>(false);
  readonly isSupported = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isSupported.set(this.swPush.isEnabled);
      this.checkSubscription();
    }
  }

  async subscribe(): Promise<void> {
    if (!this.swPush.isEnabled) {
      console.warn('[PushService] Notifications are not enabled or supported');
      return;
    }

    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: ENV_VAPID_PUBLIC_KEY,
      });

      await this.saveSubscription(subscription);
      this.isSubscribed.set(true);
      console.log(
        '[PushService] Successfully subscribed to push notifications',
      );
    } catch (err: unknown) {
      console.error('[PushService] Could not subscribe to notifications', err);
      throw err;
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const subscription = await firstValueFrom(this.swPush.subscription);
      if (subscription) {
        await this.deleteSubscription(subscription);
        await this.swPush.unsubscribe();
        this.isSubscribed.set(false);
        console.log('[PushService] Successfully unsubscribed');
      }
    } catch (err: unknown) {
      console.error('[PushService] Error unsubscribing', err);
      throw err;
    }
  }

  private async checkSubscription(): Promise<void> {
    this.swPush.subscription.subscribe((subscription) => {
      this.isSubscribed.set(!!subscription);
      if (subscription) {
        // Optionally sync if backend doesn't have it
        void this.saveSubscription(subscription);
      }
    });
  }

  private async saveSubscription(
    subscription: PushSubscription,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          subscription: subscription.toJSON() as NonNullable<Json>,
        },
        { onConflict: 'user_id, subscription' },
      );

    if (error) {
      console.error(
        '[PushService] Error saving subscription to Supabase',
        error,
      );
    }
  }

  private async deleteSubscription(
    subscription: PushSubscription,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('subscription', subscription.toJSON() as NonNullable<Json>);

    if (error) {
      console.error(
        '[PushService] Error deleting subscription from Supabase',
        error,
      );
    }
  }
}
