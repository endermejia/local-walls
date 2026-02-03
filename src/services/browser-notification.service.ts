import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class BrowserNotificationService {
  private readonly platformId = inject(PLATFORM_ID);

  async requestPermission(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  show(title: string, options?: NotificationOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch (e) {
        console.error('[BrowserNotificationService] show error', e);
      }
    }
  }
}
