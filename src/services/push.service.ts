import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';

import { firstValueFrom } from 'rxjs';

import { Json } from '../models/supabase-generated';

import { reactToObservable } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { ENV_VAPID_PUBLIC_KEY } from '../environments/environment';

import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly isSubscribed = signal<boolean>(false);
  readonly isSupported = signal<boolean>(false);

  constructor() {
    if (this.isBrowser) {
      this.isSupported.set(this.swPush.isEnabled);
      this.checkSubscription();
    }
  }

  async enablePushNotifications(): Promise<void> {
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
    } catch (err: unknown) {
      console.error('[PushService] Could not enable notifications', err);
      throw err;
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const subscription = await firstValueFrom(this.swPush.subscription, {
        defaultValue: null,
      });
      if (subscription) {
        await this.deleteSubscription(subscription);
        await this.swPush.unsubscribe();
        this.isSubscribed.set(false);
      }
    } catch (err: unknown) {
      console.error('[PushService] Error unsubscribing', err);
      throw err;
    }
  }

  async getCurrentSubscription(): Promise<PushSubscription | null> {
    return firstValueFrom(this.swPush.subscription, { defaultValue: null });
  }

  private checkSubscription(): void {
    reactToObservable(this.swPush.subscription, (subscription) => {
      this.isSubscribed.set(!!subscription);
      if (subscription) {
        // Optionally sync if backend doesn't have it
        void this.saveSubscription(subscription);
      }
    });
  }

  async saveSubscription(subscription: PushSubscription): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) {
      console.warn(
        '[PushService] Skipping saveSubscription: No user ID available',
      );
      return;
    }

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
