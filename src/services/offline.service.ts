import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';

/**
 * OfflineService: SSR-safe online/offline status as a Signal.
 * Uses navigator.onLine when available and listens to window online/offline events.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate);
  private readonly isBrowser =
    isPlatformBrowser(this.platformId) &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined';

  private readonly onlineSig: WritableSignal<boolean> = signal(true);
  private readonly updateAvailableSig = signal(false);

  readonly isOnline: Signal<boolean> = this.onlineSig.asReadonly();
  readonly isUpdateAvailable = this.updateAvailableSig.asReadonly();

  constructor() {
    if (this.isBrowser) {
      // Initial value from navigator
      try {
        this.onlineSig.set(navigator.onLine);
      } catch {
        // fallback to true
        this.onlineSig.set(true);
      }
      // Listen to online/offline events
      window.addEventListener('online', () => this.onlineSig.set(true));
      window.addEventListener('offline', () => this.onlineSig.set(false));

      // Service Worker updates
      if (this.swUpdate.isEnabled) {
        this.swUpdate.versionUpdates
          .pipe(
            filter((evt) => evt.type === 'VERSION_READY'),
            map(() => true),
          )
          .subscribe(() => this.updateAvailableSig.set(true));
      }
    }
  }

  async applyUpdate() {
    if (this.updateAvailableSig()) {
      await this.swUpdate.activateUpdate();
      if (this.isBrowser) {
        window.location.reload();
      }
    }
  }
}
